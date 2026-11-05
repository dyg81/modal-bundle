var modalFunctions = {};

// Loading text exposed for host applications that need a different label.
modalFunctions.loadingText = 'Loading…';

/**
 * Add a progress throbber after the element when an ajax request is made.
 */
modalFunctions.addProgressThrobber = function(elem) {
    var divClass = '';

    if (elem.attr('id')) {
        divClass = ' ajax-progress-' + elem.attr('id');
    }

    var div = $('<div>', {
        'class': 'ajax-progress ajax-progress-throbber' + divClass,
        'role': 'status'
    });
    var throbber = $('<div>', {'class': 'throbber'});
    var srText = $('<span>', {'class': 'sr-only'}).text(modalFunctions.loadingText);
    div.append(throbber).append(srText);
    elem.after(div);

    return div;
};

/**
 * Open a new modal from a url.
 */
modalFunctions.openModal = function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Get the link to the modal.
    var href = $(this).attr('href');
    // Check if a custom modal id should be used.
    var modalId = $(this).attr('data-modal-id') || 'base-modal';

    // Make the modal request only if a url exists.
    if (href) {
        var throbber = modalFunctions.addProgressThrobber($(this));

        $.ajax({
           url: href,
        }).done(function(data) {
            throbber.remove();
            modalFunctions.displayModal(data, '#' + modalId);
        });
    }
};

/**
 * Helper function which opens a new modal and binds the necessary handlers to it.
 */
modalFunctions.displayModal = function(data, modalId) {
    $("body").append(data);

    var modal = $(modalId);

    modal.on('show.bs.modal', modalFunctions.bindFormModalShow(modalId));

    modal.on('hidden.bs.modal', function() {
        $("body " + modalId).remove();
    });

    modal.modal();
};

/**
 * Bind the submit handler to the first form in a modal
 */
modalFunctions.bindFormModalShow = function(modalId) {
    return function() {
        var modal = $(modalId);

        $(this).find('form:first').submit(function(event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            var form = this;
            var submitter = modalFunctions.getSubmitter(form, event);
            var throbberTarget = submitter.length ? submitter : $(form).find(':submit:first');
            var throbber = modalFunctions.addProgressThrobber(throbberTarget.length ? throbberTarget : $(form));

            var formData = new FormData(form);
            if (submitter.length && submitter.attr('name')) {
                formData.append(submitter.attr('name'), submitter.val());
            }

            // When submitting the form, do a request and see if we get
            // a redirect response, which should indicate that the form
            // was successfully submitted.
            $.ajax({
                url: $(form).attr('action'),
                type: $(form).attr('method'),
                data: formData,
                contentType: false,
                processData: false,
                cache: false,
            }).done(function(data) {
                var isJson = typeof data === 'object' && data !== null;

                if (isJson && data.modal && data.redirect) {
                    // A response cannot both open a modal and redirect.
                    return;
                }

                if (isJson && data.modal) {
                    // The form was submitted successfully and opened another modal.
                    modal.modal('hide');
                    modalFunctions.handleOpenResponses(data);
                } else if (isJson && data.redirect) {
                    // The form was successfully submitted, we should redirect.
                    window.location.href = data.redirect;
                } else if (typeof data === 'string') {
                    // If the form was not successfully submitted,
                    // reload the modal with the new data, which will also
                    // include any form errors.
                    modal.modal('hide');
                    modalFunctions.displayModal(data, modalId);
                }
            }).always(function() {
                throbber.remove();
                $(form).removeData('dyg81-submitter');
            });
        });
    };
};

/**
 * Open a confirm modal which should contain a confirm button and after
 * that button is pressed the previous action will be done. (works with links
 * or forms)
 */
