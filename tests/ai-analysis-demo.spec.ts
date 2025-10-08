import { test, expect } from '@playwright/test';
import { selfHealingClick, selfHealingFill, selfHealingWait } from '../src/selfHealing';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
    BASE_URL: 'https://the-internet.herokuapp.com',
    TIMEOUTS: {
        DEFAULT: 30000,
        QUICK: 5000,
        SLOW: 60000
    },
    CREDENTIALS: {
        VALID: { username: 'tomsmith', password: 'SuperSecretPassword!' },
        INVALID: { username: 'invalid_user', password: 'wrong_password' }
    }
} as const;

const SELECTORS = {
    LOGIN: {
        USERNAME: ['#username', '[name="username"]'],
        PASSWORD: ['#password', '[name="password"]'],
        SUBMIT: ['#login', 'button[type="submit"]', '[type="submit"]'],
        SUCCESS_FLASH: '.flash.success',
        ERROR_FLASH: '.flash.error'
    },
    COMMON: {
        H2: 'h2',
        CHECKBOXES: 'input[type="checkbox"]',
        DELETE_BUTTONS: '.delete',
        ADD_BUTTON: ['.example button', 'button:has-text("Add Element")']
    },
    DYNAMIC: {
        FINISH: ['#finish', '.finish'],
        ADDED_ELEMENTS: '.added-manually'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Performs a complete login flow with self-healing for inputs, reliable submission
 */
async function performLogin(page: any, credentials: { username: string; password: string }) {
    // Use self-healing for input fields (demonstrates the capability)
    await selfHealingFill(page, SELECTORS.LOGIN.USERNAME, credentials.username);
    await selfHealingFill(page, SELECTORS.LOGIN.PASSWORD, credentials.password);

    // Use reliable click for form submission
    await page.click('button[type="submit"]');
}

/**
 * Waits for page load and stabilizes
 */
async function waitForPageLoad(page: any) {
    await page.waitForLoadState('networkidle', { timeout: CONFIG.TIMEOUTS.QUICK });
}

/**
 * Creates multiple elements for testing
 */
async function createMultipleElements(page: any, count: number) {
    for (let i = 0; i < count; i++) {
        await selfHealingClick(page, SELECTORS.COMMON.ADD_BUTTON);
    }
}

/**
 * Common assertion for element count
 */
async function assertElementCount(page: any, selector: string, expectedCount: number, description: string) {
    const count = await page.locator(selector).count();
    expect(count, `${description} - Expected ${expectedCount}, found ${count}`).toBe(expectedCount);
}

/**
 * ============================================================================
 * AI-POWERED TEST CASE ANALYZER DEMONSTRATION SUITE
 * ============================================================================
 *
 * This test suite demonstrates the core capabilities of the AI Testcase Analyzer:
 *
 * 🎯 SELF-HEALING AUTOMATION: Tests that adapt to UI changes automatically
 * 🤖 AI FAILURE ANALYSIS: Intelligent analysis of test failures with insights
 * 📊 BATCH PROCESSING: Efficient parallel analysis of multiple failures
 * 📈 ENHANCED REPORTING: Interactive dashboards with confidence metrics
 * 🔄 ERROR RECOVERY: Graceful handling of various failure scenarios
 *
 * Each test is tagged with its primary demonstration focus.
 * ============================================================================
 */

// ============================================================================
// 🎯 SELF-HEALING CAPABILITIES DEMONSTRATION
// ============================================================================

test.describe('Self-Healing Automation', () => {
    test('@selfheal-success Basic form interaction with self-healing', async ({ page }) => {
        // ✅ DEMONSTRATES: Self-healing selectors working correctly
        await page.goto(`${CONFIG.BASE_URL}/login`);

        // Self-healing fill handles multiple possible selectors - using CORRECT credentials
        await performLogin(page, CONFIG.CREDENTIALS.VALID);

        // Verify successful login
        await expect(page.locator(SELECTORS.COMMON.H2)).toHaveText('Secure Area');
    });    test('@selfheal-success Dynamic element interaction', async ({ page }) => {
        // ✅ DEMONSTRATES: Self-healing with dynamic DOM changes
        await page.goto(`${CONFIG.BASE_URL}/add_remove_elements/`);

        // Add multiple elements
        await createMultipleElements(page, 3);

        // Verify elements were added
        await assertElementCount(page, SELECTORS.DYNAMIC.ADDED_ELEMENTS, 3, 'Added elements');

        // Self-healing delete handles dynamically created elements
        await selfHealingClick(page, [SELECTORS.DYNAMIC.ADDED_ELEMENTS, SELECTORS.COMMON.DELETE_BUTTONS]);
        await assertElementCount(page, SELECTORS.DYNAMIC.ADDED_ELEMENTS, 2, 'After delete');
    });

    test('@selfheal-success Checkbox state management', async ({ page }) => {
        // ✅ DEMONSTRATES: Self-healing with state-dependent selectors
        await page.goto(`${CONFIG.BASE_URL}/checkboxes`);

        // Check first checkbox using self-healing
        await selfHealingClick(page, [SELECTORS.COMMON.CHECKBOXES + ':not(:checked)']);
        await expect(page.locator(SELECTORS.COMMON.CHECKBOXES).first()).toBeChecked();

        // Click second checkbox using self-healing (demonstrates selector matching)
        await selfHealingClick(page, [SELECTORS.COMMON.CHECKBOXES + ':checked']);
        // Note: This demonstrates self-healing selector matching capabilities
        await assertElementCount(page, SELECTORS.COMMON.CHECKBOXES, 2, 'Total checkboxes');
    });
});

// ============================================================================
// 🤖 AI FAILURE ANALYSIS DEMONSTRATION
// ============================================================================

test.describe('AI Failure Analysis', () => {
    test('@ai-analysis Authentication failure analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: AI analysis of authentication failures
        await page.goto(`${CONFIG.BASE_URL}/login`);

        // Intentionally use wrong credentials
        await performLogin(page, CONFIG.CREDENTIALS.INVALID);

        // This will fail, triggering AI analysis of authentication patterns
        await expect(page.locator(SELECTORS.LOGIN.SUCCESS_FLASH)).toBeVisible({
            timeout: CONFIG.TIMEOUTS.DEFAULT
        });
    });

    test('@ai-analysis Dynamic content timing analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: AI analysis of timing-related issues
        await page.goto(`${CONFIG.BASE_URL}/dynamic_loading/2`);

        await selfHealingClick(page, ['#start', 'button:has-text("Start")']);

        // Intentionally short timeout to trigger timing analysis
        await selfHealingWait(page, SELECTORS.DYNAMIC.FINISH, 2);

        // This will fail due to timing, allowing AI to analyze race conditions
        await expect(page.locator(SELECTORS.DYNAMIC.FINISH[0])).toBeVisible({
            timeout: 2000
        });
    });

    test('@ai-analysis DOM mutation analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: AI analysis of dynamic DOM changes
        await page.goto(`${CONFIG.BASE_URL}/add_remove_elements/`);

        // Create multiple elements
        await createMultipleElements(page, 5);

        // Intentionally use wrong selector to trigger AI analysis
        await selfHealingClick(page, ['.wrong-delete-button', SELECTORS.COMMON.DELETE_BUTTONS]);

        // This will fail, allowing AI to analyze DOM structure changes
        const deleteButtons = await page.locator(SELECTORS.COMMON.DELETE_BUTTONS).count();
        expect(deleteButtons).toBe(0);
    });

    test('@ai-analysis Network resilience analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: AI analysis of network issues
        // Intentionally slow down network to trigger analysis
        await page.route('**/*', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.continue();
        });

        await page.goto(`${CONFIG.BASE_URL}/broken_images`);

        // This will fail due to network timing, triggering AI analysis
        const images = page.locator('img');
        await expect(images.first()).toHaveAttribute('naturalWidth', '0', {
            timeout: 2000
        });
    });
});

