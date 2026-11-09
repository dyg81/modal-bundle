/**
 * Baseline unit tests for the modal JavaScript bundle.
 * These smoke tests verify that the bundle loads and exposes its public API.
 * Additional tests for each bug fix are added alongside the corresponding commit.
 */

const fs = require('fs');
const path = require('path');

const scriptsPath = path.resolve(__dirname, '../../Resources/public/js/scripts.js');

beforeAll(() => {
    // Load the bundle source once before running tests.
    const source = fs.readFileSync(scriptsPath, 'utf8');
    window.eval(source);
});

afterEach(() => {
    // Reset internal state that could leak between tests when modals are
    // removed directly instead of through the bundle lifecycle.
    if (window.modalFunctions) {
        window.modalFunctions.activeModal = null;
        window.modalFunctions.activeTrigger = null;
        window.modalFunctions.pendingRequest = null;
    }
});

describe('modal bundle baseline', () => {
    it('exposes the modalFunctions global', () => {
        expect(typeof window.modalFunctions).toBe('object');
    });

    it('exposes public trigger handlers', () => {
        expect(typeof window.modalFunctions.openModal).toBe('function');
        expect(typeof window.modalFunctions.openConfirmModal).toBe('function');
        expect(typeof window.modalFunctions.openModalFromForm).toBe('function');
        expect(typeof window.modalFunctions.modifyElements).toBe('function');
    });
});

describe('accessible loading indicator', () => {
    afterEach(() => {
        $('.ajax-progress').remove();
        $('#test-fixture').remove();
    });

    it('renders a status region with a spinner and screen-reader text', () => {
        const $button = $('<button>').text('Open').appendTo(document.body);
        const $throbber = window.modalFunctions.addProgressThrobber($button);

        expect($throbber.attr('role')).toBe('status');
        expect($throbber.find('.throbber').length).toBe(1);
        expect($throbber.find('.sr-only').text()).toBe('Loading…');
        expect($button.next().is($throbber)).toBe(true);
    });

    it('uses a custom loadingText when configured', () => {
        const originalText = window.modalFunctions.loadingText;
        window.modalFunctions.loadingText = 'Please wait';

        const $button = $('<button>').text('Open').appendTo(document.body);
        const $throbber = window.modalFunctions.addProgressThrobber($button);

        expect($throbber.find('.sr-only').text()).toBe('Please wait');

        window.modalFunctions.loadingText = originalText;
    });

    it('can be removed without leaving orphan elements', () => {
        const $button = $('<button>').text('Open').appendTo(document.body);
        const $throbber = window.modalFunctions.addProgressThrobber($button);

        $throbber.remove();

        expect($button.next('.ajax-progress').length).toBe(0);
    });
});

describe('modal response protocol', () => {
    afterEach(() => {
        $('.modal').remove();
    });

    it('handleOpenResponses appends modal HTML and opens the default modal', () => {
        window.modalFunctions.handleOpenResponses({
            modal: '<div id="base-modal" class="modal"><div class="modal-body">OK</div></div>',
        });

        const $modal = $('#base-modal');
        expect($modal.length).toBe(1);
        expect($modal.hasClass('show') || $modal.css('display') !== 'none').toBe(true);
    });

    it('handleOpenResponses uses a custom modalId', () => {
        window.modalFunctions.handleOpenResponses({
            modal: '<div id="custom-modal" class="modal"></div>',
            modalId: 'custom-modal',
        });

        expect($('#custom-modal').length).toBe(1);
        expect($('#base-modal').length).toBe(0);
    });

    it('handleOpenResponses ignores payloads with both modal and redirect', () => {
        const before = document.body.innerHTML;

        window.modalFunctions.handleOpenResponses({
            modal: '<div id="bad-modal" class="modal"></div>',
            redirect: '/elsewhere',
        });

        expect(document.body.innerHTML).toBe(before);
    });
});

