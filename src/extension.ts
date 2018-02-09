import * as vs from "vscode";
import * as path from "path";

import { Documenter } from "./documenter";
import { TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind, Range } from "vscode";

const languages = [
    "javascript",
    "typescript",
    "vue",
    "javascriptreact",
    "typescriptreact"
];

let documenter: Documenter;

let fileWatcher: vs.FileSystemWatcher;

function lazyInitializeDocumenter() {
    if (!documenter) {
        documenter = new Documenter();
    }
}

function languageIsSupported(document: vs.TextDocument) {
    return (languages.findIndex(l => document.languageId === l) !== -1 ||
        path.extname(document.fileName) === ".vue");
}

function verifyLanguageSupport(document: vs.TextDocument, commandName: string) {
    if (!languageIsSupported(document)) {
        vs.window.showWarningMessage(`Sorry! '${commandName}' currently only supports JavaScript and TypeScript.`);
        return false;
    }

    return true;
}

function runCommand(commandName: string, document: vs.TextDocument, implFunc: () => void) {
    if (!verifyLanguageSupport(document, commandName)) {
        return;
    }

    try {
        lazyInitializeDocumenter();
        implFunc();
    }
    catch (e) {
        debugger;
        console.error(e);
    }
}

const documentThis = (forCompletion: boolean) => {
    const commandName = "Document This";

    runCommand(commandName, vs.window.activeTextEditor.document, () => {
        documenter.documentThis(vs.window.activeTextEditor, commandName, forCompletion);
    });
};

const handleWatchFileCreate = () => {
    disposeFileWatcher();
    const config = vs.workspace.getConfiguration();
    if (config.get("docthiscore.documentNewFile", false)) {
        fileWatcher = vs.workspace.createFileSystemWatcher(
            config.get("docthiscore.documentNewFileGlob", "**/*.{ts,js}"),
            false,
            true,
            true
        );

        fileWatcher.onDidCreate((event) => {
            if (event.scheme === "file") {
                documentThis(true);
            }
        });
    }
};

const disposeFileWatcher = () => {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
};

// Thanks, @mjbvz!
class DocThisCompletionItem extends CompletionItem {
    constructor(document: TextDocument, position: Position) {
        super("/** Document This */", CompletionItemKind.Snippet);
        this.insertText = "";
        this.sortText = "\0";

        const line = document.lineAt(position.line).text;
        const prefix = line.slice(0, position.character).match(/\{3}\s*$/);
        const start = position.translate(0, prefix ? -prefix[0].length : 0);
        this.range = new Range(start, position.translate(0, 0));

        this.command = {
            title: "Document This",
            command: "docthiscore.documentThis",
            arguments: [true]
        };
    }
}

export function activate(context: vs.ExtensionContext): void {
    context.subscriptions.push(vs.languages.registerCompletionItemProvider(
        languages,
        {
            provideCompletionItems: (document: TextDocument, position: Position, token: CancellationToken) => {
                const line = document.lineAt(position.line).text;
                const prefix = line.slice(0, position.character);

                if (prefix.match(/^\s*$|\/{3}#?\s*$|^\s*\/{3}#?\s*$/)) {
                    return [new DocThisCompletionItem(document, position)];
                }

                return;
            }
        },
        "/"));

    context.subscriptions.push(vs.commands.registerCommand("docthiscore.documentThis", documentThis));

    context.subscriptions.push(vs.commands.registerCommand("docthiscore.traceTypeScriptSyntaxNode", () => {
        const commandName = "Trace TypeScript Syntax Node";

        runCommand(commandName, vs.window.activeTextEditor.document, () => {
            documenter.traceNode(vs.window.activeTextEditor);
        });
    }));

    if (vs.workspace.getConfiguration().get("docthiscore.documentNewFile", false)) {
        handleWatchFileCreate();
    }

    vs.workspace.onDidChangeConfiguration((event: vs.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration("docthiscore.documentNewFile") ||
            event.affectsConfiguration("docthiscore.documentNewFileGlob")) {
            handleWatchFileCreate();
        }
    });
}
