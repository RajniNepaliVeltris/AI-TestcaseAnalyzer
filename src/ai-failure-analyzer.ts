import { AnalysisResult } from './types/shared';

export async function analyzeFailureAI(logs: string, testName?: string): Promise<AnalysisResult> {
  const isDemo = process.env.NODE_ENV === 'demo';
  
  if (isDemo) {
    return {
      reason: 'Demo mode analysis',
      resolution: 'This is a demo analysis',
      provider: 'Rule-based',
      category: 'Element Visibility',
      prevention: 'Demo prevention tips',
      confidence: 0.85,
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
      category: 'Selector Stability',
      prevention: 'OpenAI prevention',
      confidence: 0.92,
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
      category: 'Timeout',
      prevention: 'TogetherAI prevention',
      confidence: 0.88,
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
    category: 'Timing',
    prevention: 'Rule-based prevention',
    confidence: 0.78,
    aiStatus: {
      openai: { available: false, error: 'API key missing' },
      together: { available: false, error: 'API key missing' }
    }
  };
}