describe('dynamic modal controls', () => {
    let ajaxSpy;

    function mockAjax(responseHtml) {
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            var response = responseHtml || '<div id="base-modal" class="modal"><div class="modal-body">Mock</div></div>';
            return $.Deferred().resolve(response).promise();
        });
    }

    afterEach(() => {
        $('.modal').remove();
        $('.ajax-progress').remove();
        $('#test-fixture').remove();
        if (ajaxSpy) {
            ajaxSpy.mockRestore();
            ajaxSpy = null;
        }
    });

    it('modifyElements supports selector, DOM and jQuery roots', () => {
        const $fixture = $('<div id="test-fixture">' +
            '<div id="root-selector"><a href="/selector" class="modal-open">Selector</a></div>' +
            '<div id="root-dom"><a href="/dom" class="modal-open">DOM</a></div>' +
            '<div id="root-jquery"><a href="/jquery" class="modal-open">jQuery</a></div>' +
        '</div>').appendTo(document.body);

        mockAjax();

        window.modalFunctions.modifyElements('#root-selector');
        window.modalFunctions.modifyElements(document.getElementById('root-dom'));
        window.modalFunctions.modifyElements($('#root-jquery'));

        $fixture.find('.modal-open').each(function() {
            $(this).trigger('click');
        });

        expect(ajaxSpy).toHaveBeenCalledTimes(3);
    });

    it('does not send duplicate requests when modifyElements is called multiple times', () => {
        $('<div id="test-fixture"><a href="/once" class="modal-open">Open</a></div>').appendTo(document.body);
        mockAjax();

        window.modalFunctions.modifyElements('#test-fixture');
        window.modalFunctions.modifyElements('#test-fixture');

        $('#test-fixture .modal-open').trigger('click');

        expect(ajaxSpy).toHaveBeenCalledTimes(1);
    });

    it('handles modal-open elements inserted after modifyElements was called', () => {
        const $fixture = $('<div id="test-fixture"></div>').appendTo(document.body);
        mockAjax();

        window.modalFunctions.modifyElements('#test-fixture');
        $('<a href="/dynamic" class="modal-open">Dynamic</a>').appendTo($fixture);
        $fixture.find('.modal-open').trigger('click');

        expect(ajaxSpy).toHaveBeenCalledTimes(1);
        expect(ajaxSpy).toHaveBeenCalledWith(expect.objectContaining({url: '/dynamic'}));
    });

    it('re-triggers the original action when a confirm modal button is pressed', () => {
        const $fixture = $('<div id="test-fixture">' +
            '<a href="/delete" class="modal-open-confirm" data-modal-href="/confirm">Delete</a>' +
        '</div>').appendTo(document.body);
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});

        mockAjax('<div id="base-modal" class="modal">' +
            '<div class="modal-body">Are you sure?</div>' +
            '<button type="button" class="modal-btn-confirm">Confirm</button>' +
        '</div>');

        // Bind at document level so both the trigger and the modal markup
        // appended to <body> are covered by delegation.
        window.modalFunctions.modifyElements();
        $fixture.find('.modal-open-confirm').trigger('click');
        $('#base-modal .modal-btn-confirm').trigger('click');

        expect(openSpy).toHaveBeenCalledWith('/delete', '_self');

        openSpy.mockRestore();
    });
});

