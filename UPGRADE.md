# Upgrade Guide

## From 4.x to 5.0.0

### PHP and Symfony requirements

- PHP `>=8.1` is now required.
- Only Symfony `6.4` is supported. Symfony `4.4` and `5.4` are dropped.
- Twig `^3.0` is required.

### Custom response subclasses

If you extend `ModalOpenResponse` or `ModalRedirectResponse` and override `setData()`, match the Symfony 6.4 signature:

```php
public function setData(mixed $data = []): static
```

### Unchanged public API

Routes, route names, Twig blocks and template namespace, CSS classes, data attributes, JSON response fields (`modal`, `modalId`, `redirect`), the `modalFunctions` global and the bundle asset paths are unchanged.

## From 3.x to 4.0.0

### PHP and Symfony requirements

- PHP `>=8.0` is required.
- Only Symfony `4.4` and `5.4` are supported. Symfony `3.4` is dropped.

### Bootstrap 5 and jQuery

- The bundle now targets Bootstrap 5 markup and JavaScript. Host applications must load Bootstrap 5 CSS and JS.
- jQuery is no longer required or used by the bundle. Host pages may keep loading it for their own code.
- If you override the bundle templates, update the close button from `class="close"` with `data-dismiss="modal"` and an inner `&times;` span to `class="btn-close"` with `data-bs-dismiss="modal"` and no inner content. `baseConfirmModal.html.twig` buttons were updated the same way.

### Events are native CustomEvents

`modal:opened`, `modal:closed` and `modal:error` are now native `CustomEvent` instances dispatched on `document`. Listeners must read the payload from `event.detail` instead of a second jQuery argument:

```js
document.addEventListener('modal:opened', function(event) {
    console.log(event.detail.modalId);
});
```

`modal:error` is cancelable, so `event.preventDefault()` still suppresses the built-in fallback alert. Its detail no longer contains `jqXHR`, `textStatus` or `errorThrown`; `fetch` provides `response` (a `Response` object, or `null` for network and abort failures) and `error` (an `Error`) instead. `status` and `statusText` are also included.

### JavaScript API types

- `modalFunctions.modifyElements(root)` accepts a selector string or a DOM element. jQuery objects are no longer accepted.
- `modalFunctions.activeModal` and `modalFunctions.activeTrigger` are DOM elements, not jQuery objects.
- `modalFunctions.addProgressThrobber(element)` returns a DOM element.
- Delegated handlers are managed with `AbortController`; host code should not depend on the former `.dyg81Modal` jQuery namespaces.

### Request handling

Requests now use `fetch`. A non-2xx response is reported through `modal:error` with `reason: 'http-error'` rather than being handled by jQuery's failure callback. The JSON response protocol (`modal`, `modalId`, `redirect`) is unchanged.

## From 3.1 to 3.2.0

No application changes are required. `baseModal.html.twig` now defines each block once, at its place in the markup, instead of repeating the definitions after the modal element — those repeats were rendered at the end of every modal response. If you copied the template or override `@Dyg81Modal/baseModal.html.twig`, compare it with the new version and remove the trailing `{% block ... %}` definitions.

## From 2.x to 3.0.0

### Prepare your application structure

Version 3 assumes a Symfony Flex directory layout. If your application still uses the pre-Flex structure, migrate it first by following the official [Symfony Flex](https://symfony.com/doc/current/setup/flex.html) guide.

### PHP and Symfony requirements

- PHP `>=7.1.3` is now required.
- Supported Symfony versions are `3.4`, `4.4` and `5.4`. Symfony `5.3` is no longer supported.
- `sensio/framework-extra-bundle` is no longer required and its route annotations are no longer used.

### Bundle resource layout

The bundle has returned to the classic Symfony bundle layout:

```
Resources/
    config/
    public/
    translations/
    views/
```

Update any references from the previous top-level directories (`config/`, `public/`, `templates/`, `translations/`) to the `Resources/` paths.

### Routing

The built-in routes are now defined in YAML. Replace any annotation-based import with:

```yaml
# config/routes/dyg81_modal.yaml
dyg81_modal:
    resource: '@Dyg81ModalBundle/Resources/config/routing.yaml'
```

The message modal route changed from a path parameter to a query parameter:

```twig
{# Before #}
{{ path('dyg81_modal_open_message', {'message': 'info.message'}) }}

{# After #}
{{ path('dyg81_modal_open_message', {'key': 'modal.message.info.title'}) }}
```

The endpoint now returns a 404 response for missing, empty or unknown keys. It no longer accepts arbitrary text.

### Translation domain

All bundle translations moved from the `messages` domain to `Dyg81ModalBundle`. The translation files are now:

```
Resources/translations/Dyg81ModalBundle.en.xlf
Resources/translations/Dyg81ModalBundle.es.xlf
```

Update any custom translation overrides to use the new domain and file names.

### ModalController

`ModalController` no longer extends `AbstractController`. It receives `Twig\Environment` and `TranslatorBagInterface` through constructor injection. If you copied or extended it, remove any calls to `$this->get()` or `$this->render()` and use the injected services instead.

### Response classes

`ModalOpenResponse` and `ModalRedirectResponse` now validate their JSON protocol:

- `ModalOpenResponse($modal, $modalId = null, $status = 200, array $headers = array())`
- `ModalRedirectResponse($url, $status = 200, array $headers = array())`

`ModalOpenResponse` expects rendered HTML in its first argument, not a URL. The factory methods `create()` and `fromJsonString()` have been updated to preserve status, headers and protocol validation.

### JavaScript behavior

- All triggers are now bound with delegated events. Controls added to the DOM after page load work automatically. For content loaded through your own AJAX, call `modalFunctions.modifyElements(container)`.
- Form submissions now include the initiating submit button value when possible.
- `GET` forms are serialized into the query string; `POST`/`multipart` forms use `FormData`.
- Validation errors returned for `.modal-open-from-form` replace only the originating form fragment, not the whole document.
- Full HTML documents (`<!DOCTYPE` or `<html>`) are rejected and trigger a `modal:error` event.
- The bundle emits `modal:opened`, `modal:closed` and `modal:error` events on `document`.
- Only one modal may be open at a time. Rapid clicks are ignored while a request is pending.
- IDs are escaped for jQuery selectors, so special characters are supported.
- The DynamicPageBundle integration has been removed.

### Loading assets

The GPL-derived `throbber-active.gif` and Drupal CSS have been removed and replaced by a self-contained, CSS-only loading spinner. No image files are required.

### Twig templates

`baseModal.html.twig` gained a `modalTitle` block. `baseConfirmModal.html.twig` now reuses the blocks from `baseModal.html.twig` instead of overriding `modalContent`. Modals now include `aria-modal="true"` and either `aria-labelledby` (when a title is present) or a translated `aria-label`.

If you customized these templates, compare your version with the new ones and update the markup accordingly.
