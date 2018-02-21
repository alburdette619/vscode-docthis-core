# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

---

### Changed

* Inline comments (`///#`) are now only applied if a parent node, other than the source file, has been documented.  Previously this was done if the comment block was not a file level comment.

### Fixed

* Tag ordering consistency; the description and author tags were not consistently output in the same order.  Now it should always be author then description.

## 0.2.0 - 2018-02-21

---

### Added

* Badges to README for GitHub and the Visual Studio Marketplace.

* Added `////` as a header and footer to file level comment blocks.

### Fixed

* Correctly formatted `@returns` lines for docs-core (Ex: `@returns {any} - ...`).

## 0.1.0 - 2018-02-12

---

### Added

* Support for the `@name` tag on functions.

* Support for file level comments.

* New settings

  * `docthiscore.documentNewFile` - allows for automatic file level doc generation when a new file is created.

  * `docthiscore.documentNewFileGlob` - specifies a glob for determining which files should receive file level comments.

### Changed

* This is based on ["Document This"](https://github.com/joelday/vscode-docthis) by [joelday](https://github.com/joelday) and was altered to support [docs-core](https://github.com/tjbenton/docs).

* Now  uses `///` for file level comments and `///#` for document level comments.  The extension will generate documentation on a triple slash being entered and will use the next line as context.

* Now supports the following docs-core tags: tags: `@access, @author, @description, @name, @page, @param, @property, @readonly, @returns, and @type`.

* Parameter documentation now follows docs-core standards.

* Added `vscode` to `devDependencies` as it seemed needed.

* Changed the icon for the library.

* Removed donate link for Document This.

* Changed commands and User Settings to match the new extension name.

* Altered TravisCI build badge.

* Bumped the VSCode engine to support `ConfigurationChangeEvent`.

### Removed

* Support for any syntax kind that was not supported by docs-core: `@abstract, @export, @interface, @static, @template`.

* Leading space character on comment lines.

### Fixed

* Removed `VariableDeclarationList` from the list of parents to find for placing function level comments.  Doing this wasn't taking into account modifiers like `export` and was overwriting them.

* Support for arrow functions.  Previously they generated an error because the actual `ArrowFunction` was not a child of the detected node, but part of its initializer and therefore wasn't picked up.  Now `VariableStatement` and `VariableDeclarationList` kind documentation is attempted to see if it contains an arrow function.

* Parameter documentation when destructuring.  Previously this was not handled and the entire block was added as one param.