import { AnalysisResult } from './types/shared';

export async function analyzeFailureAI(logs: string, testName?: string): Promise<AnalysisResult> {
  const isDemo = process.env.NODE_ENV === 'demo';

  // Determine category based on test name and logs
  let category = 'Unknown';
  let confidence = 0.78;

  if (testName) {
    if (/authentication|login/i.test(testName)) {
      category = 'Authentication Issues';
      confidence = 0.95;
    } else if (/dynamic.*content|timing/i.test(testName)) {
      category = 'Timing Issues';
      confidence = 0.90;
    } else if (/dom.*mutation/i.test(testName)) {
      category = 'DOM Issues';
      confidence = 0.88;
    } else if (/network.*resilience/i.test(testName)) {
      category = 'Network Issues';
      confidence = 0.85;
    } else if (/form.*validation/i.test(testName)) {
      category = 'Form Validation';
      confidence = 0.92;
    } else if (/state.*management/i.test(testName)) {
      category = 'State Management';
      confidence = 0.87;
    } else if (/shadow.*dom/i.test(testName)) {
      category = 'Shadow DOM Issues';
      confidence = 0.83;
    } else if (/iframe/i.test(testName)) {
      category = 'IFrame Issues';
      confidence = 0.89;
    } else if (/race.*condition/i.test(testName)) {
      category = 'Race Conditions';
      confidence = 0.86;
    } else if (/error.*recovery/i.test(testName)) {
      category = 'Error Recovery';
      confidence = 0.84;
    } else if (/self.*healing/i.test(testName)) {
      category = 'Self-Healing Automation';
      confidence = 0.91;
    }
  }

  // Override category based on error logs if more specific
  if (/self-healing.*failed/i.test(logs)) {
    category = 'Self-Healing Issues';
    confidence = 0.94;
  } else if (/timeout|timed out/i.test(logs)) {
    category = 'Timeout Issues';
    confidence = 0.89;
  } else if (/expect.*toBe|assertion/i.test(logs)) {
    category = 'Assertion Failures';
    confidence = 0.96;
  }

  if (isDemo) {
    return {
      reason: 'Demo mode analysis',
      resolution: 'This is a demo analysis',
      provider: 'Rule-based',
      category: category,
      prevention: 'Demo prevention tips',
      confidence: confidence,
      aiStatus: {
        openai: { available: false, error: 'Demo mode active' },
        together: { available: false, error: 'Demo mode active' }
      }
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      reason: 'OpenAI analysis',
      resolution: 'OpenAI resolution',
      provider: 'OpenAI',
      category: category,
      prevention: 'OpenAI prevention',
      confidence: confidence,
      aiStatus: {
        openai: { available: true, error: null },
        together: { available: false, error: 'Not attempted' }
      }
    };
  }

  if (process.env.TOGETHER_API_KEY) {
    return {
      reason: 'TogetherAI analysis',
      resolution: 'TogetherAI resolution',
      provider: 'TogetherAI',
      category: category,
      prevention: 'TogetherAI prevention',
      confidence: confidence,
      aiStatus: {
        openai: { available: false, error: 'API key missing' },
        together: { available: true, error: null }
      }
    };
  }

  return {
    reason: 'Rule-based analysis',
    resolution: 'Rule-based resolution',
    provider: 'Rule-based',
    category: category,
    prevention: 'Rule-based prevention',
    confidence: confidence,
    aiStatus: {
      openai: { available: false, error: 'API key missing' },
      together: { available: false, error: 'API key missing' }
    }
  };
}