describe('form submission with the initiating control', () => {
    let ajaxSpy;
    let ajaxOptions;

    function mockAjax(response) {
        ajaxOptions = null;
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation((options) => {
            ajaxOptions = options;
            return $.Deferred().resolve(response).promise();
        });
    }

    afterEach(() => {
        $('.modal').remove();
        $('.ajax-progress').remove();
        $('#test-fixture').remove();
        if (ajaxSpy) {
            ajaxSpy.mockRestore();
            ajaxSpy = null;
        }
    });

    it('remembers the submit button clicked inside a form', () => {
        $('<div id="test-fixture"><form id="f1" class="modal-open-from-form">' +
            '<button type="submit" name="save" value="create">Create</button>' +
        '</form></div>').appendTo(document.body);

        window.modalFunctions.modifyElements('#test-fixture');
        $('#f1 button[name="save"]').trigger('click');
        const submitter = window.modalFunctions.getSubmitter(document.getElementById('f1'), {originalEvent: {}});

        expect(submitter.length).toBe(1);
        expect(submitter.attr('name')).toBe('save');
        expect(submitter.val()).toBe('create');
    });

    it('sends the clicked submit button value, not a hard-coded field', () => {
        $('<div id="test-fixture"><form id="f2" method="POST" action="/post" class="modal-open-from-form">' +
            '<input type="text" name="title" value="Hello" />' +
            '<button type="submit" name="save" value="draft">Draft</button>' +
            '<button type="submit" name="save" value="publish">Publish</button>' +
        '</form></div>').appendTo(document.body);
        mockAjax('{}');

        window.modalFunctions.modifyElements('#test-fixture');
        $('#f2 button[value="publish"]').trigger('click');

        expect(ajaxOptions.data).toBeInstanceOf(FormData);
        expect(ajaxOptions.data.get('title')).toBe('Hello');
        expect(ajaxOptions.data.get('save')).toBe('publish');
        expect(ajaxOptions.contentType).toBe(false);
        expect(ajaxOptions.processData).toBe(false);
    });

    it('does not add a submitter field when the form is submitted without one', () => {
        $('<div id="test-fixture"><form id="f3" method="POST" action="/post" class="modal-open-from-form">' +
            '<input type="text" name="title" value="Hello" />' +
            '<button type="submit" name="save" value="go">Go</button>' +
        '</form></div>').appendTo(document.body);
        mockAjax('{}');

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('f3').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        expect(ajaxOptions.data.get('title')).toBe('Hello');
        expect(ajaxOptions.data.get('save')).toBe(null);
    });

    it('serializes GET forms as a query string including the submitter', () => {
        $('<div id="test-fixture"><form id="f4" method="get" action="/search" class="modal-open-from-form">' +
            '<input type="text" name="q" value="modal" />' +
            '<button type="submit" name="page" value="2">Next</button>' +
        '</form></div>').appendTo(document.body);
        mockAjax('{}');

        window.modalFunctions.modifyElements('#test-fixture');
        $('#f4 button[name="page"]').trigger('click');

        expect(ajaxOptions.type).toBe('GET');
        expect(ajaxOptions.url).toMatch('q=modal');
        expect(ajaxOptions.url).toMatch('page=2');
    });

    it('replaces the originating form with the matching validation fragment', () => {
        $('<div id="test-fixture"><form id="page-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<input type="text" name="title" value="" />' +
            '<button type="submit" name="save" value="go">Go</button>' +
        '</form></div>').appendTo(document.body);
        const response = '<div class="wrapper">' +
            '<form id="page-form" method="POST" action="/edit">' +
                '<input type="text" name="title" value="" />' +
                '<span class="error">Required</span>' +
                '<button type="submit" name="save" value="go">Go</button>' +
            '</form>' +
        '</div>';
        mockAjax(response);

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('page-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        const $form = $('#page-form');
        expect($form.length).toBe(1);
        expect($form.find('.error').length).toBe(1);
        expect($form.parent().attr('id')).toBe('test-fixture');
    });

    it('emits modal:error when the validation response does not contain the target form', () => {
        $('<div id="test-fixture"><form id="missing-target-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit">Go</button>' +
        '</form></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        mockAjax('<form id="other-form"></form>');

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('missing-target-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler.mock.calls[0][1].reason).toBe('missing-error-target');

        $(document).off('modal:error.test');
    });

    it('does not duplicate handlers after replacing a form', () => {
        $('<div id="test-fixture"><form id="dup-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit" name="save" value="go">Go</button>' +
        '</form></div>').appendTo(document.body);
        mockAjax('<form id="dup-form" class="modal-open-from-form" method="POST" action="/edit">' +
            '<button type="submit" name="save" value="go">Go</button>' +
        '</form>');

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('dup-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
        document.getElementById('dup-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        expect(ajaxSpy).toHaveBeenCalledTimes(2);
    });
});

describe('AJAX failures and unexpected responses', () => {
    let ajaxSpy;

    function mockReject(status, textStatus, errorThrown) {
        return function() {
            return $.Deferred().reject({status: status}, textStatus, errorThrown).promise();
        };
    }

    afterEach(() => {
        $('.modal').remove();
        $('.ajax-progress').remove();
        $('.modal-error-message').remove();
        $('#test-fixture').remove();
        if (ajaxSpy) {
            ajaxSpy.mockRestore();
            ajaxSpy = null;
        }
    });

    it('removes the throbber after an HTTP error', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(500, 'error', 'Internal Server Error'));

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect($('.ajax-progress').length).toBe(0);
    });

    it('emits modal:error with reason http-error on a 500 response', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(500, 'error', 'Internal Server Error'));

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler.mock.calls[0][1].reason).toBe('http-error');
        $(document).off('modal:error.test');
    });

    it('emits modal:error with reason timeout', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(0, 'timeout', 'Timeout'));

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect(errorHandler.mock.calls[0][1].reason).toBe('timeout');
        $(document).off('modal:error.test');
    });

    it('emits modal:error with reason network when the request has no status', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(0, 'error', 'Network Error'));

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect(errorHandler.mock.calls[0][1].reason).toBe('network');
        $(document).off('modal:error.test');
    });

    it('emits modal:error with reason parse-error on invalid JSON', () => {
        $('<div id="test-fixture"><form id="json-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit">Go</button>' +
        '</form></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(200, 'parsererror', 'Parse Error'));

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('json-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        expect(errorHandler.mock.calls[0][1].reason).toBe('parse-error');
        $(document).off('modal:error.test');
    });

    it('does not append a full HTML document as a modal fragment', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            return $.Deferred().resolve('<!DOCTYPE html><html><body><div class="modal"></div></body></html>').promise();
        });

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect($('.modal').length).toBe(0);
        expect(errorHandler.mock.calls[0][1].reason).toBe('unexpected-response');
        $(document).off('modal:error.test');
    });

    it('does not replace a page form with a full HTML document', () => {
        $('<div id="test-fixture"><form id="page-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit">Go</button>' +
        '</form></div>').appendTo(document.body);
        const errorHandler = jest.fn();
        $(document).on('modal:error.test', errorHandler);
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            return $.Deferred().resolve('<!DOCTYPE html><html><body><form id="page-form"></form></body></html>').promise();
        });

        window.modalFunctions.modifyElements('#test-fixture');
        document.getElementById('page-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));

        expect($('#page-form').length).toBe(1);
        expect(errorHandler.mock.calls[0][1].reason).toBe('unexpected-response');
        $(document).off('modal:error.test');
    });

    it('lets the host suppress the default error message', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        $(document).on('modal:error.test', function(event) {
            event.preventDefault();
        });
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(mockReject(500, 'error', 'Error'));

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect($('.modal-error-message').length).toBe(0);
        $(document).off('modal:error.test');
    });

    it('allows the user to retry after an error', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        let callCount = 0;
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return $.Deferred().reject({status: 500}, 'error', 'Error').promise();
            }
            return $.Deferred().resolve('<div id="base-modal" class="modal"><div class="modal-body">OK</div></div>').promise();
        });

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');
        $('#test-fixture .modal-open').trigger('click');

        expect(ajaxSpy).toHaveBeenCalledTimes(2);
        expect($('#base-modal').length).toBe(1);
    });
});

