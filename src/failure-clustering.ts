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
    
    // Determine failure category based on actual error patterns from tests
    if (/self-healing wait failed|timeout|timed out|exceeded.*ms/i.test(errorMessage)) {
      key = 'Timeout Issues';
    } else if (/self-healing click failed|self-healing fill failed|unable to fill|locator.*timeout|element.*not found|selector.*failed/i.test(errorMessage)) {
      key = 'Element Interaction';
    } else if (/network|connection|net::ERR_|resilience|naturalWidth/i.test(errorMessage)) {
      key = 'Network Issues';
    } else if (/expect.*toBe|expect.*toHave|assertion|received.*expected/i.test(errorMessage)) {
      key = 'Assertion Failures';
    } else if (/auth|login|credentials|authentication/i.test(errorMessage)) {
      key = 'Authentication';
    } else if (/iframe|frame|tinymce/i.test(errorMessage)) {
      key = 'IFrame Issues';
    } else if (/form|input|validation|type.*number/i.test(errorMessage)) {
      key = 'Form Validation';
    } else if (/shadow.*dom|::shadow/i.test(errorMessage)) {
      key = 'Shadow DOM';
    } else if (/dom mutation|dynamic.*content/i.test(errorMessage)) {
      key = 'DOM Issues';
    } else if (/race.*condition|notification.*message/i.test(errorMessage)) {
      key = 'Race Conditions';
    } else if (/error.*recovery|status.*codes/i.test(errorMessage)) {
      key = 'Error Recovery';
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
