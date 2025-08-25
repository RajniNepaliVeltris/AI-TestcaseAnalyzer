import { test, expect } from '@playwright/test';
import { selfHealingClick, selfHealingFill, selfHealingWait } from '../src/selfHealing';

const UI_PLAYGROUND_URL = 'http://www.uitestingplayground.com';

// Dynamic Element Tests
test('@dynamic Test dynamic ID handling', async ({ page }) => {
  await page.goto(`${UI_PLAYGROUND_URL}/dynamicid`);
  await selfHealingClick(page, [
    '.btn-primary', 
    'button.btn', 
    'text=Button with Dynamic ID'
  ]);
  await expect(page.locator('.btn-primary')).toBeVisible();
});

// Ajax Request Tests
test('@async Test AJAX data loading', async ({ page }) => {
  page.setDefaultTimeout(20000); // Increase timeout for AJAX test
  await page.goto(`${UI_PLAYGROUND_URL}/ajax`);
  await selfHealingClick(page, ['#ajaxButton', 'text=Trigger'], 5);
  
  // Wait for AJAX response with longer timeout
  await selfHealingWait(page, [
    '.bg-success',
    '#content',
    'div:has-text("Data loaded with AJAX get request")',
    'div:has-text("Data loaded")'
  ], 20);
  
  // Use getByText for text matching
  const content = await page.getByText(/Data loaded/i).textContent();
  expect(content).toContain('Data');
});

// Loading Tests
test('@loading Test progress bar', async ({ page }) => {
  page.setDefaultTimeout(20000); // Increase timeout for progress test
  await page.goto(`${UI_PLAYGROUND_URL}/progressbar`);
  await selfHealingClick(page, ['#startButton', 'text=Start'], 5);
  
  // Wait for progress to reach at least 50%
  await page.waitForFunction(() => {
    const progress = document.querySelector('#progressBar')?.getAttribute('aria-valuenow');
    return progress && Number(progress) >= 50;
  }, { timeout: 15000 });
  
  await selfHealingClick(page, ['#stopButton', 'text=Stop'], 5);
  
  const progress = await page.locator('#progressBar').getAttribute('aria-valuenow');
  expect(Number(progress)).toBeGreaterThanOrEqual(50);
});

// Visibility Tests
test('@visibility Test element visibility', async ({ page }) => {
  await page.goto(`${UI_PLAYGROUND_URL}/visibility`);
  await selfHealingClick(page, ['#hideButton', 'text=Hide']);
  await expect(page.locator('#removedButton')).not.toBeVisible();
  await expect(page.locator('#zeroWidthButton')).not.toBeVisible();
  await expect(page.locator('#overlappedButton')).toBeVisible();
});

// Text Input Tests
test('@input Test text input with delay', async ({ page }) => {
  await page.goto(`${UI_PLAYGROUND_URL}/textinput`);
  const newButtonText = 'Updated Button';
  await selfHealingFill(page, [
    '#newButtonName',
    'input[type="text"]',
    '.form-control'
  ], newButtonText);
  await selfHealingClick(page, ['#updatingButton', '.btn-primary']);
  await expect(page.locator('#updatingButton')).toHaveText(newButtonText);
});

// // Mouse Over Tests
// test('@interaction Test mouse over', async ({ page }) => {
//   page.setDefaultTimeout(10000); // Increase timeout
//   await page.goto(`${UI_PLAYGROUND_URL}/mouseover`);
  
//   // First hover over the element
//   const clickElement = page.locator('#clickCount, .text-primary, text=Click me').first();
//   await clickElement.hover();
  
//   // Then click it
//   await selfHealingClick(page, [
//     '#clickCount',
//     '.text-primary',
//     'text=Click me'
//   ], 5);
  
//   // Wait for the count to update
//   await page.waitForTimeout(1000);
  
//   const clickCount = await page.locator('#clickCount').textContent();
//   expect(Number(clickCount || '0')).toBeGreaterThanOrEqual(0);
// });

// // Scrollbar Tests
// test('@scroll Test scrollable content', async ({ page }) => {
//   await page.goto(`${UI_PLAYGROUND_URL}/scrollbars`);
//   await selfHealingClick(page, [
//     '#hidingButton',
//     '.btn-primary',
//     'text=Hiding Button'
//   ]);
//   await expect(page.locator('#hidingButton')).toBeVisible();
// });

// // Dynamic Table Tests
// test('@table Test dynamic table sorting', async ({ page }) => {
//   await page.goto(`${UI_PLAYGROUND_URL}/dynamictable`);
//   await selfHealingWait(page, [
//     '[role="table"]',
//     '.table',
//     '#table1'
//   ]);
//   const cpuValue = await page.locator('.bg-warning').textContent();
//   expect(cpuValue).toBeTruthy();
// });

// // Client Side Delay Tests
// test('@delay Test client side delay', async ({ page }) => {
//   await page.goto(`${UI_PLAYGROUND_URL}/clientdelay`);
//   await selfHealingClick(page, ['#ajaxButton', 'text=Button Triggering Client Side Logic']);
//   await selfHealingWait(page, [
//     '.bg-success',
//     '#content',
//     'text=Data calculated on the client side'
//   ], 16);
//   await expect(page.locator('.bg-success')).toContainText('Data calculated');
// });

// Load Delay Tests
test('@performance Test load delay', async ({ page }) => {
  await page.goto(`${UI_PLAYGROUND_URL}/loaddelay`);
  await selfHealingWait(page, [
    '.btn-primary',
    'button.btn',
    'text=Button Appearing After Delay'
  ], 10);
  await selfHealingClick(page, ['.btn-primary']);
  await expect(page.locator('.btn-primary')).toBeVisible();
});