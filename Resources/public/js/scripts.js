var modalFunctions = {};

// Loading text exposed for host applications that need a different label.
modalFunctions.loadingText = 'Loading…';

// References to the currently open modal, the trigger that opened it and any
// in-flight request that is fetching modal markup.
modalFunctions.activeModal = null;
modalFunctions.activeTrigger = null;
modalFunctions.pendingRequest = null;
modalFunctions.bindings = [];

/**
 * Add a progress throbber after the element when a request is made.
 */
modalFunctions.addProgressThrobber = function(elem) {
    var div = document.createElement('div');
    div.className = 'ajax-progress ajax-progress-throbber' + (elem.id ? ' ajax-progress-' + elem.id : '');
    div.setAttribute('role', 'status');

    var throbber = document.createElement('div');
    throbber.className = 'throbber';

    var srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = modalFunctions.loadingText;

    div.appendChild(throbber);
    div.appendChild(srText);
    elem.insertAdjacentElement('afterend', div);

    return div;
};

/**
 * Read a response exactly once, based on its Content-Type. Fetch resolves for
 * HTTP errors, so callers check response.ok before consuming the body.
 */
function readResponse(response) {
    var contentType = response.headers.get('content-type') || '';

    if (/application\/json|\+json/i.test(contentType)) {
        return response.json().then(function(payload) {
            return {kind: 'json', payload: payload, response: response};
        }, function(error) {
            throw requestError('parse-error', 'The server response is not valid JSON.', response, error);
        });
    }

    if (/text\/html/i.test(contentType)) {
        return response.text().then(function(html) {
            if (!html.trim()) {
                throw requestError('unexpected-response', 'The server returned an empty response.', response);
            }

            return {kind: 'html', payload: html, response: response};
        });
    }

    throw requestError('unexpected-response', 'The server returned an unsupported content type.', response);
}

/**
 * Build an Error that carries the modal:error reason and response.
 */
function requestError(reason, message, response, cause) {
    var error = cause instanceof Error ? cause : new Error(message);
    error.reason = reason;
    error.response = response || null;

    return error;
}

/**
 * Perform a request and normalize fetch's failure modes.
 *
 * The pending-request mutex is set before the request starts and cleared in
 * the finally path, together with the throbber and the remembered submitter.
 */
modalFunctions.performRequest = function(url, init, cleanup) {
    var record = {controller: new AbortController()};
    var options = Object.assign({signal: record.controller.signal}, init);

    modalFunctions.pendingRequest = record;

    return fetch(url, options).then(function(response) {
        if (!response.ok) {
            throw requestError('http-error', 'HTTP ' + response.status + ' ' + response.statusText, response);
        }

        return readResponse(response);
    }).catch(function(error) {
        if (error && error.reason) {
            throw error;
        }

        if (error && error.name === 'AbortError') {
            throw requestError('abort', 'The request was cancelled.', null, error);
        }

        throw requestError('network', 'The connection failed.', null, error);
    }).finally(function() {
        if (cleanup && cleanup.throbber) {
            cleanup.throbber.remove();
        }
        if (cleanup && cleanup.form) {
            delete cleanup.form._dyg81Submitter;
        }
        if (modalFunctions.pendingRequest === record) {
            modalFunctions.pendingRequest = null;
        }
    });
};

/**
 * Open a new modal from a url.
 */
modalFunctions.openModal = function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Get the link to the modal.
    var href = this.getAttribute('href');
    // Check if a custom modal id should be used.
    var modalId = this.getAttribute('data-modal-id') || 'base-modal';

    // Make the modal request only if a url exists.
    if (!href || modalFunctions.pendingRequest) {
        return;
    }

    var trigger = this;
    var throbber = modalFunctions.addProgressThrobber(trigger);

    modalFunctions.performRequest(href, {method: 'GET', cache: 'no-store'}, {throbber: throbber})
        .then(function(result) {
            if (result.kind !== 'html' || !modalFunctions.isFragment(result.payload)) {
                modalFunctions.emitError({reason: 'unexpected-response', trigger: trigger, response: result.response});
                return;
            }

            modalFunctions.openModalHtml(result.payload, '#' + modalId, trigger);
        })
        .catch(function(error) {
            modalFunctions.emitRequestError(error, {trigger: trigger});
        });
};

