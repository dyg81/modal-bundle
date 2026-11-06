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
        if (modalFunctions.pendingRequest) {
            return;
        }

        var trigger = $(this);
        var throbber = modalFunctions.addProgressThrobber(trigger);
        var request = $.ajax({
            url: href,
        });

        modalFunctions.pendingRequest = request;
        modalFunctions.trackRequest(request, {
            throbber: throbber,
            trigger: trigger,
            complete: function() {
                modalFunctions.pendingRequest = null;
            },
        }).done(function(data) {
            if (!modalFunctions.isFragment(data)) {
                modalFunctions.emitError({
                    reason: 'unexpected-response',
                    trigger: trigger,
                });
                return;
            }
            modalFunctions.openModalHtml(data, '#' + modalId, trigger);
        });
    }
};

// References to the currently open modal, the trigger that opened it and any
// in-flight AJAX request that is fetching modal markup.
modalFunctions.activeModal = null;
modalFunctions.activeTrigger = null;
modalFunctions.pendingRequest = null;

/**
 * Open a modal from rendered HTML, optionally replacing an active modal.
 *
 * @param string      html
 *   The rendered modal markup.
 * @param string      modalId
 *   The selector for the modal element (e.g. "#base-modal").
 * @param jQuery|null trigger
 *   The element that triggered the opening.
 * @param jQuery|null sourceModal
 *   An active modal that should be closed before the new one is inserted.
 */
modalFunctions.openModalHtml = function(html, modalId, trigger, sourceModal) {
    var modalToClose = sourceModal && sourceModal.length
        ? sourceModal
        : (modalFunctions.activeModal && modalFunctions.activeModal.length ? modalFunctions.activeModal : null);

    if (modalToClose) {
        modalToClose.one('hidden.bs.modal', function() {
            if (modalFunctions.activeModal && modalFunctions.activeModal.is(modalToClose)) {
                modalFunctions.activeModal = null;
            }
            modalToClose.remove();
            modalFunctions.displayModalHtml(html, modalId, trigger);
        }).modal('hide');
    } else {
        modalFunctions.displayModalHtml(html, modalId, trigger);
    }
};

/**
 * Insert modal markup into the page and bind its lifecycle handlers.
 */
