# Changelog

All notable changes to `dyg81/modal-bundle` are documented in this file.

## 7.0.0 (2026-11-18)

### Added
- Support for Symfony 8.2. The `^8.1` constraint also installs 8.2 once stable; CI tests 8.2 while it is a pre-release.

### Changed
- Require PHP `>=8.4.1` and Symfony `^8.1`.
- Require Twig `^3.25`.
- Require PHPUnit `^13.0`.
- Declare `: void` on `Dyg81ModalExtension::load()` and the test `AppKernel::registerContainerConfiguration()` for Symfony 8.
- Update the CI matrix to PHP 8.4/8.5 with Symfony 8.1/8.2.

### Removed
- Symfony 7.4 support.
- PHP 8.2 and 8.3 support.
- PHPUnit 10 and 11 support.

## 6.0.1 (2026-11-17)

### Security
- Update `@playwright/test` from 1.48.2 to 1.65.1 to address a high-severity advisory in Playwright versions below 1.55.1 (browser download without SSL certificate verification). Development tooling only; no runtime code changes.

## 6.0.0 (2026-11-17)

### Changed
- Require PHP `>=8.2` and Symfony `^7.4`.
- Require Twig `^3.12`.
- Require PHPUnit `^10.5|^11.0` and update `phpunit.xml.dist` to the PHPUnit 10/11 schema.
- Update the CI matrix to PHP 8.2/8.4 with Symfony 7.4.

### Removed
- Symfony 6.4 support.
- PHP 8.1 support.
- PHPUnit 9 support.

## 5.0.1 (2026-11-16)

### Fixed
- Require `symfony/flex ^2.5` in development dependencies so the lowest-dependency CI job does not install Flex 2.0.0, which is incompatible with current Composer.

## 5.0.0 (2026-11-15)

### Changed
- Require PHP `>=8.1` and Symfony `^6.4`.
- Require Twig `^3.0`.
- Update `ModalOpenResponse::setData()` and `ModalRedirectResponse::setData()` to the Symfony 6.4 signature `setData(mixed $data = []): static`.
- Update the CI matrix to PHP 8.1/8.3 with Symfony 6.4.

### Removed
- Symfony 4.4 and 5.4 support.
- Twig 2 support.
- PHP 8.0 support.

## 4.0.0 (2026-11-14)

### Changed
- Require PHP `>=8.0` and Symfony `^4.4 || ^5.4`.
- Migrate templates to Bootstrap 5 markup (`btn-close`, `data-bs-dismiss`).
- Rewrite `Resources/public/js/scripts.js` with vanilla JavaScript and `fetch`; jQuery is no longer required.
- `modal:opened`, `modal:closed` and `modal:error` are native `CustomEvent`s; listeners read the payload from `event.detail`.
- `modalFunctions.modifyElements()` accepts a selector string or a DOM element.
- `modalFunctions.activeModal`, `activeTrigger` and the value returned by `addProgressThrobber()` are DOM elements.
- Failed requests report `response`, `error`, `status` and `statusText` in `modal:error` instead of `jqXHR`, `textStatus` and `errorThrown`.
- Update the CI matrix to PHP 8.0/8.3 with Symfony 4.4/5.4.

### Removed
- jQuery dependency.
- Bootstrap 4 support.
- Symfony 3.4 support.
- PHP 7.x support.

### Added
- Typed constructors on the response classes and PHP 8 return types.
- Tests for Bootstrap 5 close markup, fetch error handling and modal lifecycle events.

### Fixed
- A modal requested while the active modal is still fading in now waits for `shown.bs.modal` before closing it, instead of leaving the old modal open.
- Same-origin requests send `X-Requested-With: XMLHttpRequest` again.
- Malformed JSON payloads and responses missing the expected modal id are rejected before anything is inserted into the page.
- `GET` forms without an `action` replace the current query string again, as in 3.x.

## 3.2.0 (2026-11-12)

### Fixed
- `baseModal.html.twig` no longer repeats its block definitions after the modal markup. They were rendered a second time on every modal, leaking the child `modalTitle`, `modalBody` and `modalFooter` content as stray text after the page when the modal was inserted over AJAX.
- Added a functional test that fails if a modal block is rendered more than once.

## 3.1.1 (2026-11-10)

### Fixed
- Prevented an orphan loading spinner in `openModalFromForm` when another AJAX request is already pending by checking `pendingRequest` before creating the progress indicator and preparing form data.

## 3.1.0 (2026-11-10)

