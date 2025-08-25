import { AnalysisResult, TestContext } from '../types/shared';
import { analyzeFailureAI } from '../ai-failure-analyzer';
import type { FailureArtifact } from '../types/shared';
import { getMockAnalysis } from '../providers/mock-provider';

export interface ProviderManagerOptions {
  useMockProviders?: boolean;
}

export class ProviderManager {
  private useMockProviders: boolean;
  
  constructor(options?: ProviderManagerOptions) {
    this.useMockProviders = options?.useMockProviders || process.env.AI_DEMO === 'true' || false;
    if (this.useMockProviders) {
      console.log('🧪 Mock AI providers enabled for demo mode');
    }
  }
  
  async analyzeWithProviders(error: string, stack: string, testName?: string): Promise<AnalysisResult> {
    // Check for demo mode
    if (this.useMockProviders) {
      return getMockAnalysis(error, stack, testName);
    }

    // Try OpenAI first
    try {
      const aiResult = await analyzeFailureAI(error + "\n" + (stack || ""));
      if (aiResult.provider === "OpenAI") {
        return aiResult;
      }
    } catch (err) {
      // Try TogetherAI as fallback
      try {
        const aiResult = await analyzeFailureAI(error + "\n" + (stack || ""));
        if (aiResult.provider === "TogetherAI") {
          return aiResult;
        }
      } catch (togetherErr) {
        // Final fallback to rule-based analysis
        return {
          reason: "Test failed with error",
          resolution: "Review the error and stack trace for details",
          provider: "Rule-based",
          category: "System Error",
          prevention: "Implement proper error handling",
          confidence: 0.7
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