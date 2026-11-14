/**
 * Unit tests for the vanilla JavaScript modal bundle.
 * Bootstrap's Modal API is mocked in setup.js; fetch is mocked per test.
 */

const fs = require('fs');
const path = require('path');

const scriptsPath = path.resolve(__dirname, '../../Resources/public/js/scripts.js');

function htmlResponse(body, options) {
    options = options || {};

    return {
        ok: options.status === undefined || (options.status >= 200 && options.status < 300),
        status: options.status === undefined ? 200 : options.status,
        statusText: options.statusText === undefined ? 'OK' : options.statusText,
        headers: {
            get: function(name) {
                return name.toLowerCase() === 'content-type' ? (options.contentType || 'text/html') : null;
            }
        },
        text: function() {
            return Promise.resolve(body);
        },
        json: function() {
            return Promise.resolve(JSON.parse(body));
        }
    };
}

function jsonResponse(body, options) {
    options = options || {};
    options.contentType = 'application/json';

    return htmlResponse(typeof body === 'string' ? body : JSON.stringify(body), options);
}

function mockFetch(impl) {
    global.fetch = jest.fn(impl);

    return global.fetch;
}

function flush() {
    return new Promise(function(resolve) {
        setTimeout(resolve, 0);
    });
}

function click(element) {
    element.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
}

function submit(form) {
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
}

function modalHtml(id, body) {
    return '<div id="' + id + '" class="modal"><div class="modal-body">' + (body || 'Mock') + '</div></div>';
}

function fixture(markup) {
    const div = document.createElement('div');
    div.id = 'test-fixture';
    div.innerHTML = markup;
    document.body.appendChild(div);

    return div;
}

beforeAll(() => {
    window.eval(fs.readFileSync(scriptsPath, 'utf8'));

    // The bundle self-binds on load; tests bind their own roots explicitly.
    window.modalFunctions.bindings.forEach(function(binding) {
        binding.controller.abort();
    });
    window.modalFunctions.bindings = [];
});

afterEach(() => {
    const modalFunctions = window.modalFunctions;

    if (modalFunctions) {
        modalFunctions.bindings.forEach(function(binding) {
            binding.controller.abort();
        });
        modalFunctions.bindings = [];
        modalFunctions.activeModal = null;
        modalFunctions.activeTrigger = null;
        modalFunctions.pendingRequest = null;
    }

    document.querySelectorAll('.modal, .ajax-progress, .modal-error-message, #test-fixture').forEach(function(element) {
        element.remove();
    });

    delete global.fetch;
    window.history.replaceState(null, '', '/');
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
    it('renders a status region with a spinner and screen-reader text', () => {
        const button = document.createElement('button');
        button.textContent = 'Open';
        document.body.appendChild(button);

        const throbber = window.modalFunctions.addProgressThrobber(button);

        expect(throbber.getAttribute('role')).toBe('status');
        expect(throbber.querySelectorAll('.throbber').length).toBe(1);
        expect(throbber.querySelector('.sr-only').textContent).toBe('Loading…');
        expect(button.nextElementSibling).toBe(throbber);
    });

    it('uses a custom loadingText when configured', () => {
        const originalText = window.modalFunctions.loadingText;
        window.modalFunctions.loadingText = 'Please wait';

        const button = document.createElement('button');
        document.body.appendChild(button);
        const throbber = window.modalFunctions.addProgressThrobber(button);

        expect(throbber.querySelector('.sr-only').textContent).toBe('Please wait');

        window.modalFunctions.loadingText = originalText;
    });

    it('can be removed without leaving orphan elements', () => {
        const button = document.createElement('button');
        document.body.appendChild(button);
        const throbber = window.modalFunctions.addProgressThrobber(button);

        throbber.remove();

        expect(button.parentElement.querySelector('.ajax-progress')).toBeNull();
    });
});