describe('modal lifecycle and IDs', () => {
    let ajaxSpy;

    function mockAjax(responseHtml) {
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            var response = responseHtml || '<div id="base-modal" class="modal"><div class="modal-body">Mock</div></div>';
            return $.Deferred().resolve(response).promise();
        });
    }

    afterEach(() => {
        $('.modal').remove();
        $('.ajax-progress').remove();
        $('.modal-error-message').remove();
        $('#test-fixture').remove();
        if (ajaxSpy) {
            ajaxSpy.mockRestore();
            ajaxSpy = null;
        }
    });

    it('emits modal:opened after the modal is shown', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const openedHandler = jest.fn();
        $(document).on('modal:opened.test', openedHandler);
        mockAjax();

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect(openedHandler).toHaveBeenCalledTimes(1);
        expect(openedHandler.mock.calls[0][1].modalId).toBe('base-modal');
        $(document).off('modal:opened.test');
    });

    it('emits modal:closed after the modal is hidden and removed', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        const closedHandler = jest.fn();
        $(document).on('modal:closed.test', closedHandler);
        mockAjax();

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');
        $('#base-modal').modal('hide');

        expect(closedHandler).toHaveBeenCalledTimes(1);
        expect(closedHandler.mock.calls[0][1].modalId).toBe('base-modal');
        expect($('#base-modal').length).toBe(0);
        $(document).off('modal:closed.test');
    });

    it('closes an active modal before opening a new one', () => {
        $('<div id="test-fixture">' +
            '<a href="/first" class="modal-open">First</a>' +
            '<a href="/second" class="modal-open" data-modal-id="other-modal">Second</a>' +
        '</div>').appendTo(document.body);
        let callCount = 0;
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => {
            callCount++;
            var response = callCount === 1
                ? '<div id="base-modal" class="modal"><div class="modal-body">First</div></div>'
                : '<div id="other-modal" class="modal"><div class="modal-body">Second</div></div>';
            return $.Deferred().resolve(response).promise();
        });

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').first().trigger('click');
        $('#test-fixture .modal-open').last().trigger('click');

        expect($('#base-modal').length).toBe(0);
        expect($('#other-modal').length).toBe(1);
    });

    it('does not leave duplicate modals when the same id is reused', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open">Open</a></div>').appendTo(document.body);
        mockAjax();

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');
        $('#test-fixture .modal-open').trigger('click');

        expect($('#base-modal').length).toBe(1);
    });

    it('handles modal ids that contain CSS-special characters', () => {
        $('<div id="test-fixture"><a href="/modal" class="modal-open" data-modal-id="weird:id[1]">Open</a></div>').appendTo(document.body);
        mockAjax('<div id="weird:id[1]" class="modal"><div class="modal-body">Weird</div></div>');

        window.modalFunctions.modifyElements('#test-fixture');
        $('#test-fixture .modal-open').trigger('click');

        expect(document.getElementById('weird:id[1]')).not.toBeNull();
        expect($('#' + $.escapeSelector('weird:id[1]')).length).toBe(1);
    });
});
