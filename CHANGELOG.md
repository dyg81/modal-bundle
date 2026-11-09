# Changelog

All notable changes to `dyg81/modal-bundle` are documented in this file.

## 3.0.0-beta1 (unreleased)

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
