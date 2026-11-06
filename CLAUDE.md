# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a reusable Symfony bundle, not a standalone application. It renders Bootstrap 4 modals with Twig and drives their AJAX behavior with jQuery 3. PHP sources are autoloaded as `Dyg81\ModalBundle\` from `src/`.

## Development commands

```bash
# Install dependencies for local inspection or validation.
composer install

# Validate the package definition.
composer validate --strict

# Lint all PHP source files.
find src tests -name '*.php' -print0 | xargs -0 -n1 php -l

# Lint one PHP file.
php -l src/Controller/ModalController.php

# Run the PHP test suite.
vendor/bin/phpunit

# Lint the JavaScript file.
node --check Resources/public/js/scripts.js

# Run JavaScript unit tests.
npm run test:unit

# Run browser tests (requires Playwright browsers).
npm run test:browser

# Static analysis and code style.
composer --working-dir=tools/quality install
tools/quality/vendor/bin/phpstan analyse --configuration=phpstan.neon
tools/quality/vendor/bin/php-cs-fixer fix --dry-run --diff --config=.php-cs-fixer.php

# Validate translation files.
xmllint --noout Resources/translations/Dyg81ModalBundle.*.xlf
```

There is no build step; assets in `Resources/public/` are served directly without compilation. Functional changes need verification in a consuming Symfony application; from that application, install updated assets with:

```bash
bin/console assets:install --symlink
```

The consuming application must import the bundle routes manually:

```yaml
# config/routes/dyg81_modal.yaml
dyg81_modal:
    resource: '@Dyg81ModalBundle/Resources/config/routing.yaml'
```

If the application still uses the pre-Flex directory structure, migrate it to the current Symfony Flex layout first by following the official [Symfony Flex](https://symfony.com/doc/current/setup/flex.html) guide.

## Architecture

### Bundle wiring

- `Dyg81ModalBundle::getPath()` points to the repository root, enabling the classic bundle layout with top-level `Resources/config/`, `Resources/views/`, `Resources/translations/` and `Resources/public/` directories.
- `DependencyInjection/Dyg81ModalExtension.php` loads `Resources/config/services.yml`; the controller receives `Twig\Environment` and `TranslatorBagInterface` through constructor injection.
- `ModalController` supplies the built-in message and confirmation modal routes. Other modal content and form actions are implemented by the consuming application.

### Browser/server flow

`Resources/public/js/scripts.js` is the central integration layer. It binds handlers on document ready to these public HTML contracts:

- `.modal-open` fetches the element's `href`, appends the returned modal HTML to `<body>`, and opens it.
- `.modal-open-confirm` fetches `data-modal-href`; its `.modal-btn-confirm` button re-triggers the original link or form action.
- `.modal-open-from-form` submits a page form over AJAX and handles the JSON/HTML response protocol.
- Forms inside opened modals are also submitted over AJAX. Only the first form in a modal receives this handler.

`ModalRedirectResponse` produces `{"redirect": "..."}`, causing browser navigation after a successful modal form submission. `ModalOpenResponse` produces `{"modal": ..., "modalId": ...}`, which the JavaScript uses to open the next modal. An ordinary HTML response is treated as a re-render with validation errors: it replaces the modal contents for modal forms, or the originating form fragment for `.modal-open-from-form` submissions.

Modal markup is appended dynamically and removed after Bootstrap's `hidden.bs.modal` event. The default DOM id is `base-modal`; triggers can select another id with `data-modal-id`, and response-driven flows use `modalId`. Keep the server responses, Twig ids, data attributes, and JavaScript selectors synchronized when changing this flow.

### Templates and assets

`baseModal.html.twig` defines the overridable Twig blocks and shared Bootstrap markup. `baseFormModal.html.twig` extends it without the `fade` effect because AJAX form-error rendering closes and recreates the modal. `baseConfirmModal.html.twig` supplies the confirmation layout, while `messageModal.html.twig` supplies the simple message body. Translation keys use the `Dyg81ModalBundle` domain in the XLF files under `Resources/translations/`.

The host page must load jQuery 3, Bootstrap 4, and `bundles/dyg81modal/js/scripts.js`; the optional CSS enables the AJAX throbber. The code uses browser globals (`$`, `jQuery`, and `modalFunctions`), not modules. Bootstrap supports one open modal at a time, which is also this bundle's intended behavior.

## Compatibility constraints

Composer supports Symfony `3.4`, `4.4` and `5.4` with Twig `^2.10 || ^3.0` and PHP `>=7.1.3`. Preserve that compatibility when introducing PHP, YAML routing, or Twig syntax.

The following are public API and should be treated as stable across minor versions:

- CSS classes: `modal-open`, `modal-open-confirm`, `modal-open-from-form`, `modal-btn-confirm`, `ajax-progress*`, `throbber`, `modal-error-message`.
- HTML data attributes: `data-modal-id`, `data-modal-href`, `data-modal-error-target`.
- Route names: `dyg81_modal_open_message`, `dyg81_modal_open_confirm`.
- Twig block names: `modalId`, `modalEffects`, `modalBackdrop`, `modalSize`, `modalContent`, `modalTitle`, `modalHeader`, `modalBody`, `modalFooter`.
- JSON response fields: `modal`, `modalId`, `redirect`.
- JavaScript global: `modalFunctions`.

## Conventions

- PHP: PSR-12, 4 spaces, PHP 7.1-compatible syntax.
- JavaScript: ES5 + jQuery 3, 4 spaces, end statements with `;`, prefer `.on()` over shorthand handlers.
- Twig: Bootstrap 4 markup, 4 spaces.
- YAML: 2 spaces.
- Files end with a newline.
- Update `README.md`, `UPGRADE.md`, `CHANGELOG.md` and the Version History entry when behavior changes.
