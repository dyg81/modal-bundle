const path = require('path');
const { test, expect } = require('@playwright/test');

const vendor = path.join(__dirname, '..', '..', 'node_modules');
const bootstrapCss = path.join(vendor, 'bootstrap', 'dist', 'css', 'bootstrap.min.css');
const jquery = path.join(vendor, 'jquery', 'dist', 'jquery.min.js');
const bootstrapJs = path.join(vendor, 'bootstrap', 'dist', 'js', 'bootstrap.bundle.min.js');
const bundleJs = path.join(__dirname, '..', '..', 'Resources', 'public', 'js', 'scripts.js');

function modalHtml(id, body) {
    return `<div id="${id}" class="modal" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-body">${body}</div>
            </div>
        </div>
    </div>`;
}

async function initPage(page, html) {
    await page.setContent(html);
    await page.addStyleTag({ path: bootstrapCss });
    await page.addScriptTag({ path: jquery });
    await page.addScriptTag({ path: bootstrapJs });
    await page.addScriptTag({ path: bundleJs });
    await page.waitForFunction(() => typeof modalFunctions !== 'undefined');
    await page.evaluate(() => modalFunctions.modifyElements());
}

test('opens and closes a modal fetched from a link', async ({ page }) => {
    await page.route('http://modal.test/modal/open', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('base-modal', 'Hello from the server'),
    }));

    await initPage(page, '<a id="open" class="modal-open" href="http://modal.test/modal/open">Open</a>');

    await page.evaluate(() => {
        window.__events = [];
        $(document).on('modal:opened', () => window.__events.push('opened'));
        $(document).on('modal:closed', () => window.__events.push('closed'));
    });

    await page.click('#open');

    await expect(page.locator('#base-modal')).toBeVisible();
    await expect(page.locator('#base-modal .modal-body')).toHaveText('Hello from the server');
    expect(await page.evaluate(() => window.__events)).toEqual(['opened']);

    await page.evaluate(() => $('#base-modal').modal('hide'));

    await expect(page.locator('#base-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__events)).toEqual(['opened', 'closed']);
});

test('opens controls inserted after page load', async ({ page }) => {
    await page.route('http://modal.test/dynamic', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('dynamic-modal', 'Dynamic content'),
    }));

    await initPage(page, '<div id="container"></div>');

    await page.evaluate(() => {
        $('#container').append('<a id="dynamic" class="modal-open" data-modal-id="dynamic-modal" href="http://modal.test/dynamic">Dynamic</a>');
    });

    await page.click('#dynamic');

    await expect(page.locator('#dynamic-modal')).toBeVisible();
    await expect(page.locator('#dynamic-modal .modal-body')).toHaveText('Dynamic content');
});

test('escapes modal ids that contain CSS special characters', async ({ page }) => {
    const modalId = 'modal.with:special[id]';

    await page.route('http://modal.test/special', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml(modalId, 'Special id'),
    }));

    await initPage(page, `<a id="special" class="modal-open" data-modal-id="${modalId}" href="http://modal.test/special">Special</a>`);

    await page.click('#special');

    await expect(page.locator(`[id="${modalId}"]`)).toBeVisible();
    await expect(page.locator(`[id="${modalId}"] .modal-body`)).toHaveText('Special id');
});

test('submits a modal form with the initiating button value', async ({ page }) => {
    await page.route('http://modal.test/form-modal', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<div id="base-modal" class="modal" tabindex="-1" role="dialog" aria-modal="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <form action="http://modal.test/submit" method="post">
                        <input name="title" value="Hello">
                        <button id="save" type="submit" name="action" value="save">Save</button>
                    </form>
                </div>
            </div>
        </div>`,
    }));

    let postedBody = '';
    await page.route('http://modal.test/submit', (route) => {
        postedBody = route.request().postData() || '';
        return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ redirect: 'http://modal.test/after' }),
        });
    });
    await page.route('http://modal.test/after', (route) => route.fulfill({
        contentType: 'text/html',
        body: '<html><body>Redirected</body></html>',
    }));

    await initPage(page, '<a id="open-form" class="modal-open" href="http://modal.test/form-modal">Open form</a>');

    await page.click('#open-form');
    await expect(page.locator('#base-modal form')).toBeVisible();

    await page.click('#save');

    await page.waitForURL('http://modal.test/after');
    expect(postedBody).toContain('name="action"');
    expect(postedBody).toContain('save');
});

test('confirms an action through the confirm modal', async ({ page }) => {
    await page.route('http://modal.test/confirm', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<div id="base-modal" class="modal" tabindex="-1" role="dialog" aria-modal="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary modal-btn-confirm">Confirm</button>
                    </div>
                </div>
            </div>
        </div>`,
    }));

    await initPage(page, '<a id="delete" class="modal-open-confirm" href="http://modal.test/target" data-modal-href="http://modal.test/confirm">Delete</a>');

    await page.evaluate(() => {
        window.__openedUrl = null;
        window.open = (url) => {
            window.__openedUrl = url;
        };
    });

    await page.click('#delete');
    await expect(page.locator('.modal-btn-confirm')).toBeVisible();

    await page.click('.modal-btn-confirm');

    await expect.poll(() => page.evaluate(() => window.__openedUrl)).toBe('http://modal.test/target');
});

test('emits modal:error and shows a message when the AJAX request fails', async ({ page }) => {
    await page.route('http://modal.test/fail', (route) => route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: 'Server error',
    }));

    await initPage(page, '<a id="fail" class="modal-open" href="http://modal.test/fail">Fail</a>');

    await page.evaluate(() => {
        window.__errors = [];
        $(document).on('modal:error', (event, detail) => window.__errors.push(detail.reason));
    });

    await page.click('#fail');

    await expect(page.locator('.modal-error-message')).toBeVisible();
    expect(await page.evaluate(() => window.__errors)).toEqual(['http-error']);
});
