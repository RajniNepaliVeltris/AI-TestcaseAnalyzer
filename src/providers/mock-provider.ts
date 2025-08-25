import { AnalysisResult } from '../reporting/types';

type MockAnalysisTemplate = {
  reason: string;
  resolution: string;
  prevention: string;
  category: string;
  confidence?: number;
  provider?: string;
};

const mockAnalysisTemplates: { [key: string]: MockAnalysisTemplate } = {
  'strict-mode-violation': {
    reason: 'The test failed due to Playwright\'s strict mode violation. The locator \'h4\' matches multiple elements on the page, but strict mode requires exactly one match.',
    resolution: 'Update the locator to target a specific element using more specific selectors like data-testid, aria-label, or combine multiple attributes.',
    prevention: 'Always use specific selectors that uniquely identify elements. Consider using data-testid attributes or role-based selectors with labels.',
    category: 'Selector Issue',
    confidence: 0.95,
    provider: 'OpenAI'
  },
  'self-healing-timeout': {
    reason: 'The self-healing wait timed out while trying alternative selectors. None of the provided selectors were able to locate the expected element within the timeout period.',
    resolution: 'Review the selectors being used and verify the element\'s presence. Consider increasing timeout or adjusting the self-healing selector list.',
    prevention: 'Implement more resilient selectors and ensure proper loading states are handled. Monitor application performance that might affect element rendering.',
    category: 'Timeout',
    confidence: 0.89,
    provider: 'OpenAI'
  },
  'invalid-selector': {
    reason: 'The test failed due to an invalid selector syntax. The text= selector is being used incorrectly within a CSS selector string.',
    resolution: 'Split the selector into separate Playwright locators. Use proper Playwright APIs for text matching instead of CSS selectors.',
    prevention: 'Follow Playwright\'s locator best practices. Use separate locators for different targeting strategies rather than combining them in CSS.',
    category: 'Selector Issue',
    confidence: 0.92,
    provider: 'OpenAI'
  },
  'network-issue': {
    reason: 'Test failed due to network connectivity problems. The request to the API endpoint timed out or returned an unexpected status code.',
    resolution: 'Implement network request mocking or stubbing for reliable test execution. Add retry logic for transient network failures.',
    prevention: 'Use test doubles for external dependencies. Set up proper test isolation with mock services for APIs.',
    category: 'Network Issue',
    confidence: 0.91,
    provider: 'TogetherAI'
  },
  'element-not-visible': {
    reason: 'Element located but not visible or clickable due to being covered by another element or positioned outside viewport.',
    resolution: 'Add explicit waits for element visibility. Use force:true option when necessary. Scroll element into view before interaction.',
    prevention: 'Implement proper wait strategies. Check CSS for z-index issues. Verify viewport dimensions for responsive tests.',
    category: 'Element Visibility',
    confidence: 0.94,
    provider: 'OpenAI'
  },
  'dynamic-content': {
    reason: 'Test failed due to dynamic content changes. The application state changed during test execution causing elements to disappear or change.',
    resolution: 'Implement more robust waiting mechanisms based on application state rather than fixed timeouts. Use waitForFunction for custom conditions.',
    prevention: 'Stabilize test environment. Add synchronization points based on application events rather than arbitrary waits.',
    category: 'State Management',
    confidence: 0.87,
    provider: 'TogetherAI'
  },
  'iframe-context': {
    reason: 'Test failed to locate element in iframe context. Playwright requires explicit frame handling for elements inside iframes.',
    resolution: 'Use page.frameLocator() to target the correct iframe before interacting with elements inside it.',
    prevention: 'Create helper functions for frame navigation. Document iframe handling requirements in test documentation.',
    category: 'DOM Structure',
    confidence: 0.93,
    provider: 'OpenAI'
  },
  'assertion-mismatch': {
    reason: 'Assertion failed due to unexpected application state or behavior. Expected condition was not met within timeout period.',
    resolution: 'Verify application logic and test assumptions. Adjust expectations to match actual application behavior if appropriate.',
    prevention: 'Add more detailed assertions with custom error messages. Implement soft assertions for diagnostic information.',
    category: 'Assertion',
    confidence: 0.90,
    provider: 'TogetherAI'
  }
};

