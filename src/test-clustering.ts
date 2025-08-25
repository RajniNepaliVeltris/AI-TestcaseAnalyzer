import { AdvancedClusteringService } from './services/ai/AdvancedClusteringService';
import { TestFailure } from './services/ai/AIService';

async function testClustering() {
    const clusteringService = new AdvancedClusteringService();

    // Sample test failures
    const failures: TestFailure[] = [
        {
            testName: 'Login Test 1',
            error: 'TimeoutError: Element .login-button not found after 5000ms',
            stackTrace: `Error: TimeoutError: Element .login-button not found
    at Page.click (/tests/login.spec.ts:25:10)
    at LoginPage.clickLoginButton (/pages/LoginPage.ts:15:8)`,
            timestamp: new Date('2025-08-26T10:00:00')
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
        }
    ];

    console.log('Testing advanced clustering...\n');
    const clusters = clusteringService.analyzeAndCluster(failures);

    console.log('Clusters found:', clusters.length);
    clusters.forEach((cluster, index) => {
        console.log(`\nCluster ${index + 1}:`);
        console.log('Category:', cluster.category);
        console.log('Failures:', cluster.failures.length);
        console.log('Common Patterns:', cluster.commonPatterns);
        console.log('First Occurrence:', cluster.firstOccurrence.toLocaleString());
        console.log('Last Occurrence:', cluster.lastOccurrence.toLocaleString());
    });
}

testClustering().catch(console.error);