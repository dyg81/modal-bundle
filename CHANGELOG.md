# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versioning according to [SemVer](https://semver.org/lang/es/).

## [Unreleased] - 3.0.0 (in development)

### Changed
- The bundle now uses `AbstractBundle` (`Dyg81ModalExtension` has been removed).
- Services are defined in `config/services.php`.
- Routes use PHP attributes, with the prefix defined by the application.

### Added
- Configuration options: `dyg81_modal.translation_domain` and `dyg81_modal.default_modal_id`.
- Functional test suite, including a test kernel.

### Removed
- `config/services.yml` and `DependencyInjection/Dyg81ModalExtension.php`.