/**
 * Open a modal from rendered HTML, optionally replacing an active modal.
 *
 * @param string      html
 *   The rendered modal markup.
 * @param string      modalId
 *   The selector for the modal element (e.g. "#base-modal").
 * @param Element|null trigger
 *   The element that triggered the opening.
 * @param Element|null sourceModal
 *   An active modal that should be closed before the new one is inserted.
 */
modalFunctions.openModalHtml = function(html, modalId, trigger, sourceModal) {
    var modalToClose = sourceModal && sourceModal.nodeType
        ? sourceModal
        : (modalFunctions.activeModal && modalFunctions.activeModal.nodeType ? modalFunctions.activeModal : null);

    if (modalToClose) {
        modalToClose.addEventListener('hidden.bs.modal', function() {
            if (modalFunctions.activeModal === modalToClose) {
                modalFunctions.activeModal = null;
            }
            modalToClose.remove();
            modalFunctions.displayModalHtml(html, modalId, trigger);
        }, {once: true});

        bootstrap.Modal.getOrCreateInstance(modalToClose).hide();
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
        existing.remove();
    }

    var parsed = new DOMParser().parseFromString(html, 'text/html');
    while (parsed.body.firstChild) {
        document.body.appendChild(document.adoptNode(parsed.body.firstChild));
    }

    var modal = document.getElementById(id);

    if (!modal) {
        modalFunctions.emitError({reason: 'unexpected-response', trigger: trigger});
        return;
    }

    modalFunctions.activeModal = modal;
    modalFunctions.activeTrigger = trigger || null;

    if (trigger) {
        modal._dyg81ConfirmTrigger = trigger;
    }

    // Only the first form in a modal is submitted over AJAX.
    var form = modal.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(event) {
            modalFunctions.submitModalForm(event, form, id);
        });
    }

    modal.addEventListener('shown.bs.modal', function() {
        document.dispatchEvent(new CustomEvent('modal:opened', {
            detail: {
                modal: modal,
                modalId: id,
                trigger: trigger || null,
            },
        }));
    }, {once: true});

    modal.addEventListener('hidden.bs.modal', function() {
        if (modalFunctions.activeModal === modal) {
            modalFunctions.activeModal = null;
        }
        modal.remove();
        document.dispatchEvent(new CustomEvent('modal:closed', {
            detail: {
                modalId: id,
                trigger: trigger || null,
            },
        }));
    }, {once: true});

    bootstrap.Modal.getOrCreateInstance(modal).show();
};

/**
 * Submit the first form in an open modal over AJAX.
 */
modalFunctions.submitModalForm = function(event, form, modalId) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (modalFunctions.pendingRequest) {
        return;
    }

    var submitter = modalFunctions.getSubmitter(form, event);
    var throbberTarget = submitter || getFirstSubmitControl(form);
    var throbber = modalFunctions.addProgressThrobber(throbberTarget);
    var request = modalFunctions.buildFormRequest(form, submitter);
    var sourceModal = form.closest('.modal');

    modalFunctions.performRequest(request.url, request.init, {throbber: throbber, form: form})
        .then(function(result) {
            modalFunctions.handleFormResponse(result, {
                form: form,
                trigger: submitter || throbberTarget,
                sourceModal: sourceModal,
                modalId: modalId,
                fromModal: true,
            });
        })
        .catch(function(error) {
            modalFunctions.emitRequestError(error, {form: form, trigger: submitter || throbberTarget});
        });
};

/**
 * Open a confirm modal which should contain a confirm button and after
 * that button is pressed the previous action will be done. (works with links
 * or forms)
 */
