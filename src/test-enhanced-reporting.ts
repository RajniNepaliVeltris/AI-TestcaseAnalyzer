import { TestAnalyzer } from './services/analyzer/TestAnalyzer';
import { TestFailure } from './services/ai/AIService';
import dotenv from 'dotenv';

dotenv.config();

async function testEnhancedReporting() {
    const analyzer = new TestAnalyzer();

    // Create sample test results with various types of failures
    const sampleResults = {
        passed: [] as TestFailure[],
        failed: [
            {
                testName: 'Login Test 1',
                error: 'TimeoutError: Element .login-button not found after 5000ms',
                stackTrace: `Error: TimeoutError: Element .login-button not found
    at Page.click (/tests/login.spec.ts:25:10)
    at LoginPage.clickLoginButton (/pages/LoginPage.ts:15:8)`,
                timestamp: '2025-08-26T10:00:00'
            },
            {
                testName: 'Login Test 2',
                error: 'TimeoutError: Element .signin-button not found after 5000ms',
                stackTrace: `Error: TimeoutError: Element .signin-button not found
    at Page.click (/tests/login.spec.ts:25:10)
    at LoginPage.clickLoginButton (/pages/LoginPage.ts:15:8)`,
                timestamp: new Date('2025-08-26T10:05:00')
            },
            {
                testName: 'API Test',
                error: 'NetworkError: Failed to fetch data: 404 Not Found',
                stackTrace: `Error: NetworkError: Failed to fetch data
    at ApiClient.getData (/services/api.ts:45:12)
    at TestCase.fetchUserData (/tests/api.spec.ts:30:5)`,
                timestamp: new Date('2025-08-26T10:10:00')
            },
            {
                testName: 'Form Validation',
                error: 'AssertionError: expected form to be valid',
                stackTrace: `Error: AssertionError: expected form to be valid
    at FormValidator.validate (/services/validator.ts:28:15)
    at TestCase.validateForm (/tests/form.spec.ts:42:8)`,
                timestamp: new Date('2025-08-26T10:15:00')
            },
            {
                testName: 'User Profile',
                error: 'ElementNotVisible: Profile menu not visible',
                stackTrace: `Error: ElementNotVisible: Profile menu not visible
    at Page.click (/tests/profile.spec.ts:55:12)
    at ProfilePage.openMenu (/pages/ProfilePage.ts:23:10)`,
                timestamp: new Date('2025-08-26T10:20:00')
            }
        ],
        skipped: [] as TestFailure[],
        duration: 15000
    };

    try {
        console.log('Generating enhanced test report...');
        const reports = await analyzer.analyzeTestRun(sampleResults);
        console.log('Reports generated successfully:');
        console.log('- Standard report:', reports.standardReport);
        console.log('- Enhanced report:', reports.enhancedReport);
        
        console.log('\nOpen the enhanced report in your browser to see:');
        console.log('1. Interactive failure trends');
        console.log('2. Category distribution');
        console.log('3. Time-based analysis');
        console.log('4. Detailed cluster information');
    } catch (error: any) {
        console.error('Error generating reports:', error?.message || error);
    }
}

// Run the test
testEnhancedReporting().catch(console.error);