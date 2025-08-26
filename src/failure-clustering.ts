import { FailureArtifact } from './types/shared';

// We'll use our own interface and convert to FailureArtifact when needed
interface TestFailure {
  testName: string;
  error: string | { message: string; stack?: string };
  stack?: string;
  context?: string;
  pattern?: string;
  screenshot?: string | null;
}

// Simple clustering by error message similarity (can be replaced with ML)
export function clusterFailures(failures: TestFailure[]): Record<string, FailureArtifact[]> {
  console.log('[DEBUG] Starting failure clustering...');
  console.log(`[DEBUG] Number of failures to cluster: ${failures.length}`);
  
  if (!Array.isArray(failures)) {
    console.error('[DEBUG] failures is not an array:', failures);
    return { 'Error': [] };
  }

  const clusters: Record<string, FailureArtifact[]> = {};
  const uniqueTests = new Set<string>();

  for (const fail of failures) {
    let key = 'Other';
    
    if (!fail) continue;
    
    // Convert to standard error format
    const errorMessage = typeof fail.error === 'string' ? fail.error : 
                       fail.error?.message || fail.context || 'Unknown error';
    const errorStack = typeof fail.error === 'string' ? fail.stack || '' :
                     fail.error?.stack || fail.stack || '';
                 
    console.log(`[DEBUG] Processing test failure: ${fail.testName}`);
    uniqueTests.add(fail.testName);
    
    // Determine failure category
    if (/timeout|timed out|exceeded.*ms/i.test(errorMessage)) {
      key = 'Timeout';
    } else if (/toBeVisible|locator|selector|element not found/i.test(errorMessage)) {
      key = 'Element Visibility';
    } else if (/network|connection|net::ERR_/i.test(errorMessage)) {
      key = 'Network Issue';
    } else if (/assert|expect|match|should/i.test(errorMessage)) {
      key = 'Assertion Failure';
    } else if (/auth|login|credentials/i.test(errorMessage)) {
      key = 'Authentication';
    } else if (/iframe|frame/i.test(errorMessage)) {
      key = 'IFrame Issue';
    } else if (/form|input|validation/i.test(errorMessage)) {
      key = 'Form Validation';
    }
    
    console.log(`[DEBUG] Classified as: ${key}`);
    
    if (!clusters[key]) {
      clusters[key] = [];
      console.log(`[DEBUG] Created new cluster: ${key}`);
    }

    // Convert to FailureArtifact format
    clusters[key].push({
      testName: fail.testName,
      error: errorMessage,
      stack: errorStack
    });
  }

  // Log final cluster distribution
  console.log('[DEBUG] Final cluster distribution:');
  Object.entries(clusters).forEach(([key, items]) => {
    console.log(`[DEBUG] ${key}: ${items.length} failures`);
  });

  return clusters;
}