// ============================================================================
// 📊 BATCH PROCESSING & PERFORMANCE DEMONSTRATION
// ============================================================================

test.describe('Batch Processing Performance', () => {
    test('@batch Form validation analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Batch processing of validation failures
        await page.goto(`${CONFIG.BASE_URL}/inputs`);

        // Intentionally input invalid data to trigger AI analysis
        await selfHealingFill(page, ['input[type="number"]'], 'abc');

        // This will fail, allowing AI to analyze input validation patterns
        const inputValue = await page.locator('input[type="number"]').inputValue();
        expect(inputValue).toBe('abc');
    });

    test('@batch State management analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Batch processing of state management issues
        await page.goto(`${CONFIG.BASE_URL}/checkboxes`);

        // Create complex state changes
        await selfHealingClick(page, [SELECTORS.COMMON.CHECKBOXES]);
        await selfHealingClick(page, [SELECTORS.COMMON.CHECKBOXES + ':checked']);

        // Intentionally wrong expectation to trigger analysis
        const checkedBoxes = await page.locator(SELECTORS.COMMON.CHECKBOXES + ':checked').count();
        expect(checkedBoxes).toBe(3);
    });

    test('@batch Shadow DOM analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Batch processing of Shadow DOM issues
        await page.goto(`${CONFIG.BASE_URL}/shadowdom`);

        // Intentionally use incorrect Shadow DOM selectors
        await selfHealingClick(page, [
            '#shadow_content',
            '::shadow span',
            'text=My default text'
        ]);

        // This will fail, allowing AI to analyze Shadow DOM structure
        await expect(page.locator('#shadow_content')).toHaveText('Changed text');
    });
});

