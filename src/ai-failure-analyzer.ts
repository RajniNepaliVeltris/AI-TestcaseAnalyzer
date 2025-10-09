import { AIService, TestFailure } from './services/ai/AIService';
import { AnalysisResult } from './types/shared';

export async function analyzeFailureAI(logs: string, testName?: string): Promise<AnalysisResult> {
  const isDemo = process.env.NODE_ENV === 'demo';

  if (isDemo) {
    // Demo mode: return mock analysis
    return {
      reason: 'Demo mode analysis',
      resolution: 'This is a demo analysis',
      provider: 'Rule-based',
      category: 'Demo',
      prevention: 'Demo prevention tips',
      confidence: 0.5,
      aiStatus: {
        openai: { available: false, error: 'Demo mode active' },
        together: { available: false, error: 'Demo mode active' }
      }
    };
  }

  // Production mode: use real AI service
  const aiService = new AIService();

  // Parse the logs to extract failure information
  const failure: TestFailure = {
    testName: testName || 'Unknown Test',
    error: extractErrorFromLogs(logs),
    stackTrace: logs,
    timestamp: new Date()
  };

  try {
    const result = await aiService.analyzeFailure(failure);
    return {
      reason: result.rootCause,
      resolution: result.suggestedFix,
      provider: 'AI Service',
      category: result.category,
      prevention: 'AI-generated prevention strategies',
      confidence: result.confidence,
      aiStatus: {
        openai: { available: true, error: null },
        together: { available: true, error: null }
      }
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Fallback to rule-based analysis
    return {
      reason: 'AI analysis failed, using rule-based fallback',
      resolution: 'Manual investigation required',
      provider: 'Rule-based',
      category: 'Analysis Error',
      prevention: 'Check AI service configuration',
      confidence: 0.3,
      aiStatus: {
        openai: { available: false, error: (error as Error).message },
        together: { available: false, error: (error as Error).message }
      }
    };
  }
}

function extractErrorFromLogs(logs: string): string {
  // Extract the main error message from logs
  const lines = logs.split('\n');
  for (const line of lines) {
    if (line.includes('Error:') || line.includes('error:')) {
      return line.trim();
    }
  }
  return logs.substring(0, 200); // Return first 200 chars if no clear error found
}