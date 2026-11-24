const path = require('path');
const { test, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'node_modules');
const fs = require('fs');
const assets = fs.existsSync(path.join(root, 'Resources/public')) ? 'Resources/public' : 'public';

test('removes the progress indicator when opening a modal fails', async ({ page }) => {
    await page.route('http://modal.test/', route => route.fulfill({contentType: 'text/html', body: '<a href="/failed" class="modal-open">Open</a>'}));
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route('http://modal.test/failed', async route => { await pending; await route.fulfill({status: 500, body: 'failure'}); });
    await page.goto('http://modal.test/');
    await page.addScriptTag({path: path.join(vendor, 'jquery/dist/jquery.min.js')});
    await page.addScriptTag({path: path.join(vendor, 'bootstrap/dist/js/bootstrap.bundle.min.js')});
    await page.addScriptTag({path: path.join(root, assets, 'js/scripts.js')});
    await page.waitForFunction(() => typeof modalFunctions !== 'undefined');
    await page.click('.modal-open');
    await expect(page.locator('.ajax-progress')).toHaveCount(1);
    release();
    await expect(page.locator('.ajax-progress')).toHaveCount(0);
});

test('retains symmetric indicator spacing in both directions', async ({ page }) => {
    await page.setContent('<div dir="ltr"><span class="ajax-progress">LTR</span></div><div dir="rtl"><span class="ajax-progress">RTL</span></div>');
    await page.addStyleTag({path: path.join(root, assets, 'css/ajax-progress.css')});
    for (const dir of ['ltr', 'rtl']) {
        const progress = page.locator(`[dir="${dir}"] .ajax-progress`);
        await expect(progress).toHaveCSS('padding-left', '5px');
        await expect(progress).toHaveCSS('padding-right', '5px');
    }
});