// ============================================================================
// 📈 ENHANCED REPORTING DEMONSTRATION
// ============================================================================

test.describe('Enhanced Reporting Features', () => {
    test('@reporting Iframe interaction analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Enhanced reporting for iframe issues
        await page.goto(`${CONFIG.BASE_URL}/iframe`);

        // Intentionally incorrect iframe handling
        await selfHealingClick(page, ['#mce_0_ifr']);
        await page.keyboard.type('Test content');

        // This will fail, triggering detailed iframe analysis reporting
        const content = await page.frameLocator('#mce_0_ifr').locator('#tinymce').textContent();
        expect(content).toBe('Wrong content');
    });

    test('@reporting Race condition analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Enhanced reporting for timing issues
        await page.goto(`${CONFIG.BASE_URL}/notification_message_rendered`);

        // Create potential race condition
        await Promise.all([
            selfHealingClick(page, ['#flash-messages a', 'a:has-text("click here")']),
            page.reload()
        ]);

        // This will fail, allowing enhanced reporting of race conditions
        await expect(page.locator('#flash')).toBeVisible({
            timeout: 1000
        });
    });

    test('@reporting Error recovery analysis', async ({ page }) => {
        // ❌ DEMONSTRATES: Enhanced reporting for error recovery patterns
        await page.goto(`${CONFIG.BASE_URL}/status_codes`);

        // Intentionally trigger a 500 error
        await selfHealingClick(page, ['a:has-text("500")', 'a[href="status_codes/500"]']);

        // This will fail, triggering enhanced error recovery analysis
        await expect(page.locator(SELECTORS.COMMON.H2)).toHaveText('Welcome to the-internet', {
            timeout: 2000
        });
    });
});

// ============================================================================
// 🔄 INTEGRATION & END-TO-END DEMONSTRATION
// ============================================================================

test.describe('Integration Tests', () => {
    test('@integration Complete user journey with self-healing', async ({ page }) => {
        // ✅ DEMONSTRATES: Full integration of self-healing capabilities
        await page.goto(`${CONFIG.BASE_URL}/login`);

        // Complete successful login flow
        await performLogin(page, CONFIG.CREDENTIALS.VALID);

        await expect(page.locator(SELECTORS.LOGIN.SUCCESS_FLASH)).toBeVisible();

        // Navigate and interact with multiple elements
        await selfHealingClick(page, ['a:has-text("Logout")', '.button.secondary']);
        await expect(page.locator(SELECTORS.COMMON.H2)).toHaveText('Login Page');
    });

    test('@integration Mixed success and failure scenarios', async ({ page }) => {
        // ✅ DEMONSTRATES: System handling mixed outcomes
        await page.goto(`${CONFIG.BASE_URL}/checkboxes`);

        // Successful interactions
        await selfHealingClick(page, [SELECTORS.COMMON.CHECKBOXES]);
        await expect(page.locator(SELECTORS.COMMON.CHECKBOXES).first()).toBeChecked();

        // This will create a failure for analysis
        const allCheckboxes = await page.locator(SELECTORS.COMMON.CHECKBOXES).count();
        expect(allCheckboxes).toBe(1); // Intentionally wrong to trigger analysis
    });
});

/**
 * ============================================================================
 * TEST EXECUTION SUMMARY
 * ============================================================================
 *
 * Run these tests to see the AI Testcase Analyzer in action:
 *
 * ✅ PASSING TESTS demonstrate self-healing working correctly
 * ❌ FAILING TESTS trigger AI analysis and enhanced reporting
 * 📊 BATCH PROCESSING shows performance improvements
 * 📈 ENHANCED UI displays interactive failure analysis
 *
 * Use: npm test (runs all tests)
 * Use: npm run analyze (generates enhanced AI report)
 * ============================================================================
 */