# Document This Core

![GitHub Logo](/images/icon.png)

[![Build Status](https://travis-ci.org/alburdette619/vscode-docthis-core.svg?branch=master)](https://travis-ci.org/alburdette619/vscode-docthis-core)

[![GitHub package version](https://img.shields.io/github/package-json/v/alburdette619/vscode-docthis-core.svg)]()  [![GitHub](https://img.shields.io/github/issues/alburdette619/vscode-docthis-core.svg?style=flat-square)](https://github.com/alburdette619/vscode-docthis-core/issues)  [![GitHub last commit](https://img.shields.io/github/last-commit/alburdette619/vscode-docthis-core.svg)]()  [![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square)](http://opensource.org/licenses/MIT)

[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/v/alburdette619.docthis-core.svg)]()  [![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/d/alburdette619.docthis-core.svg)]()  [![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/r/alburdette619.docthis-core.svg)]()

"Document This Core" is a Visual Studio Code extension that automatically generates detailed [docs-core](https://github.com/tjbenton/docs) comments for both TypeScript and JavaScript files.  It is based on ["Document This"](https://github.com/joelday/vscode-docthis) by [joelday](https://github.com/joelday) and altered to use triple forward-slash style comments.

## Tags

Supports docs-core and Closure Compiler tags:

```@access, @author, @description, @name, @page, @param, @property, @readonly, @returns, and @type.```

## Commands Pallette

`Document This` - Attempts to generate documentation for the subsequent line.

`Trace TypeScript Syntax Node` - Prints info about the node ancestry at a given caret position.

## Configuration

Command Name | Type | Default | Description
:--- | :---: | :---: | :---
docthiscore.includeTypes | boolean | true | When enabled, type information is added to comment tags
docthiscore.includeDescriptionTag | boolean | false | When enabled, JSDoc comments for functions and methods will include @description
docthiscore.enableHungarianNotationEvaluation | boolean | false | When enabled, hungarian notation will be used as a type hint
docthiscore.inferTypesFromNames | boolean | false |When enabled, will use names of params & methods as type hints
docthiscore.includeAuthorTag | boolean | false | When enabled, will add the @author tag
docthiscore.authorName | string | - |When docthiscore.includeAuthorTag is enabled, will add @author tag with this value
docthiscore.documentNewFile | boolean | false | When enabled, new files targeted by docthiscore.documentNewFileGlob will be created with a file level comment block
docthiscore.documentNewFileGlob | string | **/*.{ts,js} | A glob that determines which new files are documented. docthiscore.documentNewFile must be enabled

## Document This

`Ctrl+Alt+D` and again `Ctrl+Alt+D`

Generates documentation for whatever the caret is on or inside of.