modalFunctions.displayModalHtml = function(html, modalId, trigger) {
    var id = modalId.replace(/^#/, '');
    var existing = document.getElementById(id);

    if (existing) {
        $(existing).remove();
    }

    $("body").append(html);

    var modal = $('#' + $.escapeSelector(id));

    modalFunctions.activeModal = modal;
    modalFunctions.activeTrigger = trigger || null;

    if (trigger && trigger.length) {
        modal.data('dyg81-confirm-trigger', trigger);
    }

    modal.one('show.bs.modal', modalFunctions.bindFormModalShow(modalId));

    modal.one('shown.bs.modal', function() {
        $(document).trigger('modal:opened', [{
            modal: modal,
            modalId: id,
            trigger: modalFunctions.activeTrigger,
        }]);
    });

    modal.one('hidden.bs.modal', function() {
        if (modalFunctions.activeModal && modalFunctions.activeModal.is(modal)) {
            modalFunctions.activeModal = null;
        }
        modal.remove();
        $(document).trigger('modal:closed', [{
            modalId: id,
            trigger: modalFunctions.activeTrigger,
        }]);
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

            if (modalFunctions.pendingRequest) {
                return;
            }

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
            var request = $.ajax({
                url: $(form).attr('action'),
                type: $(form).attr('method'),
                data: formData,
                contentType: false,
                processData: false,
                cache: false,
            });

            modalFunctions.pendingRequest = request;
            modalFunctions.trackRequest(request, {
                throbber: throbber,
                form: form,
                trigger: throbberTarget,
                complete: function() {
                    modalFunctions.pendingRequest = null;
                },
            }).done(function(data) {
                var isJson = typeof data === 'object' && data !== null;
                var detail = {form: form, trigger: throbberTarget};

                if (isJson && data.modal && data.redirect) {
                    // A response cannot both open a modal and redirect.
                    modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
                    return;
                }

                if (isJson && data.modal) {
                    // The form was submitted successfully and opened another modal.
                    modalFunctions.openModalHtml(data.modal, '#' + (data.modalId || 'base-modal'), throbberTarget, modal);
                } else if (isJson && data.redirect) {
                    // The form was successfully submitted, we should redirect.
                    window.location.href = data.redirect;
                } else if (typeof data === 'string') {
                    // If the form was not successfully submitted,
                    // reload the modal with the new data, which will also
                    // include any form errors.
                    if (!modalFunctions.isFragment(data)) {
                        modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
                        return;
                    }
                    modalFunctions.openModalHtml(data, modalId, throbberTarget, modal);
                } else {
                    modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
                }
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
            if (modalFunctions.pendingRequest) {
                return;
            }

            var throbber = modalFunctions.addProgressThrobber(element);
            var request = $.ajax({
                url: modalHref,
            });

            modalFunctions.pendingRequest = request;
            modalFunctions.trackRequest(request, {
                throbber: throbber,
                trigger: element,
                complete: function() {
                    modalFunctions.pendingRequest = null;
                },
            }).done(function(data) {
                if (!modalFunctions.isFragment(data)) {
                    modalFunctions.emitError({
                        reason: 'unexpected-response',
                        trigger: element,
                    });
                    return;
                }

                modalFunctions.openModalHtml(data, '#' + modalId, element);
            });
        }
    } else {
        var elementType = $(this).prop('nodeName');

        // If the element was a link, redirect the window to it's url.
        // This has to be done because element.trigger('click') does not
        // work properly for the anchor element.
        if (elementType.toLowerCase() === 'a') {
            window.open($(this).attr('href'), $(this).attr('target') || '_self');
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

    if (modalFunctions.pendingRequest) {
        return;
    }

    var sourceModal = $(form).closest('.modal');

    // When submitting the form, do a request and see if we get a
    // ModalOpenResponse, which should indicate that the form was successfully
    // submitted and a modal should be opened from the rendered HTML.
    var request = $.ajax(ajaxOptions);

    modalFunctions.pendingRequest = request;
    modalFunctions.trackRequest(request, {
        throbber: throbber,
        form: form,
        trigger: throbberTarget,
        complete: function() {
            modalFunctions.pendingRequest = null;
        },
    }).done(function(data) {
        var isJson = typeof data === 'object' && data !== null;
        var detail = {form: form, trigger: throbberTarget};

        if (isJson && data.modal && data.redirect) {
            // A response cannot both open a modal and redirect.
            modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
            return;
        }

        if (isJson && data.modal) {
            modalFunctions.handleOpenResponses(data, sourceModal, throbberTarget);
        } else if (isJson && data.redirect) {
            window.location.href = data.redirect;
        } else if (typeof data === 'string') {
            // Validation errors were returned: replace the originating form
            // with the matching fragment from the response instead of reloading
            // the whole page.
            if (!modalFunctions.isFragment(data)) {
                modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
                return;
            }
            modalFunctions.replacePageForm(form, data, detail);
        } else {
            modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
        }
    });
};

/**
 * Handle a ModalOpenResponse that is returned after a form is successfully
 * submitted. Returns true when the payload is valid and a modal is opened.
 */
modalFunctions.handleOpenResponses = function(data, sourceModal, trigger) {
    if (typeof data !== 'object' || data === null || !data.modal || data.redirect) {
        return false;
    }

    modalFunctions.openModalHtml(data.modal, '#' + (data.modalId || 'base-modal'), trigger, sourceModal);

    return true;
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
modalFunctions.replacePageForm = function(form, html, detail) {
    detail = detail || {form: form};

    if (!modalFunctions.isFragment(html)) {
        modalFunctions.emitError($.extend({reason: 'unexpected-response'}, detail));
        return;
    }

    var $form = $(form);
    var targetId = $form.attr('data-modal-error-target') || $form.attr('id');

    if (!targetId) {
        modalFunctions.emitError($.extend({reason: 'missing-error-target'}, detail));
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
        modalFunctions.emitError($.extend({reason: 'missing-error-target'}, detail));
        return;
    }

    $form.replaceWith($replacement);
};

/**
 * Check whether a response looks like a modal fragment instead of a full
 * document. Endpoints that expect fragments should reject complete HTML pages.
 */
modalFunctions.isFragment = function(html) {
    var trimmed = $.trim(typeof html === 'string' ? html : '');

    return trimmed.length > 0
        && !/^<!DOCTYPE/i.test(trimmed)
        && !/^<html/i.test(trimmed);
};

/**
 * Emit a modal:error event and, unless a host listener prevents it, show a
 * small non-intrusive message to the user.
 */
modalFunctions.emitError = function(detail) {
    var event = $.Event('modal:error');
    $(document).trigger(event, [detail]);

    if (!event.isDefaultPrevented()) {
        modalFunctions.showError(detail);
    }
};

/**
 * Display a short, dismissible error message. Host applications can suppress
 * this by calling event.preventDefault() in a modal:error listener.
 */
modalFunctions.showError = function(detail) {
    var messages = {
        'timeout': 'The request timed out. Please try again.',
        'network': 'The connection failed. Please check your network and try again.',
        'abort': 'The request was cancelled.',
        'parse-error': 'The server response could not be parsed.',
        'unexpected-response': 'The server returned an unexpected response.',
        'missing-error-target': 'The form could not be updated because the response did not contain the expected fragment.',
    };
    var message = messages[detail.reason] || 'An unexpected error occurred. Please try again.';

    var $alert = $('<div>', {
        'class': 'modal-error-message alert alert-danger',
        'role': 'alert',
    }).text(message);

    $('.modal-error-message').remove();
    $('body').append($alert);

    setTimeout(function() {
        $alert.remove();
    }, 5000);
};

/**
 * Attach shared failure and cleanup handlers to a jQuery AJAX request.
 */
modalFunctions.trackRequest = function(jqXHR, detail) {
    detail = detail || {};

    return jqXHR.fail(function(jqXHRObj, textStatus, errorThrown) {
        var reason = 'http-error';

        if (textStatus === 'timeout') {
            reason = 'timeout';
        } else if (textStatus === 'abort') {
            reason = 'abort';
        } else if (textStatus === 'parsererror') {
            reason = 'parse-error';
        } else if (jqXHRObj.status === 0) {
            reason = 'network';
        } else if (jqXHRObj.status >= 400) {
            reason = 'http-error';
        }

        modalFunctions.emitError($.extend({
            reason: reason,
            jqXHR: jqXHRObj,
            textStatus: textStatus,
            errorThrown: errorThrown,
        }, detail));
    }).always(function() {
        if (detail.throbber) {
            detail.throbber.remove();
        }
        if (detail.form) {
            $(detail.form).removeData('dyg81-submitter');
        }
        if (typeof detail.complete === 'function') {
            detail.complete();
        }
    });
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
