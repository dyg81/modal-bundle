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
