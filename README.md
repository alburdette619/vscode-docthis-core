# Document This Core

![GitHub Logo](/images/icon.png)

[![Build Status](https://travis-ci.org/alburdette619/vscode-docthis-core.svg?branch=master)](https://travis-ci.org/alburdette619/vscode-docthis-core)

[![GitHub package version](https://img.shields.io/github/package-json/v/alburdette619/vscode-docthis-core.svg)]()  [![GitHub](https://img.shields.io/github/issues/alburdette619/vscode-docthis-core.svg?style=flat-square)](https://github.com/alburdette619/vscode-docthis-core/issues)  [![GitHub last commit](https://img.shields.io/github/last-commit/alburdette619/vscode-docthis-core.svg)]()  [![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square)](http://opensource.org/licenses/MIT)

[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/v/alburdette619.docthis-core.svg)]()  [![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/d/alburdette619.docthis-core.svg)]()  [![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/r/alburdette619.docthis-core.svg)]()

"Document This Core" is a Visual Studio Code extension that automatically generates detailed [docs-core](https://github.com/tjbenton/docs) comments for both TypeScript and JavaScript files.  It is based on ["Document This"](https://github.com/joelday/vscode-docthis) by [joelday](https://github.com/joelday) and altered to use triple forward-slash style comments.

---

## Tags

Supports docs-core and Closure Compiler tags:

```@access, @author, @description, @name, @page, @param, @property, @readonly, @returns, and @type.```

---

## Commands

Command Name | Keybinding | Description
:--- | :---: | :---
Document This | `Ctrl+Alt+D` + `Ctrl+Alt+D` | Attempts to generate documentation for the subsequent line
Document This File | `Ctrl+Alt+D` + `Ctrl+Alt+F` | Inserts file level documentation for the current file

 Commands can also be found on the context menu.

---

## Configuration

Setting Name | Type | Default | Description
:--- | :---: | :---: | :---
docthiscore.includeTypes | boolean | true | When enabled, type information is added to comment tags
docthiscore.includeDescriptionTag | boolean | false | When enabled, JSDoc comments for functions and methods will include @description
docthiscore.enableHungarianNotationEvaluation | boolean | false | When enabled, hungarian notation will be used as a type hint
docthiscore.inferTypesFromNames | boolean | false |When enabled, will use names of params & methods as type hints
docthiscore.includeAuthorTag | boolean | false | When enabled, will add the @author tag
docthiscore.authorName | string | - |When docthiscore.includeAuthorTag is enabled, will add @author tag with this value
docthiscore.documentNewFile | boolean | false | When enabled, new files targeted by docthiscore.documentNewFileGlob will be created with a file level comment block
docthiscore.documentNewFileGlob | string | **/*.{ts,js} | A glob that determines which new files are documented. docthiscore.documentNewFile must be enabled