modalFunctions.openConfirmModal = function(event, options) {
    options = options || {};

    // Check if the click was made in the browser or by us.
    if (!options.confirmButtonPressed) {
        event.preventDefault();
        event.stopImmediatePropagation();

        var element = $(this);
        var modalId = element.attr('data-modal-id') || 'base-modal';
        // Get the link for the modal from the data attribute.
        var modalHref = element.attr('data-modal-href');

        if (modalHref) {
            var throbber = modalFunctions.addProgressThrobber(element);

            $.ajax({
               url: modalHref,
            }).done(function(data) {
                throbber.remove();

                $("body").append(data);

                var modal = $('#' + modalId);

                modal.data('dyg81-confirm-trigger', element);
                modal.on('hidden.bs.modal', function() {
                    modal.remove();
                });

                modal.modal();
            });
        }
    } else {
        var elementType = $(this).prop('nodeName');

        // If the element was a link, redirect the window to it's url.
        // This has to be done because element.trigger('click') does not
        // work properly for the anchor element.
        if (elementType.toLowerCase() === 'a') {
            // Provide integration with the Dynamic Page Bundle.
            // Check if we should do the redirect, let the ModalBundle handle it
            // or let the DynamicPageBundle handle it.
            if ($(this).hasClass('do-redirect')
                || typeof dynamicPageFunctions === 'undefined'
                || !jQuery.isFunction(dynamicPageFunctions.getTemplate)) {
                window.open($(this).attr('href'), $(this).attr('target') || '_self');
            }
        }
    }
};

/**
 * Open a modal after a successful form submission.
 */
modalFunctions.openModalFromForm = function(event, options) {
    event.preventDefault();
    event.stopImmediatePropagation();

    var form = this;
    var submitter = modalFunctions.getSubmitter(form, event);
    var throbberTarget = submitter.length ? submitter : $(form).find(':submit:first');
    var throbber = modalFunctions.addProgressThrobber(throbberTarget.length ? throbberTarget : $(form));

    var action = $(form).attr('action') || '';
    var method = ($(form).attr('method') || 'GET').toUpperCase();
    var ajaxOptions = {
        url: action,
        type: method,
        cache: false,
    };

    if (method === 'GET') {
        var fields = $(form).serializeArray();
        if (submitter.length && submitter.attr('name')) {
            fields.push({name: submitter.attr('name'), value: submitter.val()});
        }
        ajaxOptions.url = action + (action.indexOf('?') === -1 ? '?' : '&') + $.param(fields);
    } else {
        var formData = new FormData(form);
        if (submitter.length && submitter.attr('name')) {
            formData.append(submitter.attr('name'), submitter.val());
        }
        ajaxOptions.data = formData;
        ajaxOptions.contentType = false;
        ajaxOptions.processData = false;
    }

    // When submitting the form, do a request and see if we get a
    // ModalOpenResponse, which should indicate that the form was successfully
    // submitted and a modal should be opened from the rendered HTML.
    $.ajax(ajaxOptions).done(function(data) {
        var isJson = typeof data === 'object' && data !== null;

        if (isJson && data.modal && data.redirect) {
            // A response cannot both open a modal and redirect.
            return;
        }

        if (isJson && data.modal) {
            modalFunctions.handleOpenResponses(data);
        } else if (isJson && data.redirect) {
            window.location.href = data.redirect;
        } else if (typeof data === 'string') {
            // Validation errors were returned: replace the originating form
            // with the matching fragment from the response instead of reloading
            // the whole page.
            modalFunctions.replacePageForm(form, data);
        }
    }).always(function() {
        throbber.remove();
        $(form).removeData('dyg81-submitter');
    });
};

/**
 * Handle the ModalOpenResponse and DynamicOpenResponse that get returned after a form is successfully submitted.
 */
modalFunctions.handleOpenResponses = function(data) {
    if (typeof data !== 'object' || data === null || !data.modal || data.redirect) {
        return;
    }

	// If the DynamicPageBundle is installed and the returned response
    // is of type DynamicOpenResponse, then let that bundle
    // update the elements of the page first.
    if (data.dynamic && typeof dynamicPageFunctions !== 'undefined'
        && jQuery.isFunction(dynamicPageFunctions.handleResponse)) {
        dynamicPageFunctions.handleResponse(data.dynamic);
    }

    var modalId = '#' + (data.modalId || 'base-modal');

    $(modalId).modal('hide');

    modalFunctions.displayModal(data.modal, modalId);
}