export function getMockAnalysis(error: string, stack: string, testName?: string): AnalysisResult {
  // Map the error to a template based on the error message patterns
  let template: MockAnalysisTemplate;
  let templateKey = '';
  
  // Advanced pattern matching for errors
  if (error.includes('strict mode violation') || stack.includes('strict mode violation')) {
    templateKey = 'strict-mode-violation';
  } else if (error.includes('Self-healing wait failed') || stack.includes('selfHealingWait')) {
    templateKey = 'self-healing-timeout';
  } else if (error.includes('Unexpected token "="') || error.includes('text=')) {
    templateKey = 'invalid-selector';
  } else if (error.includes('net::ERR') || error.includes('ECONNREFUSED') || error.includes('status=4')) {
    templateKey = 'network-issue';
  } else if (error.includes('not visible') || error.includes('element is not visible') || error.includes('covered by another element')) {
    templateKey = 'element-not-visible';
  } else if (error.includes('iframe') || stack.includes('frame')) {
    templateKey = 'iframe-context';
  } else if (error.includes('expected') && error.includes('received')) {
    templateKey = 'assertion-mismatch';
  } else if (stack.includes('waitFor') || error.includes('timeout')) {
    templateKey = 'dynamic-content';
  } else {
    // Generate different templates for unknown errors to make the demo more interesting
    const unknownTemplates = [
      {
        reason: 'The test failed with timing-related issues. Application state changed during test execution.',
        resolution: 'Implement more robust waiting strategies based on application state rather than fixed timeouts.',
        prevention: 'Use waitForFunction with custom predicates that accurately reflect application readiness.',
        category: 'Timing Issue',
        confidence: 0.85,
        provider: Math.random() > 0.5 ? 'OpenAI' : 'TogetherAI'
      },
      {
        reason: 'Test environment inconsistency detected. Browser or application state was not as expected.',
        resolution: 'Add environment setup verification steps. Clean state between test runs.',
        prevention: 'Implement robust test fixtures and teardown procedures. Verify environment prerequisites.',
        category: 'Test Environment',
        confidence: 0.83,
        provider: Math.random() > 0.5 ? 'OpenAI' : 'TogetherAI'
      },
      {
        reason: 'JavaScript execution error in the application under test affected test stability.',
        resolution: 'Monitor console errors during test execution. Handle expected application exceptions.',
        prevention: 'Add error boundary assertions. Verify application code quality before test execution.',
        category: 'Application Error',
        confidence: 0.88,
        provider: Math.random() > 0.5 ? 'OpenAI' : 'TogetherAI'
      }
    ];
    
    // Pick a random template for unknown errors
    return {
      ...unknownTemplates[Math.floor(Math.random() * unknownTemplates.length)],
      aiStatus: {
        openai: {
          available: true,
          error: null
        },
        together: {
          available: true,
          error: null
        }
      },
      context: generateContext(error, stack, testName)
    };
  }
  
  // Use the template from our predefined set
  template = mockAnalysisTemplates[templateKey];
  
  // For demo purposes, alternate between OpenAI and TogetherAI
  // This creates a more realistic impression that both providers are being used
  const provider = template.provider || (Math.random() > 0.5 ? 'OpenAI' : 'TogetherAI');
  const confidence = template.confidence || (0.8 + Math.random() * 0.15); // Random confidence between 0.8 and 0.95
  
  // Add context and metadata
  return {
    reason: template.reason,
    resolution: template.resolution,
    prevention: template.prevention,
    category: template.category,
    confidence,
    provider,
    aiStatus: {
      openai: {
        available: provider === 'OpenAI',
        error: null
      },
      together: {
        available: provider === 'TogetherAI',
        error: null
      }
    },
    context: generateContext(error, stack, testName)
  };
}

// Helper function to generate realistic context data
function generateContext(error: string, stack: string, testName?: string): any {
  const browsers = ['chromium', 'firefox', 'webkit'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  
  return {
    stack,
    error,
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    testName,
    timestamp: new Date().toISOString(),
    viewport: { 
      width: Math.random() > 0.7 ? 375 : 1280, 
      height: Math.random() > 0.7 ? 667 : 720 
    },
    performance: {
      loadTime: 800 + Math.floor(Math.random() * 2000),
      cpuUsage: Math.random() * 0.5,
      memoryUsage: 0.3 + Math.random() * 0.6
    },
    // Additional context data that makes the AI analysis appear more sophisticated
    domStats: {
      elements: 100 + Math.floor(Math.random() * 2000),
      frames: Math.floor(Math.random() * 3),
      depth: 5 + Math.floor(Math.random() * 15)
    }
  };
}