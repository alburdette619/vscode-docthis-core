import * as vs from "vscode";
import * as ts from "typescript";
import * as utils from "./utilities";

import { LanguageServiceHost } from "./languageServiceHost";
import { Range } from "vscode";

function includeTypes() {
    return vs.workspace.getConfiguration().get("docthiscore.includeTypes", true);
}

function inferTypes() {
    return vs.workspace.getConfiguration().get("docthiscore.inferTypesFromNames", false);
}

function enableHungarianNotationEvaluation() {
    return vs.workspace.getConfiguration().get("docthiscore.enableHungarianNotationEvaluation", false);
}

export class Documenter implements vs.Disposable {
    private _languageServiceHost: LanguageServiceHost;
    private _services: ts.LanguageService;

    private _outputChannel: vs.OutputChannel;

    constructor() {
        this._languageServiceHost = new LanguageServiceHost();

        this._services = ts.createLanguageService(
            this._languageServiceHost, ts.createDocumentRegistry());
    }

    documentThis(editor: vs.TextEditor, commandName: string, forCompletion: boolean) {
        const sourceFile = this._getSourceFile(editor.document);

        const selection = editor.selection;
        let caret = selection.start;

        // If the file is empty, ts errors on the getPositionOfLineAndCharacter function.
        // It seems having two empty lines and starting the comment snippet on the second
        // line seems to work just fine.
        if (!sourceFile.getText().length) {
            sourceFile.text = "\n///\n";
            caret = new vs.Position(1, 3);
        }

        const position = ts.getPositionOfLineAndCharacter(sourceFile, caret.line, caret.character);
        const node = utils.findChildForPosition(sourceFile, position);
        const firstParent = utils.findFirstParent(node);
        const documentNode = utils.nodeIsOfKind(node) ? node : firstParent;

        if (!documentNode) {
            this._showFailureMessage(commandName, "at the current position");
            return;
        }

        const sb = new utils.SnippetStringBuilder();

        const docLocation = this._documentNode(sb, documentNode, sourceFile);

        if (docLocation) {
            this._insertDocumentation(
                sb,
                docLocation,
                editor,
                forCompletion,
                documentNode.kind !== ts.SyntaxKind.SourceFile
            );
        } else {
            this._showFailureMessage(commandName, "at the current position");
        }
    }

    traceNode(editor: vs.TextEditor) {
        const selection = editor.selection;
        const caret = selection.start;

        const sourceFile = this._getSourceFile(editor.document);

        const position = ts.getPositionOfLineAndCharacter(sourceFile, caret.line, caret.character);
        const node = utils.findChildForPosition(sourceFile, position);

        const nodes: string[] = [];

        let parent = node;
        while (parent) {
            nodes.push(this._printNodeInfo(parent, sourceFile));
            parent = parent.parent;
        }

        const sb = new utils.StringBuilder();
        nodes.reverse().forEach((n, i) => {
            sb.appendLine(n);
        });

        if (!this._outputChannel) {
            this._outputChannel = vs.window.createOutputChannel("TypeScript Syntax Node Trace");
        }

        this._outputChannel.show();
        this._outputChannel.appendLine(sb.toString());
    }

    private _printNodeInfo(node: ts.Node, sourceFile: ts.SourceFile) {
        const sb = new utils.StringBuilder();
        sb.append(`${ node.getStart() } to ${ node.getEnd() } --- (${node.kind}) ${ (<any>ts).SyntaxKind[node.kind] }`);

        if (node.parent) {
            const nodeIndex = node.parent.getChildren().indexOf(node);

            if (nodeIndex !== -1) {
                sb.append(` - Index of parent: ${nodeIndex}`);
            }
        }

        sb.appendLine();

        const column = sourceFile.getLineAndCharacterOfPosition(node.getStart()).character;
        for (let i = 0; i < column; i++) {
            sb.append(" ");
        }

        sb.appendLine(node.getText());

        return sb.toString();
    }

    private _showFailureMessage(commandName: string, condition: string) {
        vs.window.showErrorMessage(`Sorry! '${commandName}' wasn't able to produce documentation ${condition}.`);
    }

