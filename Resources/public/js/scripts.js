var modalFunctions = {};

/**
 * Add a progress throbber after the element when an ajax request is made.
 */
modalFunctions.addProgressThrobber = function(elem) {
    var divClass = '';

    if (elem.attr('id')) {
        divClass = ' ajax-progress-' + elem.attr('id');
    }

    var div = $("<div>", {"class": "ajax-progress ajax-progress-throbber" + divClass});
    var throbber = $("<div>", {"class": "throbber"});
    div.append(throbber);
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

            var elem = $(this).find(':focus');
            var throbber = modalFunctions.addProgressThrobber(elem);

            var formData = new FormData(this);
            formData.append('submit', elem.attr('value'));

            // When submitting the form, do a request and see if we get
            // a redirect response, which should indicate that the form
            // was successfully submitted.
            $.ajax({
                url: $(this).attr('action'),
                type: $(this).attr('method'),
                data: formData,
                contentType: false,
                processData: false,
                cache: false,
            }).done(function(data) {
                throbber.remove();

                if (data.modal) {
                	// The form was submitted successfully and opened another modal.
                	modal.modal('hide');
                	throbber.remove();
                	modalFunctions.handleOpenResponses(data);
                } else if (data.dynamic && typeof dynamicPageFunctions !== 'undefined'
                    && jQuery.isFunction(dynamicPageFunctions.getTemplateAjax)) {
                	// Handle dynamic page response, if the Dynamic Page Bundle is used.
                    modal.modal('hide');
                    dynamicPageFunctions.handleResponse(data.dynamic);
                } else if (data.redirect) {
                    // The form was successfully submitted, we should redirect.
                    window.location.href = data.redirect;
                } else {
                    // If the form was not successfully submitted,
                    // reload the modal with the new data, which will also
                    // include any form errors.
                    modal.modal('hide');
                    modalFunctions.displayModal(data, modalId);
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
        var modalId = $(this).attr('data-modal-id') || 'base-modal';
        // Get the link for the modal from the data attribute.
        var modalHref = $(this).attr('data-modal-href');

        if (modalHref) {
            modalId = "#" + modalId;
            var throbber = modalFunctions.addProgressThrobber($(this));

            $.ajax({
               url: modalHref,
            }).done(function(data) {
                throbber.remove();

                $("body").append(data);

                $(modalId).on('show.bs.modal', function() {
                    // Add a new click handler on the confirm button.
                    // When the button is pressed, a new click event for the current
                    // element is fired.
                    $(this).find('.modal-btn-confirm').click(function(event) {
                        event.preventDefault();

                        element.trigger('click', {'confirmButtonPressed': true});
                    });
                });
                $(modalId).on('hidden.bs.modal', function() {
                    $("body " + modalId).remove();
                });

                $(modalId).modal();
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

    var elem = $(this).find(':focus');
    var throbber = modalFunctions.addProgressThrobber(elem);

    var formData = new FormData(this);
    formData.append('submit', elem.attr('value'));

    // When submitting the form, do a request and see if we get
    // a open modal response, which should indicate that the form
    // was successfully submitted and we can open the modal from the url
    // in that response.
    $.ajax({
        url: $(this).attr('action'),
        type: $(this).attr('method'),
        data: formData,
        contentType: false,
        processData: false,
        cache: false,
    }).done(function(data) {
        if (data.modal) {
        	throbber.remove();
        	modalFunctions.handleOpenResponses(data);
        } else {
            // throbber.remove();
            // form.trigger('submit', {'formHasErrors': true});

            // Reload the hole page with the new data, which should
            // include all form errors.Considered a bad practive, will have to
            // check if it works correctly.
            document.open();
            document.write(data);
            document.close();
        }
    });
};

/**
 * Handle the ModalOpenResponse and DynamicOpenResponse that get returned after a form is successfully submitted.
 */
modalFunctions.handleOpenResponses = function(data) {
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
 * Bind the handlers to links and forms.
 */
modalFunctions.modifyElements = function(baseElement) {
    // The modal-open class can be put on any clickable element.
    // The element should have the href attribute set, which should return a modal template.
    // An optiondal data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    $((baseElement || '') + ".modal-open").click(modalFunctions.openModal);

    // The modal-open-confirm class can be put on any clickable element.
    // The element should have the data-modal-href attribute set to a url
    // which returns a modal template.
    // An optiondal data-modal-id can be set on the element if a custom modal
    // with a custom id is used.
    $((baseElement || '') + ".modal-open-confirm").click(modalFunctions.openConfirmModal);

    // The modal-open-from-form class can be used on a form element.
    // If the form is successfully submited, a response of type ModalOpenResponse
    // should be returned and a modal will open from the url specified in the response.
    // The response can include normal modals or form modals.
    $((baseElement || '') + ".modal-open-from-form").submit(modalFunctions.openModalFromForm).delay(1000);
}

$(document).ready(function () {
    modalFunctions.modifyElements();
});
