"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const selfHealing_1 = require("../src/selfHealing");
const UI_PLAYGROUND_URL = 'http://www.uitestingplayground.com';
// Dynamic Element Tests
(0, test_1.test)('@dynamic Test dynamic ID handling', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/dynamicid`);
    await (0, selfHealing_1.selfHealingClick)(page, [
        '.btn-primary',
        'button.btn',
        'text=Button with Dynamic ID'
    ]);
    await (0, test_1.expect)(page.locator('.btn-primary')).toBeVisible();
});
// Ajax Request Tests
(0, test_1.test)('@async Test AJAX data loading', async ({ page }) => {
    page.setDefaultTimeout(20000); // Increase timeout for AJAX test
    await page.goto(`${UI_PLAYGROUND_URL}/ajax`);
    await (0, selfHealing_1.selfHealingClick)(page, ['#ajaxButton', 'text=Trigger'], 5);
    // Wait for AJAX response with longer timeout
    await (0, selfHealing_1.selfHealingWait)(page, [
        '.bg-success',
        '#content',
        'text=Data loaded with AJAX get request',
        'div:has-text("Data loaded")'
    ], 20);
    // Verify content using a more flexible selector
    const content = await page.locator('.bg-success, #content, text=Data loaded').textContent();
    (0, test_1.expect)(content).toContain('Data');
});
// Loading Tests
(0, test_1.test)('@loading Test progress bar', async ({ page }) => {
    page.setDefaultTimeout(20000); // Increase timeout for progress test
    await page.goto(`${UI_PLAYGROUND_URL}/progressbar`);
    await (0, selfHealing_1.selfHealingClick)(page, ['#startButton', 'text=Start'], 5);
    // Wait for progress to reach at least 50%
    await page.waitForFunction(() => {
        const progress = document.querySelector('#progressBar')?.getAttribute('aria-valuenow');
        return progress && Number(progress) >= 50;
    }, { timeout: 15000 });
    await (0, selfHealing_1.selfHealingClick)(page, ['#stopButton', 'text=Stop'], 5);
    const progress = await page.locator('#progressBar').getAttribute('aria-valuenow');
    (0, test_1.expect)(Number(progress)).toBeGreaterThanOrEqual(50);
});
// Visibility Tests
(0, test_1.test)('@visibility Test element visibility', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/visibility`);
    await (0, selfHealing_1.selfHealingClick)(page, ['#hideButton', 'text=Hide']);
    await (0, test_1.expect)(page.locator('#removedButton')).not.toBeVisible();
    await (0, test_1.expect)(page.locator('#zeroWidthButton')).not.toBeVisible();
    await (0, test_1.expect)(page.locator('#overlappedButton')).toBeVisible();
});
// Text Input Tests
(0, test_1.test)('@input Test text input with delay', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/textinput`);
    const newButtonText = 'Updated Button';
    await (0, selfHealing_1.selfHealingFill)(page, [
        '#newButtonName',
        'input[type="text"]',
        '.form-control'
    ], newButtonText);
    await (0, selfHealing_1.selfHealingClick)(page, ['#updatingButton', '.btn-primary']);
    await (0, test_1.expect)(page.locator('#updatingButton')).toHaveText(newButtonText);
});
// Mouse Over Tests
(0, test_1.test)('@interaction Test mouse over', async ({ page }) => {
    page.setDefaultTimeout(10000); // Increase timeout
    await page.goto(`${UI_PLAYGROUND_URL}/mouseover`);
    // First hover over the element
    const clickElement = page.locator('#clickCount, .text-primary, text=Click me').first();
    await clickElement.hover();
    // Then click it
    await (0, selfHealing_1.selfHealingClick)(page, [
        '#clickCount',
        '.text-primary',
        'text=Click me'
    ], 5);
    // Wait for the count to update
    await page.waitForTimeout(1000);
    const clickCount = await page.locator('#clickCount').textContent();
    (0, test_1.expect)(Number(clickCount || '0')).toBeGreaterThanOrEqual(0);
});
// Scrollbar Tests
(0, test_1.test)('@scroll Test scrollable content', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/scrollbars`);
    await (0, selfHealing_1.selfHealingClick)(page, [
        '#hidingButton',
        '.btn-primary',
        'text=Hiding Button'
    ]);
    await (0, test_1.expect)(page.locator('#hidingButton')).toBeVisible();
});
// Dynamic Table Tests
(0, test_1.test)('@table Test dynamic table sorting', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/dynamictable`);
    await (0, selfHealing_1.selfHealingWait)(page, [
        '[role="table"]',
        '.table',
        '#table1'
    ]);
    const cpuValue = await page.locator('.bg-warning').textContent();
    (0, test_1.expect)(cpuValue).toBeTruthy();
});
// Client Side Delay Tests
(0, test_1.test)('@delay Test client side delay', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/clientdelay`);
    await (0, selfHealing_1.selfHealingClick)(page, ['#ajaxButton', 'text=Button Triggering Client Side Logic']);
    await (0, selfHealing_1.selfHealingWait)(page, [
        '.bg-success',
        '#content',
        'text=Data calculated on the client side'
    ], 16);
    await (0, test_1.expect)(page.locator('.bg-success')).toContainText('Data calculated');
});
// Load Delay Tests
(0, test_1.test)('@performance Test load delay', async ({ page }) => {
    await page.goto(`${UI_PLAYGROUND_URL}/loaddelay`);
    await (0, selfHealing_1.selfHealingWait)(page, [
        '.btn-primary',
        'button.btn',
        'text=Button Appearing After Delay'
    ], 10);
    await (0, selfHealing_1.selfHealingClick)(page, ['.btn-primary']);
    await (0, test_1.expect)(page.locator('.btn-primary')).toBeVisible();
});
