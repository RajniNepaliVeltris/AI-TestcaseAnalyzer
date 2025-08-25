import { TestAnalyzer } from './services/analyzer/TestAnalyzer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSetup() {
    console.log('Testing TRACE setup...');
    
    // Verify environment variables
    console.log('\nChecking environment variables:');
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '✓ Present' : '✗ Missing');
    console.log('TogetherAI API Key:', process.env.TOGETHER_API_KEY ? '✓ Present' : '✗ Missing');
    console.log('Ollama Endpoint:', process.env.OLLAMA_ENDPOINT || 'http://localhost:11434 (default)');

    // Create test analyzer instance
    const analyzer = new TestAnalyzer();

    // Create a sample test failure for analysis
    const sampleFailure = {
        passed: [],
        failed: [{
            testName: 'Sample Test',
            error: 'TimeoutError: Element not found: .login-button',
            stackTrace: `Error: TimeoutError: Element not found: .login-button
    at Page.click (/tests/login.spec.ts:25:10)
    at LoginPage.clickLoginButton (/pages/LoginPage.ts:15:8)
    at TestCase.loginTest (/tests/login.spec.ts:10:5)`,
            timestamp: new Date()
        }],
        skipped: [],
        duration: 1500
    };

    try {
        console.log('\nTesting analysis pipeline...');
        const reportPath = await analyzer.analyzeTestRun(sampleFailure);
        console.log('✓ Analysis completed successfully');
        console.log('✓ Report generated at:', reportPath);
    } catch (error: any) {
        console.error('✗ Error during analysis:', error?.message || 'Unknown error');
        throw error;
    }
}

// Run the test
testSetup().catch(error => {
    console.error('Setup test failed:', error);
    process.exit(1);
});