### Added
- Brazilian Portuguese (`pt_BR`), French (`fr`), German (`de`) and Japanese (`ja`) translations.
- Translation tests that verify every locale defines the same keys as English and preserves placeholders, plural forms and date/currency format types.
- Documented the Symfony fallback configuration required to display the default language when a translation is missing.

### Changed
- XLIFF metadata now uses BCP 47 language tags for `source-language` and `target-language` (`pt-BR` for the `pt_BR` locale).

## 3.0.0 (2026-11-08)

### Changed
- Restored the classic Symfony bundle resource layout (`Resources/config`, `Resources/public`, `Resources/views`, `Resources/translations`).
- Replaced the GPL-derived `throbber-active.gif` and Drupal CSS with a self-contained, CSS-only loading spinner.
- Declared direct Symfony dependencies and added support for Symfony 3.4 Flex, 4.4 and 5.4.
- Removed the dependency on `sensio/framework-extra-bundle` and switched the built-in routes to YAML routing.
- The message modal endpoint now reads the translation key from the `key` query parameter and returns a 404 for missing, empty or unknown keys.
- `ModalOpenResponse` and `ModalRedirectResponse` now accept HTTP status and headers, validate their JSON protocol and provide safe `create()` / `fromJsonString()` factories.

### Added
- Screen-reader-only loading text inside the AJAX progress indicator, configurable via `modalFunctions.loadingText`.
- A dedicated `Dyg81ModalBundle` translation domain for all bundle messages.
- Unit tests for the modal response classes.
- Delegated event handling for all modal triggers and a `modalFunctions.modifyElements(root)` helper that accepts a selector, DOM element or jQuery object.
- Form submissions now include the initiating submit button value and support `GET` query-string serialization.
- Validation errors returned for `.modal-open-from-form` replace the originating form fragment instead of reloading the whole page.
- Centralized AJAX request tracking with cleanup on failure and a `modal:error` event that hosts can listen to or suppress.
- Modal and form fragments reject full HTML documents (`<!DOCTYPE`/`<html>`) and emit `modal:error` with `reason: 'unexpected-response'`.
- Serialized modal lifecycle: only one modal is open at a time, pending requests are ignored, active modals are closed before replacements are inserted and `modal:opened`/`modal:closed` events are emitted.
- IDs are resolved with `document.getElementById` and escaped for jQuery so special characters are supported.
- Improved modal accessibility: `aria-modal="true"`, `aria-labelledby` referencing a real `<h5 class="modal-title">`, translated close-button labels, and a fallback `aria-label` for modals without a title.
- Reorganized `baseConfirmModal.html.twig` to reuse the blocks from `baseModal.html.twig` instead of duplicating the header structure.

### Removed
- `Resources/public/images/throbber-active.gif`.
- Annotation routing from `ModalController`.

### Fixed
- Clicks inside an open modal no longer match the `.modal-open` trigger handler through Bootstrap's `<body class="modal-open">`, which previously blocked native form submission.

## 2.0.5 

### Added 
- Modal size block to baseModal.html.twig.

## 2.0.4 

### Fixed 
- Wrong code in the installation section.

## 2.0.3 

### Added 
- Backdrop block to baseModal.html.twig.

## 2.0.2 

### Changed
- Improve bundle requirements.

## 2.0.1 

### Fixed 
- Wrong explanation in README.md.

## 2.0.0 

### Added
- Symfony 5.3 support.

### Removed
- Symfony 5.2 support.

### Changed
- Restructure the bundle to meet Symfony new standards. 


## 1.4.1 

### Changed
- Delete unnecessary branch-alias section from composer.json.

## 1.4.0 

### Added 
- Dependency injection service to support Symfony 5.2.

## 1.3.0 

### Added 
- Symfony 4.4 support.

## 1.2.2 

### Removed 
- Unnecessary files and folders.

## 1.2.1 

### Added 
- LICENSE file. 

### Fix
- Correct translation files format.

## 1.2.0

### Changed
- Merge v1.0.3 and v1.1.0 to support both installations of Symfony 3.4.

## 1.1.0 

### Changed 
- Require section to support Symfony 3.4 installed via Symfony Website Skeleton.

## 1.0.3 

### Removed 
- DynamicPageBundle support.

## 1.0.2 

### Changed
- Improve symfony/framework-bundle syntax in composer.json.

## 1.0.1 

### Fix 
- Minor issues.

## 1.0.0 

### Changed
- First release. 
- Support only Symfony 3.4 based on the Symfony Standard Edition.