    private _insertDocumentation(sb: utils.SnippetStringBuilder, location: ts.LineAndCharacter, editor: vs.TextEditor, forCompletion: boolean, hasParent: boolean) {
        const startPosition = new vs.Position(forCompletion ? location.line - 1 : location.line, location.character);
        const endPosition = new vs.Position(location.line, location.character);

        const range = new Range(startPosition, endPosition);

        editor.insertSnippet(sb.toCommentValue(hasParent), range);
    }

    private _getSourceFile(document: vs.TextDocument) {
        const fileText = document.getText();
        const canonicalFileName = utils.getDocumentFileName(document);
        this._languageServiceHost.updateCurrentFile(canonicalFileName, fileText);

        this._services.getSyntacticDiagnostics(canonicalFileName);

        const sourceFile = this._services.getProgram().getSourceFile(canonicalFileName);

        const newText = document.getText();
        sourceFile.update(newText, <ts.TextChangeRange>{
            newLength: newText.length,
            span: <ts.TextSpan>{
                start: 0,
                length: newText.length
            }
        });

        return sourceFile;
    }

    private _documentNode(sb: utils.SnippetStringBuilder, node: ts.Node, sourceFile: ts.SourceFile): ts.LineAndCharacter {switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                this._emitClassDeclaration(sb, <ts.ClassDeclaration>node);
                break;
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
                this._emitPropertyDeclaration(sb, <ts.AccessorDeclaration>node);
                break;
            // case ts.SyntaxKind.InterfaceDeclaration:
            //     this._emitInterfaceDeclaration(sb, <ts.InterfaceDeclaration>node);
            //     break;
            // case ts.SyntaxKind.EnumDeclaration:
            //     this._emitEnumDeclaration(sb, <ts.EnumDeclaration>node);
            //     break;
            case ts.SyntaxKind.EnumMember:
                sb.appendLine();
                break;
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
                this._emitMethodDeclaration(sb, <ts.MethodDeclaration>node);
                break;
            case ts.SyntaxKind.Constructor:
                this._emitConstructorDeclaration(sb, <ts.ConstructorDeclaration>node);
                break;
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return this._emitFunctionExpression(sb, <ts.FunctionExpression>node, sourceFile);
            case ts.SyntaxKind.VariableDeclaration:
                return this._emitVariableDeclaration(sb, <ts.VariableDeclaration>node, sourceFile);
            case ts.SyntaxKind.VariableDeclarationList:
            case ts.SyntaxKind.VariableStatement:
                return this._emitArrowFunction(sb, node, sourceFile);
            case ts.SyntaxKind.SourceFile:
                return this._emitSourceFile(sb, <ts.SourceFile>node);
            default:
                return;
        }