modalFunctions.openConfirmModal = function(event, options) {
    options = options || {};

    // Check if the click was made in the browser or by us.
    if (!options.confirmButtonPressed && !this._dyg81ConfirmPressed) {
        event.preventDefault();
        event.stopImmediatePropagation();

        var element = this;
        var modalId = element.getAttribute('data-modal-id') || 'base-modal';
        // Get the link for the modal from the data attribute.
        var modalHref = element.getAttribute('data-modal-href');

        if (!modalHref || modalFunctions.pendingRequest) {
            return;
        }

        var throbber = modalFunctions.addProgressThrobber(element);

        modalFunctions.performRequest(modalHref, {method: 'GET', cache: 'no-store'}, {throbber: throbber})
            .then(function(result) {
                if (result.kind !== 'html' || !modalFunctions.isFragment(result.payload)) {
                    modalFunctions.emitError({reason: 'unexpected-response', trigger: element, response: result.response});
                    return;
                }

                modalFunctions.openModalHtml(result.payload, '#' + modalId, element);
            })
            .catch(function(error) {
                modalFunctions.emitRequestError(error, {trigger: element});
            });
    } else {
        // Only anchors are redirected; other triggers are a no-op.
        if (this.nodeName.toLowerCase() === 'a') {
            window.open(this.getAttribute('href'), this.getAttribute('target') || '_self');
        }
    }
};

/**
 * Open a modal after a successful form submission.
 */
modalFunctions.openModalFromForm = function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (modalFunctions.pendingRequest) {
        return;
    }

    var form = this;
    var submitter = modalFunctions.getSubmitter(form, event);
    var throbberTarget = submitter || getFirstSubmitControl(form);
    var throbber = modalFunctions.addProgressThrobber(throbberTarget);
    var request = modalFunctions.buildFormRequest(form, submitter);
    var sourceModal = form.closest('.modal');

    modalFunctions.performRequest(request.url, request.init, {throbber: throbber, form: form})
        .then(function(result) {
            modalFunctions.handleFormResponse(result, {
                form: form,
                trigger: submitter || throbberTarget,
                sourceModal: sourceModal,
                modalId: null,
                fromModal: false,
            });
        })
        .catch(function(error) {
            modalFunctions.emitRequestError(error, {form: form, trigger: submitter || throbberTarget});
        });
};

/**
 * Apply the response protocol to a submitted form.
 *
 * JSON opens the next modal or redirects. HTML is treated as a validation
 * re-render: it replaces the modal contents, or the originating page form.
 */
modalFunctions.handleFormResponse = function(result, context) {
    var detail = {form: context.form, trigger: context.trigger};

    if (result.kind === 'json') {
        var data = result.payload;
        var isObject = data !== null && typeof data === 'object';

        if (isObject && data.modal && data.redirect) {
            // A response cannot both open a modal and redirect.
            modalFunctions.emitError(Object.assign({reason: 'unexpected-response', response: result.response}, detail));
            return;
        }

        if (isObject && data.modal) {
            if (context.fromModal) {
                modalFunctions.openModalHtml(data.modal, '#' + (data.modalId || 'base-modal'), context.trigger, context.sourceModal);
            } else {
                modalFunctions.handleOpenResponses(data, context.sourceModal, context.trigger);
            }
            return;
        }

        if (isObject && data.redirect) {
            window.location.href = data.redirect;
            return;
        }

        modalFunctions.emitError(Object.assign({reason: 'unexpected-response', response: result.response}, detail));
        return;
    }

    if (!modalFunctions.isFragment(result.payload)) {
        modalFunctions.emitError(Object.assign({reason: 'unexpected-response', response: result.response}, detail));
        return;
    }

    if (context.fromModal) {
        modalFunctions.openModalHtml(result.payload, '#' + context.modalId, context.trigger, context.sourceModal);
    } else {
        modalFunctions.replacePageForm(context.form, result.payload, detail);
    }
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
};

