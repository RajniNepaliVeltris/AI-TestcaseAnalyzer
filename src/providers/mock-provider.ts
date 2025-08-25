import { AnalysisResult } from '../reporting/types';

type MockAnalysisTemplate = {
  reason: string;
  resolution: string;
  prevention: string;
  category: string;
};

const mockAnalysisTemplates: { [key: string]: MockAnalysisTemplate } = {
  'strict-mode-violation': {
    reason: 'The test failed due to Playwright\'s strict mode violation. The locator \'h4\' matches multiple elements on the page, but strict mode requires exactly one match.',
    resolution: 'Update the locator to target a specific element using more specific selectors like data-testid, aria-label, or combine multiple attributes.',
    prevention: 'Always use specific selectors that uniquely identify elements. Consider using data-testid attributes or role-based selectors with labels.',
    category: 'Selector Issue'
  },
  'self-healing-timeout': {
    reason: 'The self-healing wait timed out while trying alternative selectors. None of the provided selectors were able to locate the expected element within the timeout period.',
    resolution: 'Review the selectors being used and verify the element\'s presence. Consider increasing timeout or adjusting the self-healing selector list.',
    prevention: 'Implement more resilient selectors and ensure proper loading states are handled. Monitor application performance that might affect element rendering.',
    category: 'Timeout'
  },
  'invalid-selector': {
    reason: 'The test failed due to an invalid selector syntax. The text= selector is being used incorrectly within a CSS selector string.',
    resolution: 'Split the selector into separate Playwright locators. Use proper Playwright APIs for text matching instead of CSS selectors.',
    prevention: 'Follow Playwright\'s locator best practices. Use separate locators for different targeting strategies rather than combining them in CSS.',
    category: 'Selector Issue'
  }
};

export function getMockAnalysis(error: string, stack: string): AnalysisResult {
  // Map the error to a template based on the error message patterns
  let template: MockAnalysisTemplate;
  
  if (error.includes('strict mode violation') || stack.includes('strict mode violation')) {
    template = mockAnalysisTemplates['strict-mode-violation'];
  } else if (error.includes('Self-healing wait failed') || stack.includes('selfHealingWait')) {
    template = mockAnalysisTemplates['self-healing-timeout'];
  } else if (error.includes('Unexpected token "="') || error.includes('text=')) {
    template = mockAnalysisTemplates['invalid-selector'];
  } else {
    // Fallback template for unknown errors
    template = {
      reason: 'The test failed with an unrecognized error pattern. Further investigation may be needed.',
      resolution: 'Review the error message and stack trace for details. Check the test context and application state.',
      prevention: 'Add error logging and monitoring. Consider adding test prerequisites or setup verification.',
      category: 'Unknown Error'
    };
  }

  // Add context and metadata
  return {
    ...template,
    provider: 'openai', // Simulate as if OpenAI provided this analysis
    aiStatus: {
      openai: {
        available: true,
        error: null
      },
      together: {
        available: false,
        error: null
      }
    },
    context: {
      stack: stack,
      error: error,
      browser: 'chromium',
      device: 'Desktop',
      viewport: { width: 1280, height: 720 },
      performance: {
        loadTime: 1200,
        cpuUsage: 0.15,
        memoryUsage: 0.45
      }
    }
  };
}