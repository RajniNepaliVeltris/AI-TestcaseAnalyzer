import { AnalysisResult, TestContext } from '../types/shared';
import { analyzeFailureAI } from '../ai-failure-analyzer';
import type { FailureArtifact } from '../types/shared';
import { getMockAnalysis } from '../providers/mock-provider';

// Extend AnalysisResult to include test details
interface EnhancedAnalysisResult extends AnalysisResult {
  testName?: string;
  error?: string;
  stack?: string;
}

export interface ProviderManagerOptions {
  useMockProviders?: boolean;
}

export class ProviderManager {
  private useMockProviders: boolean;
  
  private mockResponses: any;

  constructor(options?: ProviderManagerOptions) {
    this.useMockProviders = options?.useMockProviders || process.argv.includes('--demo') || process.env.NODE_ENV === 'demo' || process.env.AI_DEMO === 'true' || false;
    this.mockResponses = {
      authFailure: {
        reason: "Authentication system failure detected",
        resolution: "1. Verify credentials handling\n2. Implement retry mechanism\n3. Add proper error logging",
        provider: "OpenAI",
        category: "Authentication",
        prevention: "1. Implement credential validation\n2. Add rate limiting\n3. Improve error messaging",
        confidence: 0.95
      },
      timeout: {
        reason: "Timing-related failure detected",
        resolution: "1. Increase timeout values\n2. Add explicit wait conditions\n3. Handle dynamic content",
        provider: "TogetherAI",
        category: "Timing",
        prevention: "1. Implement smart waiting\n2. Add retry mechanisms\n3. Handle async operations",
        confidence: 0.9
      },
      element: {
        reason: "Element interaction failure",
        resolution: "1. Use reliable selectors\n2. Add wait conditions\n3. Handle dynamic content",
        provider: "OpenAI",
        category: "UI Interaction",
        prevention: "1. Implement element checks\n2. Add timeout configuration\n3. Use robust selectors",
        confidence: 0.85
      }
    };

    if (this.useMockProviders) {
      console.log('🧪 Demo Mode: Using simulated AI analysis');
      console.log('  - Using OpenAI and TogetherAI simulated responses');
      console.log('  - No actual API calls will be made');
      console.log('  - Demonstrating realistic AI analysis capabilities\n');
    }
  }
  
  private determineBasicReason(error: string): string {
    if (error.toLowerCase().includes('timeout')) {
      return 'Test exceeded timeout limit';
    }
    if (error.toLowerCase().includes('visible')) {
      return 'Element visibility issue detected';
    }
    if (error.toLowerCase().includes('auth') || error.toLowerCase().includes('login')) {
      return 'Authentication failure detected';
    }
    return 'Test execution failed';
  }

  private determineErrorCategory(error: string): string {
    if (error.toLowerCase().includes('timeout')) {
      return 'Timing';
    }
    if (error.toLowerCase().includes('visible') || error.toLowerCase().includes('element')) {
      return 'UI Interaction';
    }
    if (error.toLowerCase().includes('auth') || error.toLowerCase().includes('login')) {
      return 'Authentication';
    }
    return 'System Error';
  }

  async analyzeWithProviders(error: string, stack: string, testName?: string): Promise<EnhancedAnalysisResult> {
    // Demo mode with enhanced failure pattern detection
    if (this.useMockProviders) {
      console.log(`🔍 Analyzing test failure: ${testName || 'Unknown test'}`);
      
      // Determine failure type from error message and stack
      let analysisType = 'element'; // default
      
      if (error.toLowerCase().includes('auth') || error.toLowerCase().includes('login') || error.toLowerCase().includes('credential')) {
        analysisType = 'authFailure';
      } else if (error.toLowerCase().includes('timeout') || error.toLowerCase().includes('wait')) {
        analysisType = 'timeout';
      }
      
      const analysis = this.mockResponses[analysisType];
      
      // Add test-specific details
      analysis.testName = testName;
      analysis.error = error;
      analysis.stack = stack;
      
      const provider = analysis.provider || 'AI';
      console.log(`✨ ${provider} analysis complete (${analysisType} pattern detected)`);
      return analysis;
    }

    // Production mode with real AI providers
    const errorContext = `${error}\n${stack || ''}`;
    
    // Try OpenAI first
    try {
      const aiResult = await analyzeFailureAI(errorContext);
      if (aiResult.provider === "OpenAI") {
        return aiResult;
      }
    } catch (err) {
      console.log('⚠️ OpenAI analysis failed, trying TogetherAI...');
      
      // Try TogetherAI as fallback
      try {
        const aiResult = await analyzeFailureAI(errorContext);
        if (aiResult.provider === "TogetherAI") {
          return aiResult;
        }
      } catch (togetherErr) {
        console.log('⚠️ TogetherAI analysis failed, falling back to rule-based analysis...');
        
        // Final fallback to rule-based analysis
        return {
          reason: this.determineBasicReason(error),
          resolution: "1. Review error details\n2. Check test configuration\n3. Verify test environment",
          provider: "Rule-based",
          category: this.determineErrorCategory(error),
          prevention: "1. Implement proper error handling\n2. Add test preconditions\n3. Improve test stability",
          confidence: 0.7,
          testName,
          error,
          stack
        };
      }
    }

    // If all providers fail, return a basic analysis
    return {
      reason: "All analysis providers failed",
      resolution: "Please check logs for provider errors",
      provider: "None",
      category: "System Error",
      prevention: "Ensure AI providers are properly configured"
    };
  }

  getProviderError(err: unknown): { message: string; type: 'quota' | 'auth' | 'other' } {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    if (errorMessage.includes("quota exhausted") || errorMessage.includes("429") || errorMessage.includes("402")) {
      return { message: "Quota/Payment Required", type: 'quota' };
    }
    
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return { message: "Invalid API Key - Check .env file", type: 'auth' };
    }
    
    return { message: "Error: " + (errorMessage || "Unknown"), type: 'other' };
  }
}