        return ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
    }

    private _emitDescriptionHeader(sb: utils.SnippetStringBuilder) {
        if (vs.workspace.getConfiguration().get("docthiscore.includeDescriptionTag", false)) {
            sb.append("@desc ");
            sb.appendSnippetTabstop();
            sb.appendLine();
        } else {
            // We don't want description tag, probably because we want to free type the description. So add space for that.
            sb.appendSnippetTabstop();
            sb.appendLine();

            // Jump a line after description free-type area before showing other tags
            sb.appendLine();
        }
    }

    private _emitAuthor(sb: utils.SnippetStringBuilder) {
        if (vs.workspace.getConfiguration().get("docthiscore.includeAuthorTag", false)) {
            let author: string = vs.workspace.getConfiguration().get("docthiscore.authorName", "");
            sb.append("@author " + author);
            sb.appendSnippetTabstop();
            sb.appendLine();
        }
    }

    private _emitVariableDeclaration(sb: utils.SnippetStringBuilder, node: ts.VariableDeclaration, sourceFile: ts.SourceFile) {
        for (const child of node.getChildren()) {
            const result = this._documentNode(sb, child, sourceFile);
            if (result) {
                return result;
            }
        }

        return;
    }

    private _emitFunctionExpression(sb: utils.SnippetStringBuilder, node: ts.FunctionExpression | ts.ArrowFunction, sourceFile: ts.SourceFile) {
        let targetNode = node.parent;

        if (node.parent.kind !== ts.SyntaxKind.PropertyAssignment &&
            node.parent.kind !== ts.SyntaxKind.BinaryExpression &&
            node.parent.kind !== ts.SyntaxKind.PropertyDeclaration) {

            targetNode = utils.findFirstParent(targetNode, [ts.SyntaxKind.VariableDeclaration, ts.SyntaxKind.VariableStatement]);
            if (!targetNode) {
                return;
            }
        }

        this._emitDescriptionHeader(sb);

        // this._emitTypeParameters(sb, node);
        this._emitParameters(sb, node);
        this._emitReturns(sb, node);
        // this._emitMemberOf(sb, node.parent);

        return ts.getLineAndCharacterOfPosition(sourceFile, targetNode.getStart());
    }

    private _emitClassDeclaration(sb: utils.SnippetStringBuilder, node: ts.ClassDeclaration) {
        this._emitDescriptionHeader(sb);
        this._emitAuthor(sb);

        this._emitModifiers(sb, node);

        sb.append("@class");

        if (node.name) {
            sb.append(` ${ node.name.getText() }`);
        }

        sb.appendLine();

        this._emitHeritageClauses(sb, node);
        // this._emitTypeParameters(sb, node);
    }

    private _emitPropertyDeclaration(sb: utils.SnippetStringBuilder, node: ts.PropertyDeclaration | ts.AccessorDeclaration) {
        this._emitDescriptionHeader(sb);

        if (node.kind === ts.SyntaxKind.GetAccessor) {
            const name = utils.findFirstChildOfKindDepthFirst(node, [ts.SyntaxKind.Identifier]).getText();
            const parentClass = <ts.ClassDeclaration>node.parent;

            let hasSetter = !!parentClass.members.find(c => c.kind === ts.SyntaxKind.SetAccessor &&
                utils.findFirstChildOfKindDepthFirst(c, [ts.SyntaxKind.Identifier]).getText() === name);

            if (!hasSetter) {
                sb.appendLine("@readonly");
            }
        }

        this._emitModifiers(sb, node);

        // JSDoc fails to emit documentation for arrow function syntax. (https://github.com/jsdoc3/jsdoc/issues/1100)
        if (includeTypes()) {
            if (node.type && node.type.getText().indexOf("=>") === -1) {
                sb.appendLine(`@type ${ utils.formatTypeName(node.type.getText()) }`);
            } else if (enableHungarianNotationEvaluation() && this._isHungarianNotation(node.name.getText())) {
                sb.appendLine(`@type ${ this._getHungarianNotationType(node.name.getText()) }`);
            }
        }

        // this._emitMemberOf(sb, node.parent);
    }

    // private _emitInterfaceDeclaration(sb: utils.SnippetStringBuilder, node: ts.InterfaceDeclaration) {
    //     this._emitDescriptionHeader(sb);
    //     this._emitAuthor(sb);

    //     this._emitModifiers(sb, node);

    //     sb.appendLine(`@interface ${ node.name.getText() }`);

    //     this._emitHeritageClauses(sb, node);
    //     this._emitTypeParameters(sb, node);
    // }

    // private _emitEnumDeclaration(sb: utils.SnippetStringBuilder, node: ts.EnumDeclaration) {
    //     this._emitDescriptionHeader(sb);

    //     this._emitModifiers(sb, node);

    //     sb.appendLine(`@enum {number}`);
    // }

    private _emitMethodDeclaration(sb: utils.SnippetStringBuilder, node: ts.MethodDeclaration | ts.FunctionDeclaration) {
        if (ts.isFunctionDeclaration(node)) { this._emitName(sb, node); }
        this._emitDescriptionHeader(sb);
        this._emitAuthor(sb);

        this._emitModifiers(sb, node);
        // this._emitTypeParameters(sb, node);
        this._emitParameters(sb, node);
        this._emitReturns(sb, node);
        // this._emitMemberOf(sb, node.parent);
    }

    // private _emitMemberOf(sb: utils.SnippetStringBuilder, parent: ts.Node) {
    //     let enabledForClasses = parent.kind === ts.SyntaxKind.ClassDeclaration && vs.workspace.getConfiguration().get("docthiscore.includeMemberOfOnClassMembers", true);
    //     let enabledForInterfaces = parent.kind === ts.SyntaxKind.InterfaceDeclaration && vs.workspace.getConfiguration().get("docthiscore.includeMemberOfOnInterfaceMembers", true);
    //     if (parent && (<any>parent)["name"] && (enabledForClasses || enabledForInterfaces)) {
    //         sb.appendLine("@page " + (<any>parent)["name"].text);
    //     }
    // }

    private _isNameBooleanLike(name: string): boolean {
        return /(?:is|has|can)[A-Z_]/.test(name);
    }

    private _isNameFunctionLike(name: string): boolean {
        const fnNames = ["cb", "callback", "done", "next", "fn"];
        return fnNames.indexOf(name) !== -1;
    }

    private _inferReturnTypeFromName(name: string): string {
        if (this._isNameBooleanLike(name)) {
            return "{boolean}";
        }

        return "";
    }

    private _emitReturns(sb: utils.SnippetStringBuilder, node: ts.MethodDeclaration | ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction) {
        if (utils.findNonVoidReturnInCurrentScope(node) || (node.type && node.type.getText() !== "void")) {
            sb.append("@returns");
            if (includeTypes() && node.type) {
                sb.append(" " + utils.formatTypeName(node.type.getText()));
            }
            else if (includeTypes() && inferTypes()) {
                sb.append(" " + this._inferReturnTypeFromName(node.name.getText()));
            }

            sb.append(" ");
            sb.appendSnippetTabstop();

            sb.appendLine();
        }

    }

    private _inferParamTypeFromName(name: string): string {
        if (this._isNameFunctionLike(name)) {
            return "{function}";
        }

        if (this._isNameBooleanLike(name)) {
            return "{boolean}";
        }

        return "{any}";
    }

    private _emitParameters(sb: utils.SnippetStringBuilder, node:
        ts.MethodDeclaration | ts.FunctionDeclaration | ts.ConstructorDeclaration | ts.FunctionExpression | ts.ArrowFunction) {

        if (!node.parameters) {
            return;
        }

        node.parameters.forEach(parameter => {
            if (ts.isObjectBindingPattern(parameter.name)) {
                parameter.name.elements.forEach(element => {
                    this._emitParameter(sb, element);
                });
            } else {
                this._emitParameter(sb, parameter);
            }
        });
    }

    private _emitParameter(sb: utils.SnippetStringBuilder, parameter) {
        const name = parameter.name.getText();
        const isArgs = !!parameter.dotDotDotToken;
        const initializerValue = parameter.initializer ? parameter.initializer.getText() : null;

        let typeName = "{any}";

        if (includeTypes()) {
            if (parameter.initializer && !parameter.type) {
                if (/^[0-9]/.test(initializerValue)) {
                    typeName = "{number}";
                }
                else if (initializerValue.indexOf("\"") !== -1 ||
                    initializerValue.indexOf("'") !== -1 ||
                    initializerValue.indexOf("`") !== -1) {
                    typeName = "{string}";
                }
                else if (initializerValue.indexOf("true") !== -1 ||
                    initializerValue.indexOf("false") !== -1) {
                    typeName = "{boolean}";
                }
            }
            else if (parameter.type) {
                typeName = utils.formatTypeName((isArgs ? "..." : "") + parameter.type.getFullText().trim());
            }
            else if (enableHungarianNotationEvaluation() && this._isHungarianNotation(name)) {
                typeName = this._getHungarianNotationType(name);
            }
            else if (inferTypes()) {
                typeName = this._inferParamTypeFromName(name);
            }
        }

        sb.append("@param ");

        if (includeTypes()) {
            sb.append(`${typeName} `);
        }

        sb.append(name);

        if (initializerValue) {
            sb.append(` [${parameter.initializer.getText()}]`);
        }

        sb.append(" - ");
        sb.appendSnippetTabstop();

        sb.appendLine();

    }

    private _isHungarianNotation(name: string): boolean {
        return /^[abefimos][A-Z]/.test(name);
    }

    private _getHungarianNotationType(name: string): string {
        switch (name.charAt(0)) {
            case "a": return "{Array}";
            case "b": return "{boolean}";
            case "e": return "{Object}"; // Enumeration
            case "f": return "{function}";
            case "i": return "{number}";
            case "m": return "{Object}"; // Map
            case "o": return "{Object}";
            case "s": return "{string}";
            default: return "{any}";
        }
    }

    private _emitConstructorDeclaration(sb: utils.SnippetStringBuilder, node: ts.ConstructorDeclaration) {
        sb.appendSnippetPlaceholder(`Creates an instance of ${
            (<ts.ClassDeclaration>node.parent).name.getText()
            }.`);
        sb.appendLine();
        this._emitAuthor(sb);

        this._emitParameters(sb, node);
        // this._emitMemberOf(sb, node.parent);
    }

    // private _emitTypeParameters(sb: utils.SnippetStringBuilder, node: ts.ClassLikeDeclaration | ts.InterfaceDeclaration | ts.MethodDeclaration | ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction) {
    //     if (!node.typeParameters) {
    //         return;
    //     }

    //     node.typeParameters.forEach(parameter => {
    //         sb.append(`@template ${ parameter.name.getText() } `);
    //         sb.appendSnippetTabstop();
    //         sb.appendLine();
    //     });
    // }

    private _emitHeritageClauses(sb: utils.SnippetStringBuilder, node: ts.ClassLikeDeclaration | ts.InterfaceDeclaration) {
        if (!node.heritageClauses || !includeTypes()) {
            return;
        }

        node.heritageClauses.forEach((clause) => {
            const heritageType = clause.token === ts.SyntaxKind.ExtendsKeyword ? "@extends" : "@implements";

            clause.types.forEach(t => {
                let tn = t.expression.getText();
                if (t.typeArguments) {
                    tn += "<";
                    tn += t.typeArguments.map(a => a.getText()).join(", ");
                    tn += ">";
                }

                sb.append(`${ heritageType } ${ utils.formatTypeName(tn) }`);
                sb.appendLine();
            });
        });
    }

    private _emitModifiers(sb: utils.SnippetStringBuilder, node: ts.Node) {
        if (!node.modifiers) {
            return;
        }

        node.modifiers.forEach(modifier => {
            switch (modifier.kind) {
                // case ts.SyntaxKind.ExportKeyword:
                //     sb.appendLine("@export"); return;
                // case ts.SyntaxKind.AbstractKeyword:
                //     sb.appendLine("@abstract"); return;
                case ts.SyntaxKind.ProtectedKeyword:
                    sb.appendLine("@protected"); return;
                case ts.SyntaxKind.PrivateKeyword:
                    sb.appendLine("@private"); return;
                case ts.SyntaxKind.PublicKeyword:
                    sb.appendLine("@public"); return;
                // case ts.SyntaxKind.StaticKeyword:
                //     sb.appendLine("@static"); return;
            }
        });
    }

    private _emitName(sb: utils.SnippetStringBuilder, node: ts.FunctionDeclaration | ts.VariableDeclarationList) {
        let name;
        if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.getText();
        } else if (ts.isVariableDeclarationList(node) && node.declarations.length) {
            name = (<ts.VariableDeclarationList>node).declarations[0].name.getText();
        }

        sb.appendLine(`@name ${name}`);
        return;
    }

    // Arrow functions don't seem to come out to ts.ArrowFunction.  Instead they seem to be read as
    // VariableDeclarationLists and VariableStatements.  This covers that special case.
    private _emitArrowFunction(sb: utils.SnippetStringBuilder, node: ts.Node, sourceFile: ts.SourceFile) {
        if (ts.isVariableStatement(node) && node.declarationList && node.declarationList.declarations.length) {
            node = <ts.VariableDeclarationList>(node.declarationList);
        }
        if (ts.isVariableDeclarationList(node) && node.declarations.length) {
            let declaration = node.declarations.find(dec => ts.isArrowFunction(dec.initializer));
            if (declaration) {
                const arrowFunc = <ts.ArrowFunction>declaration.initializer;
                this._emitName(sb, node);
                this._emitAuthor(sb);
                return this._emitFunctionExpression(sb, arrowFunc, sourceFile);
            }
        }

        return;
    }

    private _emitSourceFile(sb: utils.SnippetStringBuilder, node: ts.SourceFile) {
        sb.appendLine("////");
        // The filename has double a extension on it '.js.js'.
        const path = node.fileName.replace(/(\.js|\.ts)+/, "");
        const pathParts = path.split("/");

        sb.appendLine(`@page ${pathParts.slice(-2).join("/")}`);
        this._emitDescriptionHeader(sb);
        this._emitAuthor(sb);
        sb.appendLine("////");

        return { line: 1, character: 0 };
    }

    dispose() {
        if (this._outputChannel) {
            this._outputChannel.dispose();
        }

        this._services.dispose();
    }
}
