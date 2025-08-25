"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfHealingClick = selfHealingClick;
exports.selfHealingFill = selfHealingFill;
exports.selfHealingWait = selfHealingWait;
/**
 * Attempts to click a selector with retries and alternate selectors for self-healing.
 * @param page Playwright Page object
 * @param selectors Array of selectors to try in order
 * @param maxRetries Number of retries per selector
 */
async function selfHealingClick(page, selectors, maxRetries = 2) {
    for (const selector of selectors) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await page.click(selector, { timeout: 2000 });
                return { success: true, selector, attempt };
            }
            catch (err) {
                console.warn(`Failed to click '${selector}' on attempt ${attempt}. Error: ${err.message}`);
                if (attempt === maxRetries) {
                    console.error(`Final failure for '${selector}' after ${maxRetries} attempts. Error: ${err.message}`);
                }
            }
        }
    }
    throw new Error(`Self-healing click failed for selectors: ${selectors.join(', ')}`);
}
/**
 * Attempts to fill a selector with retries and alternate selectors for self-healing.
 * @param page Playwright Page object
 * @param selectors Array of selectors to try in order
 * @param value Value to fill
 * @param maxRetries Number of retries per selector
 */
async function selfHealingFill(page, selectors, value, maxRetries = 2) {
    for (const selector of selectors) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await page.fill(selector, value, { timeout: 2000 });
                return { success: true, selector, attempt };
            }
            catch (err) {
                console.warn(`Failed to fill '${selector}' on attempt ${attempt}. Error: ${err.message}`);
                if (attempt === selectors.length) {
                    console.error(`Final failure for '${selector}' after ${maxRetries} attempts. Error: ${err.message}`);
                }
            }
        }
    }
    throw new Error(`Self-healing fill failed for selectors: ${selectors.join(', ')}`);
}
/**
 * Attempts to wait for a selector with retries and alternate selectors for self-healing.
 * @param page Playwright Page object
 * @param selectors Array of selectors to try in order
 * @param maxRetries Number of retries per selector
 */
async function selfHealingWait(page, selectors, maxRetries = 2, timeout = 2000) {
    for (const selector of selectors) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                await page.waitForSelector(selector, { timeout });
                const elapsedTime = Date.now() - startTime;
                console.log(`Successfully waited for '${selector}' on attempt ${attempt}. Elapsed time: ${elapsedTime}ms`);
                return { success: true, selector, attempt, elapsedTime };
            }
            catch (err) {
                if (attempt === maxRetries) {
                    console.error(`Final failure for '${selector}' after ${maxRetries} attempts. Error: ${err.message}`);
                }
                else {
                    console.warn(`Failed to wait for '${selector}' on attempt ${attempt}. Error: ${err.message}`);
                }
            }
        }
    }
    throw new Error(`Self-healing wait failed for selectors: ${selectors.join(', ')}`);
}
/**
 * Example usage in a test:
 * await selfHealingClick(page, ['#main-btn', '.main-button', 'button:has-text("Main")']);
 */
