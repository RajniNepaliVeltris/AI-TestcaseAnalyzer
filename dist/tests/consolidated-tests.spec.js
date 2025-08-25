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
    await (0, selfHealing_1.selfHealingFill)(page, ['input[placeholder="enter github user name"]', 'input[type="text"]', '.form-control'], 'Nik', 2);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', '.search-btn', 'text=search'], 2);
    await (0, selfHealing_1.selfHealingWait)(page, ['article:has-text("nik")', 'h4:has-text("nik")', 'a[href="https://github.com/nik"]'], 2);
    // Use role and name to target specific h4
    await (0, test_1.expect)(page.getByRole('heading', { name: /nik/i, level: 4 }).first()).toBeVisible({ timeout: 10000 });
});
(0, test_1.test)('@regression Search for an invalid user', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout for this test
    await page.goto(GH_USERS_URL);
    await (0, selfHealing_1.selfHealingFill)(page, ['input[type="search"]', 'input[data-testid="search-bar"]', 'input[type="text"]', 'input[placeholder="enter github user name"]'], 'nonexistentuser123456', 5);
    await (0, selfHealing_1.selfHealingClick)(page, ['button[type="submit"]', '.search-btn', 'text=Search'], 2);
    await (0, selfHealing_1.selfHealingWait)(page, ['.no-results', '.results-list', 'div:has-text("No users found")'], 2);
    await (0, test_1.expect)(page.locator('text=No users found')).toBeVisible({ timeout: 10000 });
});
// // Edge Cases
// test('@edge Empty search shows error', async ({ page }) => {
//   page.setDefaultTimeout(10000); // Increase timeout for this test
//   await page.goto(GH_USERS_URL);
//   await selfHealingFill(page, ['input[placeholder="enter github user name"]', '.form-control', 'input[type="search"]'], '', 2);
//   await selfHealingClick(page, ['button[type="submit"]', 'text=search', '.search-btn'], 2);
//   await selfHealingWait(page, ['text=Please Enter something', '.alert', '.validation-error'], 2);
//   const errorText = await page.locator('.alert, .validation-error, text=Please Enter something').textContent();
//   expect(errorText).toBeTruthy(); // Verify that some error message exists
// });
// test('@edge Invalid URL navigation', async ({ page }) => {
//   try {
//     await page.goto('https://invalid-url-example.com');
//   } catch (err: any) { // Cast to any since Playwright error types are not easily accessible
//     expect(err.message).toContain('ERR_NAME_NOT_RESOLVED');
//     return;
//   }
//   throw new Error('Expected navigation to fail');
// });
// test('@edge Long input in search box', async ({ page }) => {
//   page.setDefaultTimeout(10000); // Increase timeout for this test
//   await page.goto(GH_USERS_URL);
//   const longInput = 'a'.repeat(1000); // 1000 characters
//   await selfHealingFill(page, ['input[placeholder="enter github user name"]', '.form-control', 'input[type="search"]'], longInput, 2);
//   await selfHealingClick(page, ['button[type="submit"]', 'text=search', '.search-btn'], 2);
//   await selfHealingWait(page, ['text=No users found', '.alert', '.results-list:empty'], 2);
//   // More flexible assertion that covers different possible responses
//   const response = await page.locator('.alert, .no-results, text=No users found').isVisible();
//   expect(response).toBeTruthy(); // Verify that some error/empty state is shown
// });
// // Self-Healing Tests
// test('@selfHealing Click demo', async ({ page }) => {
//   await page.goto(PLAYWRIGHT_URL);
//   await selfHealingClick(page, ['#nonexistent-btn', '.main-button', 'text=Get Started'], 2);
//   await expect(page).toHaveTitle(/Playwright/);
// });
// test('@selfHealing Fill demo', async ({ page }) => {
//   await page.goto(PLAYWRIGHT_URL);
//   await page.locator('button[type="button"]:has-text("Search")').click();
//   await selfHealingFill(page, ['.DocSearch-Input', '#docsearch-input', 'input[type="search"]'], 'test', 2);
//   await expect(page.locator('.DocSearch-Input')).toHaveValue('test');
// });
(0, test_1.test)('@selfHealing Wait demo', async ({ page }) => {
    await page.goto(PLAYWRIGHT_URL);
    await (0, selfHealing_1.selfHealingWait)(page, ['#nonexistent-header', '.navbar__inner', 'header'], 2);
    await (0, test_1.expect)(page.locator('header')).toBeVisible();
});
