const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests', testMatch: '**/*.spec.js', use: { browserName: 'chromium' } });