describe('modal response protocol', () => {
    it('handleOpenResponses appends modal HTML and opens the default modal', () => {
        window.modalFunctions.handleOpenResponses({
            modal: modalHtml('base-modal', 'OK')
        });

        const modal = document.getElementById('base-modal');
        expect(modal).not.toBeNull();
        expect(modal.classList.contains('show')).toBe(true);
    });

    it('handleOpenResponses uses a custom modalId', () => {
        window.modalFunctions.handleOpenResponses({
            modal: modalHtml('custom-modal'),
            modalId: 'custom-modal'
        });

        expect(document.getElementById('custom-modal')).not.toBeNull();
        expect(document.getElementById('base-modal')).toBeNull();
    });

    it('handleOpenResponses ignores payloads with both modal and redirect', () => {
        const before = document.body.innerHTML;

        window.modalFunctions.handleOpenResponses({
            modal: modalHtml('bad-modal'),
            redirect: '/elsewhere'
        });

        expect(document.body.innerHTML).toBe(before);
    });

    it('leaves the page untouched when the response lacks the requested modal id', async () => {
        fixture('<a href="/modal" class="modal-open" data-modal-id="base-modal">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('wrong-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(document.querySelectorAll('.modal').length).toBe(0);
        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('unexpected-response');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('rejects a non-string modal payload without touching the DOM', async () => {
        fixture('<form id="bad-json" method="POST" action="/edit" class="modal-open-from-form"><button type="submit">Go</button></form>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(jsonResponse({modal: {html: '<div></div>'}}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('bad-json'));
        await flush();

        expect(document.querySelectorAll('.modal').length).toBe(0);
        expect(document.body.textContent).not.toContain('[object Object]');
        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('unexpected-response');

        document.removeEventListener('modal:error', errorHandler);
    });
});

describe('dynamic modal controls', () => {
    it('modifyElements supports selector and DOM roots', async () => {
        const root = fixture(
            '<div id="root-selector"><a href="/selector" class="modal-open">Selector</a></div>' +
            '<div id="root-dom"><a href="/dom" class="modal-open">DOM</a></div>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#root-selector');
        window.modalFunctions.modifyElements(document.getElementById('root-dom'));

        click(root.querySelector('#root-selector .modal-open'));
        await flush();
        click(root.querySelector('#root-dom .modal-open'));
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not send duplicate requests when modifyElements is called multiple times', async () => {
        fixture('<a href="/once" class="modal-open">Open</a>');
        const fetchMock = mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        window.modalFunctions.modifyElements('#test-fixture');

        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('handles modal-open elements inserted after modifyElements was called', async () => {
        const root = fixture('');
        const fetchMock = mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');

        const link = document.createElement('a');
        link.href = '/dynamic';
        link.className = 'modal-open';
        root.appendChild(link);
        click(link);
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('/dynamic');
    });

    it('sends the same-origin AJAX header that jQuery used to add', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const fetchMock = mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(fetchMock.mock.calls[0][1].headers).toEqual(
            expect.objectContaining({'X-Requested-With': 'XMLHttpRequest'})
        );
    });

    it('re-triggers the original action when a confirm modal button is pressed', async () => {
        fixture('<a href="/delete" class="modal-open-confirm" data-modal-href="/confirm">Delete</a>');
        const openSpy = jest.spyOn(window, 'open').mockImplementation(function() {});
        mockFetch(function() {
            return Promise.resolve(htmlResponse(
                '<div id="base-modal" class="modal"><div class="modal-body">Are you sure?</div>' +
                '<button type="button" class="modal-btn-confirm">Confirm</button></div>'
            ));
        });

        window.modalFunctions.modifyElements();
        click(document.querySelector('#test-fixture .modal-open-confirm'));
        await flush();
        click(document.querySelector('#base-modal .modal-btn-confirm'));

        expect(openSpy).toHaveBeenCalledWith('/delete', '_self');

        openSpy.mockRestore();
    });
});

describe('form submission with the initiating control', () => {
    it('remembers the submit button clicked inside a form', async () => {
        const root = fixture('<form id="f1"><button type="submit" name="save" value="create">Create</button></form>');
        mockFetch(function() {
            return Promise.resolve(jsonResponse({}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const form = root.querySelector('form');
        form.addEventListener('submit', function(event) {
            event.preventDefault();
        });
        click(form.querySelector('button'));

        expect(form._dyg81Submitter).toBe(form.querySelector('button'));

        await flush();
    });

    it('sends the clicked submit button value, not a hard-coded field', async () => {
        const root = fixture(
            '<form id="f2" method="POST" action="/post" class="modal-open-from-form">' +
            '<input type="text" name="title" value="Hello" />' +
            '<button type="submit" name="save" value="draft">Draft</button>' +
            '<button type="submit" name="save" value="publish">Publish</button>' +
            '</form>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(jsonResponse({}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const form = root.querySelector('form');
        const publish = form.querySelector('button[value="publish"]');
        window.modalFunctions.recordSubmitter({target: publish});
        submit(form);
        await flush();

        const options = fetchMock.mock.calls[0][1];
        expect(options.body).toBeInstanceOf(FormData);
        expect(options.body.get('title')).toBe('Hello');
        expect(options.body.get('save')).toBe('publish');
        expect(options.method).toBe('POST');
    });

    it('does not add a submitter field when the form is submitted without one', async () => {
        const root = fixture(
            '<form id="f3" method="POST" action="/post" class="modal-open-from-form">' +
            '<input type="text" name="title" value="Hello" />' +
            '<button type="submit" name="save" value="go">Go</button>' +
            '</form>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(jsonResponse({}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(root.querySelector('form'));
        await flush();

        expect(fetchMock.mock.calls[0][1].body.get('title')).toBe('Hello');
        expect(fetchMock.mock.calls[0][1].body.get('save')).toBeNull();
    });

    it('serializes GET forms as a query string including the submitter', async () => {
        const root = fixture(
            '<form id="f4" method="get" action="/search" class="modal-open-from-form">' +
            '<input type="text" name="q" value="modal" />' +
            '<button type="submit" name="page" value="2">Next</button>' +
            '</form>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(jsonResponse({}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const form = root.querySelector('form');
        window.modalFunctions.recordSubmitter({target: form.querySelector('button')});
        submit(form);
        await flush();

        expect(fetchMock.mock.calls[0][1].method).toBe('GET');
        expect(fetchMock.mock.calls[0][0]).toContain('q=modal');
        expect(fetchMock.mock.calls[0][0]).toContain('page=2');
    });

    it('replaces the current query string for a GET form without an action', async () => {
        window.history.replaceState(null, '', '/search?old=1');
        const root = fixture(
            '<form id="f5" method="get" class="modal-open-from-form">' +
            '<input type="text" name="q" value="modal" />' +
            '<button type="submit">Search</button>' +
            '</form>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(jsonResponse({}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(root.querySelector('form'));
        await flush();

        expect(fetchMock.mock.calls[0][0]).toBe('?q=modal');
    });

    it('replaces the originating form with the matching validation fragment', async () => {
        fixture(
            '<form id="page-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<input type="text" name="title" value="" />' +
            '<button type="submit" name="save" value="go">Go</button>' +
            '</form>'
        );
        const response = '<div class="wrapper">' +
            '<form id="page-form" method="POST" action="/edit">' +
            '<input type="text" name="title" value="" />' +
            '<span class="error">Required</span>' +
            '<button type="submit" name="save" value="go">Go</button>' +
            '</form>' +
            '</div>';
        mockFetch(function() {
            return Promise.resolve(htmlResponse(response));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('page-form'));
        await flush();

        const form = document.getElementById('page-form');
        expect(form).not.toBeNull();
        expect(form.querySelectorAll('.error').length).toBe(1);
        expect(form.parentElement.id).toBe('test-fixture');
    });

    it('emits modal:error when the validation response does not contain the target form', async () => {
        fixture(
            '<form id="missing-target-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit">Go</button>' +
            '</form>'
        );
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('<form id="other-form"></form>'));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('missing-target-form'));
        await flush();

        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('missing-error-target');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('does not duplicate handlers after replacing a form', async () => {
        fixture(
            '<form id="dup-form" method="POST" action="/edit" class="modal-open-from-form">' +
            '<button type="submit" name="save" value="go">Go</button>' +
            '</form>'
        );
        const fetchMock = mockFetch(function() {
            return Promise.resolve(htmlResponse(
                '<form id="dup-form" class="modal-open-from-form" method="POST" action="/edit">' +
                '<button type="submit" name="save" value="go">Go</button>' +
                '</form>'
            ));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('dup-form'));
        await flush();
        submit(document.getElementById('dup-form'));
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe('request failures and unexpected responses', () => {
    it('removes the throbber after an HTTP error', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        mockFetch(function() {
            return Promise.resolve(htmlResponse('Server error', {status: 500, statusText: 'Internal Server Error'}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(document.querySelectorAll('.ajax-progress').length).toBe(0);
    });

    it('emits modal:error with http-error and preserves status', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('Server error', {status: 500, statusText: 'Internal Server Error'}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        const detail = errorHandler.mock.calls[0][0].detail;
        expect(detail.reason).toBe('http-error');
        expect(detail.status).toBe(500);
        expect(detail.statusText).toBe('Internal Server Error');
        expect(detail.response).not.toBeNull();
        expect(detail.error).toBeInstanceOf(Error);

        document.removeEventListener('modal:error', errorHandler);
    });

    it('emits modal:error with reason network when fetch rejects', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.reject(new TypeError('Failed to fetch'));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        const detail = errorHandler.mock.calls[0][0].detail;
        expect(detail.reason).toBe('network');
        expect(detail.response).toBeNull();
        expect(detail.error).toBeInstanceOf(TypeError);

        document.removeEventListener('modal:error', errorHandler);
    });

    it('emits modal:error with reason abort when the request is aborted', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            const error = new Error('The operation was aborted.');
            error.name = 'AbortError';

            return Promise.reject(error);
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('abort');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('emits modal:error with reason parse-error on invalid JSON', async () => {
        fixture('<form id="json-form" method="POST" action="/edit" class="modal-open-from-form"><button type="submit">Go</button></form>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {get: function() { return 'application/json'; }},
                json: function() { return Promise.reject(new SyntaxError('Unexpected token')); }
            });
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('json-form'));
        await flush();

        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('parse-error');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('emits modal:error when the content type is unsupported', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('plain', {contentType: 'text/plain'}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('unexpected-response');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('does not append a full HTML document as a modal fragment', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('<!DOCTYPE html><html><body><div class="modal"></div></body></html>'));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(document.querySelectorAll('.modal').length).toBe(0);
        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('unexpected-response');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('does not replace a page form with a full HTML document', async () => {
        fixture('<form id="page-form" method="POST" action="/edit" class="modal-open-from-form"><button type="submit">Go</button></form>');
        const errorHandler = jest.fn();
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('<!DOCTYPE html><html><body><form id="page-form"></form></body></html>'));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        submit(document.getElementById('page-form'));
        await flush();

        expect(document.getElementById('page-form')).not.toBeNull();
        expect(errorHandler.mock.calls[0][0].detail.reason).toBe('unexpected-response');

        document.removeEventListener('modal:error', errorHandler);
    });

    it('lets the host suppress the default error message', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const errorHandler = jest.fn(function(event) {
            event.preventDefault();
        });
        document.addEventListener('modal:error', errorHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse('Error', {status: 500}));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(document.querySelectorAll('.modal-error-message').length).toBe(0);

        document.removeEventListener('modal:error', errorHandler);
    });

    it('allows the user to retry after an error', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        let callCount = 0;
        const fetchMock = mockFetch(function() {
            callCount++;

            return Promise.resolve(callCount === 1
                ? htmlResponse('Error', {status: 500})
                : htmlResponse(modalHtml('base-modal', 'OK')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const link = document.querySelector('#test-fixture .modal-open');
        click(link);
        await flush();
        click(link);
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(document.getElementById('base-modal')).not.toBeNull();
    });
});

describe('modal lifecycle and IDs', () => {
    it('emits modal:opened after the modal is shown', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const openedHandler = jest.fn();
        document.addEventListener('modal:opened', openedHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(openedHandler).toHaveBeenCalledTimes(1);
        expect(openedHandler.mock.calls[0][0].detail.modalId).toBe('base-modal');
        expect(openedHandler.mock.calls[0][0].detail.modal).toBeInstanceOf(HTMLElement);
        expect(openedHandler.mock.calls[0][0].detail.trigger).toBeInstanceOf(HTMLElement);

        document.removeEventListener('modal:opened', openedHandler);
    });

    it('emits modal:closed after the modal is hidden and removed', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        const closedHandler = jest.fn();
        document.addEventListener('modal:closed', closedHandler);
        mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();
        window.bootstrap.Modal.getOrCreateInstance(document.getElementById('base-modal')).hide();

        expect(closedHandler).toHaveBeenCalledTimes(1);
        expect(closedHandler.mock.calls[0][0].detail.modalId).toBe('base-modal');
        expect(document.getElementById('base-modal')).toBeNull();

        document.removeEventListener('modal:closed', closedHandler);
    });

    it('closes an active modal before opening a new one', async () => {
        fixture(
            '<a href="/first" class="modal-open">First</a>' +
            '<a href="/second" class="modal-open" data-modal-id="other-modal">Second</a>'
        );
        let callCount = 0;
        mockFetch(function() {
            callCount++;

            return Promise.resolve(htmlResponse(callCount === 1
                ? modalHtml('base-modal', 'First')
                : modalHtml('other-modal', 'Second')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const links = document.querySelectorAll('#test-fixture .modal-open');
        click(links[0]);
        await flush();
        click(links[1]);
        await flush();

        expect(document.getElementById('base-modal')).toBeNull();
        expect(document.getElementById('other-modal')).not.toBeNull();
    });

    it('does not leave duplicate modals when the same id is reused', async () => {
        fixture('<a href="/modal" class="modal-open">Open</a>');
        mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('base-modal')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        const link = document.querySelector('#test-fixture .modal-open');
        click(link);
        await flush();
        click(link);
        await flush();

        expect(document.querySelectorAll('#base-modal').length).toBe(1);
    });

    it('handles modal ids that contain CSS-special characters', async () => {
        fixture('<a href="/modal" class="modal-open" data-modal-id="weird:id[1]">Open</a>');
        mockFetch(function() {
            return Promise.resolve(htmlResponse(modalHtml('weird:id[1]', 'Weird')));
        });

        window.modalFunctions.modifyElements('#test-fixture');
        click(document.querySelector('#test-fixture .modal-open'));
        await flush();

        expect(document.getElementById('weird:id[1]')).not.toBeNull();
    });
});
