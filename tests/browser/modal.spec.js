const path = require('path');
const { test, expect } = require('@playwright/test');

const vendor = path.join(__dirname, '..', '..', 'node_modules');
const bootstrapCss = path.join(vendor, 'bootstrap', 'dist', 'css', 'bootstrap.min.css');
const bootstrapJs = path.join(vendor, 'bootstrap', 'dist', 'js', 'bootstrap.bundle.min.js');
const bundleJs = path.join(__dirname, '..', '..', 'Resources', 'public', 'js', 'scripts.js');

function modalHtml(id, body) {
    return `<div id="${id}" class="modal fade" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-body">${body}</div>
            </div>
        </div>
    </div>`;
}

async function initPage(page, html) {
    await page.route('http://modal.test/', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
    }));
    await page.goto('http://modal.test/');
    await page.addStyleTag({ path: bootstrapCss });
    await page.addScriptTag({ path: bootstrapJs });
    await page.addScriptTag({ path: bundleJs });
    await page.waitForFunction(() => typeof modalFunctions !== 'undefined');
    await page.evaluate(() => modalFunctions.modifyElements());
}

test('opens and closes a modal fetched from a link', async ({ page }) => {
    await page.route('**/modal/open', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('base-modal', 'Hello from the server'),
    }));

    await initPage(page, '<a id="open" class="modal-open" href="/modal/open">Open</a>');

    await page.evaluate(() => {
        window.__events = [];
        document.addEventListener('modal:opened', (event) => window.__events.push('opened'));
        document.addEventListener('modal:closed', (event) => window.__events.push('closed'));
    });

    await page.click('#open');

    await expect(page.locator('#base-modal')).toBeVisible();
    await expect(page.locator('#base-modal .modal-body')).toHaveText('Hello from the server');
    await expect.poll(() => page.evaluate(() => window.__events)).toEqual(['opened']);

    await page.evaluate(() => {
        window.bootstrap.Modal.getOrCreateInstance(document.getElementById('base-modal')).hide();
    });

    await expect(page.locator('#base-modal')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__events)).toEqual(['opened', 'closed']);
});

test('dismisses a modal with Escape and with a backdrop click', async ({ page }) => {
    await page.route('**/modal/open', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('base-modal', 'Dismiss me'),
    }));

    await initPage(page, '<a id="open" class="modal-open" href="/modal/open">Open</a>');
    await page.click('#open');
    await expect(page.locator('#base-modal')).toBeVisible();
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'base-modal');

    await page.keyboard.press('Escape');
    await expect(page.locator('#base-modal')).toHaveCount(0);

    await page.click('#open');
    await expect(page.locator('#base-modal')).toBeVisible();
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'base-modal');

    // Clicking the modal backdrop area outside the dialog dismisses the modal.
    await page.mouse.click(5, 5);
    await expect(page.locator('#base-modal')).toHaveCount(0);
});

test('opens controls inserted after page load', async ({ page }) => {
    await page.route('**/dynamic', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('dynamic-modal', 'Dynamic content'),
    }));

    await initPage(page, '<div id="container"></div>');

    await page.evaluate(() => {
        const link = document.createElement('a');
        link.id = 'dynamic';
        link.className = 'modal-open';
        link.setAttribute('data-modal-id', 'dynamic-modal');
        link.href = '/dynamic';
        link.textContent = 'Dynamic';
        document.getElementById('container').appendChild(link);
    });

    await page.click('#dynamic');

    await expect(page.locator('#dynamic-modal')).toBeVisible();
    await expect(page.locator('#dynamic-modal .modal-body')).toHaveText('Dynamic content');
});

test('escapes modal ids that contain CSS special characters', async ({ page }) => {
    const modalId = 'modal.with:special[id]';

    await page.route('**/special', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml(modalId, 'Special id'),
    }));

    await initPage(page, `<a id="special" class="modal-open" data-modal-id="${modalId}" href="/special">Special</a>`);

    await page.click('#special');

    await expect(page.locator(`[id="${modalId}"]`)).toBeVisible();
    await expect(page.locator(`[id="${modalId}"] .modal-body`)).toHaveText('Special id');
});

