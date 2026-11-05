# Changelog

All notable changes to `dyg81/modal-bundle` are documented in this file.

## 3.0.0 (unreleased)

### Changed
- Restored the classic Symfony bundle resource layout (`Resources/config`, `Resources/public`, `Resources/views`, `Resources/translations`).
- Replaced the GPL-derived `throbber-active.gif` and Drupal CSS with a self-contained, CSS-only loading spinner.

### Added
- Screen-reader-only loading text inside the AJAX progress indicator, configurable via `modalFunctions.loadingText`.

### Removed
- `Resources/public/images/throbber-active.gif`.
