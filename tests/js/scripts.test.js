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
        ajaxSpy = jest.spyOn($, 'ajax').mockImplementation(() => ({
            done: function(callback) {
                callback(responseHtml || '<div id="base-modal" class="modal"><div class="modal-body">Mock</div></div>');
                return this;
            },
        }));
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
