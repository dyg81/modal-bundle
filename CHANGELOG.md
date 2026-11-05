# Changelog

All notable changes to `dyg81/modal-bundle` are documented in this file.

## 3.0.0 (unreleased)

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

### Removed
- `Resources/public/images/throbber-active.gif`.
- Annotation routing from `ModalController`.