test('submits a modal form with the initiating button value', async ({ page }) => {
    await page.route('**/form-modal', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<div id="base-modal" class="modal fade" tabindex="-1" role="dialog" aria-modal="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <form action="/submit" method="post">
                        <input name="title" value="Hello">
                        <button id="save" type="submit" name="action" value="save">Save</button>
                    </form>
                </div>
            </div>
        </div>`,
    }));

    let postedBody = '';
    await page.route('**/submit', (route) => {
        postedBody = route.request().postData() || '';
        return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ redirect: 'http://modal.test/after' }),
        });
    });
    await page.route('**/after', (route) => route.fulfill({
        contentType: 'text/html',
        body: '<html><body>Redirected</body></html>',
    }));

    await initPage(page, '<a id="open-form" class="modal-open" href="/form-modal">Open form</a>');

    await page.click('#open-form');
    await expect(page.locator('#base-modal form')).toBeVisible();

    await page.click('#save');

    await page.waitForURL('http://modal.test/after');
    expect(postedBody).toContain('name="action"');
    expect(postedBody).toContain('save');
});

test('replaces an active modal instead of stacking modals', async ({ page }) => {
    await page.route('**/first', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('base-modal', 'First'),
    }));
    await page.route('**/second', (route) => route.fulfill({
        contentType: 'text/html',
        body: modalHtml('other-modal', 'Second'),
    }));

    await initPage(page, '<a id="first" class="modal-open" href="/first">First</a>' +
        '<a id="second" class="modal-open" data-modal-id="other-modal" href="/second">Second</a>');

    // Slow the fade so the second trigger lands while the first modal is still
    // transitioning in; Bootstrap ignores hide() during that window.
    await page.addStyleTag({content: '.modal.fade .modal-dialog { transition-duration: 1s !important; }'});

    await page.click('#first');
    await expect(page.locator('#base-modal')).toBeVisible();

    // The open modal covers the page, so trigger the second link directly.
    await page.evaluate(() => document.getElementById('second').click());
    await expect(page.locator('#other-modal')).toBeVisible({timeout: 15000});
    await expect(page.locator('#base-modal')).toHaveCount(0);
});

test('ignores rapid repeated triggers while a request is pending', async ({ page }) => {
    let requests = 0;
    await page.route('**/modal/open', async (route) => {
        requests++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        await route.fulfill({
            contentType: 'text/html',
            body: modalHtml('base-modal', 'Only once'),
        });
    });

    await initPage(page, '<a id="open" class="modal-open" href="/modal/open">Open</a>');

    await page.evaluate(() => {
        const link = document.getElementById('open');
        link.click();
        link.click();
        link.click();
    });

    await expect(page.locator('#base-modal')).toBeVisible();
    expect(requests).toBe(1);
    await expect(page.locator('#base-modal')).toHaveCount(1);
});

test('confirms an action through the confirm modal', async ({ page }) => {
    await page.route('**/confirm', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<div id="base-modal" class="modal fade" tabindex="-1" role="dialog" aria-modal="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary modal-btn-confirm">Confirm</button>
                    </div>
                </div>
            </div>
        </div>`,
    }));

    await initPage(page, '<a id="delete" class="modal-open-confirm" href="/target" data-modal-href="/confirm">Delete</a>');

    await page.evaluate(() => {
        window.__openedUrl = null;
        window.open = (url) => {
            window.__openedUrl = url;
        };
    });

    await page.click('#delete');
    await expect(page.locator('.modal-btn-confirm')).toBeVisible();

    await page.click('.modal-btn-confirm');

    await expect.poll(() => page.evaluate(() => window.__openedUrl)).toBe('/target');
});

test('emits modal:error and shows a message when the request fails', async ({ page }) => {
    await page.route('**/fail', (route) => route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: 'Server error',
    }));

    await initPage(page, '<a id="fail" class="modal-open" href="/fail">Fail</a>');

    await page.evaluate(() => {
        window.__errors = [];
        document.addEventListener('modal:error', (event) => window.__errors.push(event.detail.reason));
    });

    await page.click('#fail');

    await expect(page.locator('.modal-error-message')).toBeVisible();
    expect(await page.evaluate(() => window.__errors)).toEqual(['http-error']);
});


test('spaces the inserted progress indicator at the inline start in both directions', async ({ page }) => {
    await initPage(page, '<div dir="ltr"><button id="ltr">LTR</button></div><div dir="rtl"><button id="rtl">RTL</button></div>');
    await page.addStyleTag({ path: path.join(__dirname, '..', '..', 'Resources', 'public', 'css', 'ajax-progress.css') });
    await page.evaluate(() => {
        modalFunctions.addProgressThrobber(document.getElementById('ltr'));
        modalFunctions.addProgressThrobber(document.getElementById('rtl'));
    });

    const ltr = page.locator('[dir="ltr"] .ajax-progress');
    const rtl = page.locator('[dir="rtl"] .ajax-progress');
    await expect(ltr).toHaveCSS('margin-left', '8px');
    await expect(ltr).toHaveCSS('margin-right', '0px');
    await expect(rtl).toHaveCSS('margin-left', '0px');
    await expect(rtl).toHaveCSS('margin-right', '8px');
});