/**
 * Remember which submit button initiated a form submission.
 */
modalFunctions.recordSubmitter = function(event) {
    var element = event.target && event.target.closest ? event.target.closest('button, input') : null;

    if (!element) {
        return;
    }

    var form = element.form || element.closest('form');
    if (!form) {
        return;
    }

    var type = (element.getAttribute('type') || (element.tagName === 'BUTTON' ? 'submit' : 'text')).toLowerCase();
    if (type !== 'submit' && type !== 'image') {
        return;
    }

    form._dyg81Submitter = element;
};

/**
 * Return the submit button that initiated the current form submission.
 */
modalFunctions.getSubmitter = function(form, event) {
    return event && event.submitter ? event.submitter : (form._dyg81Submitter || null);
};

/**
 * Return the first submit control in a form, or the form itself.
 */
function getFirstSubmitControl(form) {
    return form.querySelector('button[type="submit"], input[type="submit"], button:not([type])') || form;
}

/**
 * Build the fetch URL and options for a form submission.
 */
modalFunctions.buildFormRequest = function(form, submitter) {
    var method = (form.getAttribute('method') || 'GET').toUpperCase();
    var action = form.getAttribute('action') || window.location.href;

    if (method === 'GET') {
        var params = new URLSearchParams();

        new FormData(form).forEach(function(value, name) {
            // File inputs are not serializable into a query string.
            if (typeof value === 'string') {
                params.append(name, value);
            }
        });

        if (submitter && submitter.name) {
            params.append(submitter.name, submitter.value);
        }

        return {
            url: action + (action.indexOf('?') === -1 ? '?' : '&') + params.toString(),
            init: {method: 'GET', cache: 'no-store'},
        };
    }

    var formData = new FormData(form);
    if (submitter && submitter.name) {
        formData.append(submitter.name, submitter.value);
    }

    return {url: action, init: {method: method, body: formData, cache: 'no-store'}};
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
        modalFunctions.emitError(Object.assign({reason: 'unexpected-response'}, detail));
        return;
    }

    var targetId = form.getAttribute('data-modal-error-target') || form.id;

    if (!targetId) {
        modalFunctions.emitError(Object.assign({reason: 'missing-error-target'}, detail));
        return;
    }

    var parsed = new DOMParser().parseFromString(html, 'text/html');
    var replacement = parsed.getElementById(targetId);

    if (!replacement) {
        modalFunctions.emitError(Object.assign({reason: 'missing-error-target'}, detail));
        return;
    }

    form.replaceWith(document.importNode(replacement, true));
};

/**
 * Check whether a response looks like a modal fragment instead of a full
 * document. Endpoints that expect fragments should reject complete HTML pages.
 */
modalFunctions.isFragment = function(html) {
    var trimmed = typeof html === 'string' ? html.trim() : '';

    return trimmed.length > 0
        && !/^<!DOCTYPE/i.test(trimmed)
        && !/^<html/i.test(trimmed);
};

/**
 * Emit a modal:error event and, unless a host listener prevents it, show a
 * small non-intrusive message to the user.
 */
modalFunctions.emitError = function(detail) {
    var response = detail.response || null;
    var data = {
        reason: detail.reason || 'unexpected-response',
        trigger: detail.trigger || null,
        form: detail.form || null,
        response: response,
        error: detail.error || null,
        status: detail.status !== undefined ? detail.status : (response ? response.status : null),
        statusText: detail.statusText !== undefined ? detail.statusText : (response ? response.statusText : ''),
    };

    var proceed = document.dispatchEvent(new CustomEvent('modal:error', {
        detail: data,
        cancelable: true,
    }));

    if (proceed) {
        modalFunctions.showError(data);
    }
};

/**
 * Normalize a failed fetch into the modal:error detail shape.
 */