/**
 * Remember which submit button initiated a form submission.
 */
modalFunctions.recordSubmitter = function() {
    var button = $(this);
    button.closest('form').data('dyg81-submitter', button);
};

/**
 * Return the submit button that initiated the current form submission.
 */
modalFunctions.getSubmitter = function(form, event) {
    var submitter = null;

    if (event.originalEvent && event.originalEvent.submitter) {
        submitter = $(event.originalEvent.submitter);
    }

    if (!submitter || !submitter.length) {
        submitter = $(form).data('dyg81-submitter');
    }

    return submitter || $();
};

/**
 * Replace a page form with the matching fragment from a validation response.
 *
 * The response is parsed without executing scripts. The form to replace is
 * identified by `data-modal-error-target` or, failing that, by its own `id`.
 * If either side is missing, a `modal:error` event is triggered and the
 * original form is left untouched.
 */
modalFunctions.replacePageForm = function(form, html) {
    var $form = $(form);
    var targetId = $form.attr('data-modal-error-target') || $form.attr('id');

    if (!targetId) {
        $(document).trigger('modal:error', [{
            reason: 'missing-error-target',
            form: form,
        }]);
        return;
    }

    var $parsed = $('<div>').append($.parseHTML(html, document, false));
    var $replacement = $();

    $parsed.contents().each(function() {
        var $node = $(this);

        if ($node.attr('id') === targetId) {
            $replacement = $node;
            return false;
        }

        var $found = $node.find('[id]').filter(function() {
            return $(this).attr('id') === targetId;
        });

        if ($found.length) {
            $replacement = $found.first();
            return false;
        }
    });

    if (!$replacement.length) {
        $(document).trigger('modal:error', [{
            reason: 'missing-error-target',
            form: form,
        }]);
        return;
    }

    $form.replaceWith($replacement);
};

/**
 * Bind the handlers to links and forms.
 *
 * @param baseElement
 *   A selector string, DOM element or jQuery object to use as the delegation
 *   root. Defaults to document so that dynamically inserted elements are also
 *   handled. Calling this repeatedly on the same root removes the previous
 *   bundle handlers before re-binding, preventing duplicate AJAX requests.
 */
modalFunctions.modifyElements = function(baseElement) {
    var $root = baseElement ? $(baseElement) : $(document);

    $root.off('.dyg81Modal');

    // The modal-open class can be put on any clickable element.
    // The element should have the href attribute set, which should return a modal template.
    // An optional data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    $root.on('click.dyg81Modal', '.modal-open', modalFunctions.openModal);

    // The modal-open-confirm class can be put on any clickable element.
    // The element should have the data-modal-href attribute set to a url
    // which returns a modal template.
    // An optional data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    $root.on('click.dyg81Modal', '.modal-open-confirm', modalFunctions.openConfirmModal);

    // When a confirm modal is open, pressing its confirm button should re-trigger
    // the action of the element that originally opened the modal.
    $root.on('click.dyg81Modal', '.modal-btn-confirm', modalFunctions.confirmModalButton);

    // Remember the submit button used for each form so it can be included in
    // the AJAX payload even when the browser does not provide
    // event.originalEvent.submitter.
    $root.on('click.dyg81Modal', 'form :submit', modalFunctions.recordSubmitter);

    // The modal-open-from-form class can be used on a form element.
    // If the form is successfully submitted, a response of type ModalOpenResponse
    // should be returned and a modal will open from the rendered HTML in the response.
    // The response can include normal modals or form modals.
    $root.on('submit.dyg81Modal', '.modal-open-from-form', modalFunctions.openModalFromForm);
};

/**
 * Re-trigger the original action of the element that opened the confirm modal.
 */
modalFunctions.confirmModalButton = function(event) {
    event.preventDefault();

    var modal = $(this).closest('.modal');
    var trigger = modal.data('dyg81-confirm-trigger');

    if (trigger && trigger.length) {
        trigger.trigger('click', {'confirmButtonPressed': true});
    }
};

$(document).ready(function () {
    modalFunctions.modifyElements();
});
