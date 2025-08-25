import { FailureArtifact } from './types/shared';

// Simple clustering by error message similarity (can be replaced with ML)
export function clusterFailures(failures: FailureArtifact[]): Record<string, FailureArtifact[]> {
  console.log('[DEBUG] Starting failure clustering...');
  console.log(`[DEBUG] Number of failures to cluster: ${failures.length}`);
  
  if (!Array.isArray(failures)) {
    console.error('[DEBUG] failures is not an array:', failures);
    return { 'Error': [] };
  }

  const clusters: Record<string, FailureArtifact[]> = {};
  for (const fail of failures) {
    let key = 'Other';
    
    const error = fail.error || '';
    console.log(`[DEBUG] Processing error: ${error.substring(0, 100)}...`);
    
    if (/timeout|timed out|exceeded.*ms/i.test(error)) key = 'Timeout';
    else if (/locator|selector|element not found/i.test(error)) key = 'Locator Issue';
    else if (/network|connection|net::ERR_/i.test(error)) key = 'Network Issue';
    else if (/assert|expect|match|should/i.test(error)) key = 'Assertion Failure';
    else if (/shadow|slot|component/i.test(error)) key = 'Shadow DOM Issue';
    else if (/iframe|frame/i.test(error)) key = 'IFrame Issue';
    else if (/form|input|validation/i.test(error)) key = 'Form Validation Issue';
    
    console.log(`[DEBUG] Classified as: ${key}`);
    
    if (!clusters[key]) {
      clusters[key] = [];
      console.log(`[DEBUG] Created new cluster: ${key}`);
    }
    clusters[key].push(fail);
  }

  // Log final cluster distribution
  console.log('[DEBUG] Final cluster distribution:');
  Object.entries(clusters).forEach(([key, items]) => {
    console.log(`[DEBUG] ${key}: ${items.length} failures`);
  });

  return clusters;
}
