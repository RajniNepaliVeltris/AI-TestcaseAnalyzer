"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const selfHealing_1 = require("../src/selfHealing");
const PLAYWRIGHT_URL = 'https://playwright.dev/';
const GH_USERS_URL = 'https://gh-users-search.netlify.app/';
// Smoke Tests
(0, test_1.test)('@smoke Playwright home page loads', async ({ page }) => {
    await page.goto(PLAYWRIGHT_URL);
    await (0, test_1.expect)(page).toHaveTitle(/Playwright/);
});
(0, test_1.test)('@smoke GitHub Users Search home page loads', async ({ page }) => {
    await page.goto(GH_USERS_URL);
    await (0, test_1.expect)(page).toHaveTitle(/Github User/);
});
// Regression Tests
(0, test_1.test)('@regression Search for a valid user', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout for this test
    await page.goto(GH_USERS_URL);
    await (0, selfHealing_1.selfHealingFill)(page, ['input[placeholder="enter github user name"]', 'input[type="text"]', '.form-control'], 'Nik', 5);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', '.search-btn', 'text=search'], 5);
    await (0, selfHealing_1.selfHealingWait)(page, ['article:has-text("nik")', 'h4:has-text("nik")', 'a[href="https://github.com/nik"]'], 5);
    await (0, test_1.expect)(page.locator('h4')).toHaveText(/nik/i, { timeout: 10000 });
});
(0, test_1.test)('@regression Search for an invalid user', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout for this test
    await page.goto(GH_USERS_URL);
    await (0, selfHealing_1.selfHealingFill)(page, ['input[type="search"]', 'input[data-testid="search-bar"]', 'input[type="text"]', 'input[placeholder="enter github user name"]'], 'nonexistentuser123456', 5);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', '.search-btn', 'text=Search'], 5);
    await (0, selfHealing_1.selfHealingWait)(page, ['.no-results', '.results-list', 'div:has-text("No users found")'], 5);
    await (0, test_1.expect)(page.locator('text=No users found')).toBeVisible({ timeout: 10000 });
});
// Edge Cases
(0, test_1.test)('@edge Empty search shows error', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout for this test
    await page.goto(GH_USERS_URL);
    await (0, selfHealing_1.selfHealingFill)(page, ['input[placeholder="enter github user name"]', '.form-control', 'input[type="search"]'], '', 5);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', 'text=search', '.search-btn'], 5);
    await (0, selfHealing_1.selfHealingWait)(page, ['text=Please Enter something', '.alert', '.validation-error'], 5);
    const errorText = await page.locator('.alert, .validation-error, text=Please Enter something').textContent();
    (0, test_1.expect)(errorText).toBeTruthy(); // Verify that some error message exists
});
(0, test_1.test)('@edge Invalid URL navigation', async ({ page }) => {
    try {
        await page.goto('https://invalid-url-example.com');
    }
    catch (err) { // Cast to any since Playwright error types are not easily accessible
        (0, test_1.expect)(err.message).toContain('ERR_NAME_NOT_RESOLVED');
        return;
    }
    throw new Error('Expected navigation to fail');
});
(0, test_1.test)('@edge Long input in search box', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout for this test
    await page.goto(GH_USERS_URL);
    const longInput = 'a'.repeat(1000); // 1000 characters
    await (0, selfHealing_1.selfHealingFill)(page, ['input[placeholder="enter github user name"]', '.form-control', 'input[type="search"]'], longInput, 5);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', 'text=search', '.search-btn'], 5);
    await (0, selfHealing_1.selfHealingWait)(page, ['text=No users found', '.alert', '.results-list:empty'], 5);
    // More flexible assertion that covers different possible responses
    const response = await page.locator('.alert, .no-results, text=No users found').isVisible();
    (0, test_1.expect)(response).toBeTruthy(); // Verify that some error/empty state is shown
});
// Self-Healing Tests
(0, test_1.test)('@selfHealing Click demo', async ({ page }) => {
    await page.goto(PLAYWRIGHT_URL);
    await (0, selfHealing_1.selfHealingClick)(page, ['#nonexistent-btn', '.main-button', 'text=Get Started'], 2);
    await (0, test_1.expect)(page).toHaveTitle(/Playwright/);
});
(0, test_1.test)('@selfHealing Fill demo', async ({ page }) => {
    await page.goto(PLAYWRIGHT_URL);
    await page.locator('button[type="button"]:has-text("Search")').click();
    await (0, selfHealing_1.selfHealingFill)(page, ['.DocSearch-Input', '#docsearch-input', 'input[type="search"]'], 'test', 2);
    await (0, test_1.expect)(page.locator('.DocSearch-Input')).toHaveValue('test');
});
(0, test_1.test)('@selfHealing Wait demo', async ({ page }) => {
    await page.goto(PLAYWRIGHT_URL);
    await (0, selfHealing_1.selfHealingWait)(page, ['#nonexistent-header', '.navbar__inner', 'header'], 2);
    await (0, test_1.expect)(page.locator('header')).toBeVisible();
});
