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
