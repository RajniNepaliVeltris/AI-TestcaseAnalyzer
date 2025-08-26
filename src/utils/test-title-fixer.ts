import * as fs from 'fs';
import * as path from 'path';

/**
 * Maps test tags to their actual titles based on the test file content
 */
export function getFixedTestTitle(testName: string): string {
  // Define a mapping of test tags to their actual titles
  const testTitleMapping: Record<string, string> = {
    'auth': 'Test intelligent authentication analysis',
    'timing': 'Test AI-driven dynamic content analysis',
    'dom': 'Test AI analysis of DOM mutations',
    'network': 'Test AI-driven network analysis',
    'validation': 'Test AI analysis of form validation',
    'state': 'Test AI-driven state management analysis',
    'shadow': 'Test AI analysis of Shadow DOM',
    'iframe': 'Test AI-driven iframe analysis',
    'race': 'Test AI analysis of race conditions',
    'recovery': 'Test AI-driven error recovery analysis'
  };
  
  // Extract tag from test name (assuming format like "ai analysis demo auth...")
  let fixedName = testName;
  
  // Check for tag patterns in the test name
  for (const [tag, title] of Object.entries(testTitleMapping)) {
    if (testName.includes(tag)) {
      fixedName = title;
      
      // Add browser info if present
      if (testName.includes('chromium')) fixedName += ' (Chromium)';
      else if (testName.includes('firefox')) fixedName += ' (Firefox)';
      else if (testName.includes('webkit')) fixedName += ' (WebKit)';
      
      break;
    }
  }
  
  return fixedName;
}

/**
 * Fixes test titles in the test results artifacts
 */
export function fixTestTitles(resultsPath: string): void {
  if (fs.existsSync(resultsPath)) {
    try {
      const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      if (resultsData && resultsData.failed && Array.isArray(resultsData.failed)) {
        resultsData.failed = resultsData.failed.map((failure: any) => {
          if (failure.testName) {
            failure.testName = getFixedTestTitle(failure.testName);
          }
          return failure;
        });
        
        fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
      }
    } catch (error) {
      console.error('Error fixing test titles:', error);
    }
  }
}