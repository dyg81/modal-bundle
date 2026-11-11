# Overview

`dyg81/modal-bundle` is a reusable Symfony bundle that renders Bootstrap 4 modals with Twig and drives their AJAX behavior with jQuery 3. It is a fork of the unmaintained [`rares/modal-bundle`](https://packagist.org/packages/rares/modal-bundle).

The bundle provides ready-to-use message and confirmation modals, helpers for opening forms inside a modal, and a small JSON protocol for redirecting or chaining modals after an AJAX form submission.

# Version History

    v1.0.0 - First release. Support only Symfony 3.4 based on the Symfony Standard Edition.
    v1.0.1 - Fix a minor issue.
    v1.0.2 - Improve symfony/framework-bundle syntax in composer.json.
    v1.0.3 - Drop DynamicPageBundle support.
    v1.1.0 - Change the require section to support only Symfony 3.4 installed via Symfony Website Skeleton.
    v1.2.0 - Merge v1.0.3 and v1.1.0 to support both installations of Symfony 3.4.
    v1.2.1 - Add the LICENSE file and correct translation files.
    v1.2.2 - Remove unnecessary files and folders.
    v1.3.0 - Change the require section to support Symfony 4.4 and drop Symfony 3.4 support.
    v1.4.0 - Add the dependency injection service to support Symfony 5.2. Any other version is unsupported from now on.
    v1.4.1 - Delete unnecessary branch-alias section from composer.json.
    v2.0.0 - Restructure the bundle to meet Symfony new standards. Add Symfony 5.3 support, and Symfony 4.4 again as well; drop Symfony 5.2 support.
    v2.0.1 - Fix wrong explanation in README.md.
    v2.0.2 - Improve bundle requirements.
    v2.0.3 - Add backdrop block to baseModal.html.twig.
    v2.0.4 - Fix wrong code in the installation section.
    v2.0.5 - Add modal size block to baseModal.html.twig.
    v3.0.0-beta1 - Restore the classic `Resources/` bundle layout; replace the GPL loading gif with an accessible CSS-only spinner; add support for Symfony 3.4 Flex, 4.4 and 5.4; switch built-in routes to YAML; introduce the `Dyg81ModalBundle` translation domain; validate the JSON response protocol in `ModalOpenResponse` and `ModalRedirectResponse`; use delegated event handling via `modalFunctions.modifyElements()`; include the initiating submit button in AJAX form submissions; handle AJAX errors with `modal:error` events; serialize the modal lifecycle so only one modal is open at a time; and add accessible modal markup with `aria-modal`, translated labels and real heading titles.
    v3.0.0 - Fix clicks inside an open modal being intercepted by Bootstrap's `body.modal-open` class, which blocked native form submission; add browser tests for the modal protocol.
    v3.1.0 - Add Brazilian Portuguese, French, German and Japanese translations; add tests that validate translation keys, placeholders, plural forms and date/currency format types; document Symfony's translation fallback configuration.
    v3.1.1 - Fix an orphan loading spinner in openModalFromForm by checking for a pending AJAX request before creating the progress indicator.

# Requirements

- PHP `>=7.1.3`
- Symfony `3.4`, `4.4` or `5.4`
- Twig `^2.10 || ^3.0`
- jQuery `3.x`
- Bootstrap `4.x`

Symfony 3.4, 4.4 and several PHP versions in the support matrix are end-of-life. The bundle keeps them as legacy compatibility; new projects should use supported Symfony and PHP releases.

# Installation

Install the bundle with Composer:

```bash
composer require dyg81/modal-bundle
```

If your application still uses the pre-Flex directory structure, migrate it to the current Symfony Flex layout first by following the official [Symfony Flex](https://symfony.com/doc/current/setup/flex.html) guide.

## Enable the bundle

In a Symfony 3.4 Standard Edition application, enable the bundle in `AppKernel`:

```php
$bundles = [
    // ...
    new Dyg81\ModalBundle\Dyg81ModalBundle(),
];
```

In Symfony 4.4/5.4 Flex applications, Flex normally registers the bundle automatically. If it does not, add it to `config/bundles.php`:

```php
return [
    // ...
    Dyg81\ModalBundle\Dyg81ModalBundle::class => ['all' => true],
];
```

## Import the routes

No Flex recipe is provided, so import the bundle routes manually. Create or edit `config/routes/dyg81_modal.yaml`:

```yaml
dyg81_modal:
    resource: '@Dyg81ModalBundle/Resources/config/routing.yaml'
```

## Install the assets

```bash
bin/console assets:install --symlink
```

## Include the assets in your templates

The host page must load jQuery 3, Bootstrap 4 and the bundle JavaScript:

```twig
<link rel="stylesheet" href="{{ asset('bundles/dyg81modal/css/ajax-progress.css') }}">
<script src="{{ asset('bundles/dyg81modal/js/scripts.js') }}"></script>
```

The CSS file is optional; without it no loading spinner is shown.

# Features

The bundle supports one modal open at a time, matching Bootstrap 4's default behavior.

All triggers are bound with delegated events, so controls added to the page after the initial load also work. For content loaded through your own AJAX, call `modalFunctions.modifyElements(container)` where `container` is a selector string, DOM element or jQuery object. Calling it repeatedly on the same root removes the previous bundle handlers first, preventing duplicate requests.

When an AJAX request starts, a `div` with classes `ajax-progress` and `ajax-progress-throbber` is inserted after the clicked element. If the element has an `id`, an extra class `ajax-progress-ELEMENTID` is added. The spinner is CSS-only and contains a screen-reader-only `<span class="sr-only">`. Change the announcement text by setting `modalFunctions.loadingText` before any modal is opened.

## Content modal

The content modal displays any HTML inside a Bootstrap 4 modal. Add the class `modal-open` to a clickable element with an `href` pointing to a controller that returns modal markup.

The bundle includes a simple message modal endpoint. Use the route `dyg81_modal_open_message` with the query parameter `key` set to a translation key in the `Dyg81ModalBundle` domain:

```twig
<button type="button" class="btn btn-secondary modal-open"
        href="{{ path('dyg81_modal_open_message', {'key': 'modal.message.info.title'}) }}">
    Open message modal
</button>
```

The endpoint returns a 404 response if the key is missing, empty or unknown.

For custom content, create a controller that renders a template extending `baseModal.html.twig`:

```php
use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class ContactModalController
{
    private $twig;

    public function __construct(Environment $twig)
    {
        $this->twig = $twig;
    }

    public function showModal(ContactMessage $contactMessage)
    {
        return new Response($this->twig->render('contact/showModal.html.twig', [
            'contactMessage' => $contactMessage,
        ]));
    }
}
```

```twig
{# contact/showModal.html.twig #}
{% extends '@Dyg81Modal/baseModal.html.twig' %}

{% block modalTitle %}Contact message{% endblock %}

{% block modalBody %}
    <p>{{ contactMessage.subject }}</p>
{% endblock %}
```

```twig
<a href="{{ path('contact_show_modal', { 'id': contactMessage.id }) }}" class="modal-open" data-modal-id="contact-modal">
    Show contact modal
</a>
```

`data-modal-id` is optional and defaults to `base-modal`. The template may override the `modalId` block to match.

## Opening forms inside modals

Forms inside modals are submitted over AJAX. The first form in a modal receives the handler. On success return a `ModalRedirectResponse` to navigate away, or a `ModalOpenResponse` to open another modal. On failure, return the rendered form HTML; the bundle replaces the modal contents with the new markup, including validation errors.

Because validation re-rendering closes and reopens the modal, form modals should not use the `fade` effect. Extend `baseFormModal.html.twig` instead of `baseModal.html.twig`.

```php
use Dyg81\ModalBundle\Response\ModalOpenResponse;
use Dyg81\ModalBundle\Response\ModalRedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class ContactModalController
{
    private $twig;

    public function __construct(Environment $twig)
    {
        $this->twig = $twig;
    }

    public function editModal(Request $request, ContactMessage $contactMessage)
    {
        $editForm = $this->createForm(ContactMessageType::class, $contactMessage, [
            'action' => $this->generateUrl('contact_edit_modal', ['id' => $contactMessage->getId()]),
        ]);
        $editForm->add('save', SubmitType::class, ['label' => 'Edit']);

        $editForm->handleRequest($request);

        if ($editForm->isSubmitted() && $editForm->isValid()) {
            // Persist the entity...

            return new ModalRedirectResponse($this->generateUrl('contact_index'));
        }

        return new Response($this->twig->render('contact/editModal.html.twig', [
            'contactMessage' => $contactMessage,
            'edit_form' => $editForm->createView(),
        ]));
    }
}
```

```twig
{# contact/editModal.html.twig #}
{% extends '@Dyg81Modal/baseFormModal.html.twig' %}

{% block modalTitle %}Edit contact message{% endblock %}

{% block modalBody %}
    {{ form_start(edit_form) }}
        {{ form_widget(edit_form) }}
    {{ form_end(edit_form) }}
{% endblock %}
```

To open a modal after a successful form submission, render the modal HTML first and pass it to `ModalOpenResponse`:

```php
if ($form->isSubmitted() && $form->isValid()) {
    // Process the data...

    $modalHtml = $this->twig->render('@App/contact/success_modal.html.twig', [
        'contact' => $contactMessage,
    ]);

    return new ModalOpenResponse($modalHtml, 'success-modal');
}
```

## Confirmation modal

The confirmation modal asks the user to confirm an action. Add `modal-open-confirm` and `data-modal-href` to a link or to a submit control inside a form:

```twig
<a href="{{ path('contact_index') }}" class="modal-open-confirm"
   data-modal-href="{{ path('dyg81_modal_open_confirm') }}">
    Open confirm modal
</a>
```

```php
return $this->createFormBuilder()
    ->add('delete', SubmitType::class, [
        'attr' => [
            'class' => 'modal-open-confirm',
            'data-modal-href' => $this->generateUrl('dyg81_modal_open_confirm'),
        ],
    ])
    ->setAction($this->generateUrl('contact_delete', ['id' => $contactMessage->getId()]))
    ->setMethod('DELETE')
    ->getForm();
```

If you override `baseConfirmModal.html.twig`, keep the class `modal-btn-confirm` on the confirm button.

## Open modal after a successful page form submission

Add the class `modal-open-from-form` to a form. The form is submitted over AJAX. The name and value of the submit button that initiated the request are included automatically, including when the user presses **Enter** in a field and the browser does not provide a submitter.

- For `GET` forms, the data is serialized into the query string.
- For `POST`/`multipart` forms, a `FormData` object is sent.

If the server returns a `ModalOpenResponse`, the modal is opened. If it returns a `ModalRedirectResponse`, the browser navigates. If validation errors are returned as HTML, the originating form is replaced by the matching fragment from the response.

The fragment is located by `data-modal-error-target` on the form, or by the form's own `id`:

```twig
{{ form_start(form, {'attr': {'class': 'modal-open-from-form', 'data-modal-error-target': 'contact-edit-form'}}) }}
    {{ form_widget(form) }}
{{ form_end(form) }}
```

If the response does not contain that fragment, a `modal:error` event is triggered and the original form is left untouched.

## AJAX errors and session expiry

Every AJAX request made by the bundle is cleaned up on failure, so throbbers are always removed and controls are left usable for a retry.

When a request fails, an invalid response is received or a fragment cannot be matched, the bundle triggers a `modal:error` event on `document` with a detail object that includes `reason`, `trigger`, `form` (when applicable), `jqXHR`, `textStatus` and `errorThrown`. Host applications can listen to this event to provide their own error UI. If the listener calls `event.preventDefault()`, the bundle's small built-in alert is not shown.

For session expiry, the host should return one of the safe responses below. A login page returned as HTML 200 will **not** be inserted automatically; it will be treated as an unexpected response and reported through `modal:error`.

- HTTP 401/403 (the bundle emits `modal:error` with `reason: 'http-error'`).
- A JSON `ModalRedirectResponse` such as `{"redirect": "/login"}`.

## Modal lifecycle events

The bundle keeps at most one modal open at a time. If a new modal is requested while another is already open, the active modal is closed and removed before the new markup is inserted, even when both use the same `id`. Clicks that arrive while a request is already in flight are ignored, so rapid double-clicks never create duplicate modals or overlapping AJAX calls.

Two events are fired on `document` so the host can synchronize its own UI:

- `modal:opened` after `shown.bs.modal`, with `{modal, modalId, trigger}`.
- `modal:closed` after `hidden.bs.modal` and after the element has been removed, with `{modalId, trigger}`.

`modalId` is the raw id string; the bundle resolves it with `document.getElementById` and escapes it for jQuery selectors so ids containing `.`, `:` or `[` work correctly.

# Translations

Built-in messages use the `Dyg81ModalBundle` translation domain and ship in these locales:

| Locale | Language | File |
| --- | --- | --- |
| `en` | English | `Dyg81ModalBundle.en.xlf` |
| `es` | Spanish | `Dyg81ModalBundle.es.xlf` |
| `pt_BR` | Brazilian Portuguese | `Dyg81ModalBundle.pt_BR.xlf` |
| `fr` | French | `Dyg81ModalBundle.fr.xlf` |
| `de` | German | `Dyg81ModalBundle.de.xlf` |
| `ja` | Japanese | `Dyg81ModalBundle.ja.xlf` |

File names use Symfony's locale identifiers; the XLIFF `source-language` and `target-language` attributes use the corresponding BCP 47 tags (`pt-BR` for the `pt_BR` locale).

## Fallback

Symfony does not fall back to your default locale automatically. Configure the fallback locale so a missing translation is displayed in the default language instead of the raw key, and so the message modal does not return a 404 for an unknown key:

```yaml
# config/packages/translation.yaml
framework:
    default_locale: en
    translator:
        fallbacks: [en]
```

Set the fallback to your application's default locale. The bundle ships every message in every bundled locale, so fallback matters for locales without a bundle catalogue and for custom keys added by the host.

# Public API

Treat the following as public API. Changing any of them requires a major version bump.

- CSS classes: `modal-open`, `modal-open-confirm`, `modal-open-from-form`, `modal-btn-confirm`, `ajax-progress`, `ajax-progress-throbber`, `ajax-progress-ELEMENTID`, `throbber`, `modal-error-message`.
- Data attributes: `data-modal-id`, `data-modal-href`, `data-modal-error-target`.
- Route names: `dyg81_modal_open_message`, `dyg81_modal_open_confirm`.
- Twig block names: `modalId`, `modalEffects`, `modalBackdrop`, `modalSize`, `modalContent`, `modalTitle`, `modalHeader`, `modalBody`, `modalFooter`.
- JSON response fields: `modal`, `modalId`, `redirect`.
- Template namespace: `@Dyg81Modal`.
- JavaScript global: `modalFunctions`.

# Development

```bash
# Validate the package definition
composer validate --strict

# Lint PHP source files
find src tests -name '*.php' -print0 | xargs -0 -n1 php -l

# Run PHP tests (includes translation file validation)
vendor/bin/phpunit

# Validate translation files
xmllint --noout Resources/translations/Dyg81ModalBundle.*.xlf

# Lint the JavaScript file
node --check Resources/public/js/scripts.js

# Run JavaScript unit tests
npm run test:unit

# Run browser tests (requires Playwright browsers)
npm run test:browser

# Static analysis and code style (tools in tools/quality)
composer --working-dir=tools/quality install
tools/quality/vendor/bin/phpstan analyse --configuration=phpstan.neon
tools/quality/vendor/bin/php-cs-fixer fix --dry-run --diff --config=.php-cs-fixer.php
```

Linting confirms syntax and style; behavior can only be verified inside a consuming Symfony application. From that application, reinstall updated assets with `bin/console assets:install --symlink`.

# License

This bundle is released under the MIT license. See the [LICENSE](LICENSE) file for the full text and upstream attribution.