modalFunctions.emitRequestError = function(error, detail) {
    var response = error && error.response ? error.response : null;

    modalFunctions.emitError(Object.assign({
        reason: error && error.reason ? error.reason : 'network',
        response: response,
        error: error && error.name ? error : new Error('The request failed.'),
        status: response ? response.status : null,
        statusText: response ? response.statusText : '',
    }, detail));
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

    var alert = document.createElement('div');
    alert.className = 'modal-error-message alert alert-danger';
    alert.setAttribute('role', 'alert');
    alert.textContent = message;

    var previous = document.querySelector('.modal-error-message');
    if (previous) {
        previous.remove();
    }

    document.body.appendChild(alert);

    setTimeout(function() {
        alert.remove();
    }, 5000);
};

/**
 * Bind a delegated handler to a root. Roots are tracked so repeated calls
 * replace only this bundle's listeners, never the host's handlers.
 */
function bind(root, type, selector, handler, controller) {
    root.addEventListener(type, function(event) {
        var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
        var match = target && target.closest ? target.closest(selector) : null;

        if (!match || (root !== document && !root.contains(match))) {
            return;
        }

        handler.call(match, event);
    }, {signal: controller.signal});
}

/**
 * Bind the handlers to links and forms.
 *
 * @param baseElement
 *   A selector string or DOM element to use as the delegation root. Defaults
 *   to document so that dynamically inserted elements are also handled.
 *   Calling this repeatedly on the same root removes the previous bundle
 *   handlers before re-binding, preventing duplicate requests.
 */
modalFunctions.modifyElements = function(baseElement) {
    var root;

    if (baseElement == null) {
        root = document;
    } else if (typeof baseElement === 'string') {
        root = document.querySelector(baseElement);
    } else if (baseElement.nodeType === 1 || baseElement.nodeType === 9) {
        root = baseElement;
    } else {
        return;
    }

    if (!root) {
        return;
    }

    modalFunctions.bindings = modalFunctions.bindings.filter(function(binding) {
        if (binding.root === root || (binding.root !== document && !binding.root.isConnected)) {
            binding.controller.abort();
            return false;
        }

        return true;
    });

    var controller = new AbortController();
    modalFunctions.bindings.push({root: root, controller: controller});

    // The modal-open class can be put on any clickable element.
    // The element should have the href attribute set, which should return a modal template.
    // An optional data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    // The href test keeps Bootstrap's body.modal-open class out of this handler.
    bind(root, 'click', '.modal-open[href]', modalFunctions.openModal, controller);

    // The modal-open-confirm class can be put on any clickable element.
    // The element should have the data-modal-href attribute set to a url
    // which returns a modal template.
    // An optional data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    bind(root, 'click', '.modal-open-confirm', modalFunctions.openConfirmModal, controller);

    // When a confirm modal is open, pressing its confirm button should re-trigger
    // the action of the element that originally opened the modal.
    bind(root, 'click', '.modal-btn-confirm', modalFunctions.confirmModalButton, controller);

    // Remember the submit button used for each form so it can be included in
    // the AJAX payload.
    root.addEventListener('click', modalFunctions.recordSubmitter, {signal: controller.signal});

    // The modal-open-from-form class can be used on a form element.
    // If the form is successfully submitted, a response of type ModalOpenResponse
    // should be returned and a modal will open from the rendered HTML in the response.
    // The response can include normal modals or form modals.
    bind(root, 'submit', '.modal-open-from-form', modalFunctions.openModalFromForm, controller);
};

/**
 * Re-trigger the original action of the element that opened the confirm modal.
 */
modalFunctions.confirmModalButton = function(event) {
    event.preventDefault();

    var modal = this.closest('.modal');
    var trigger = modal && modal._dyg81ConfirmTrigger;

    if (trigger) {
        modalFunctions.openConfirmModal.call(trigger, event, {confirmButtonPressed: true});
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        modalFunctions.modifyElements();
    });
} else {
    modalFunctions.modifyElements();
}
