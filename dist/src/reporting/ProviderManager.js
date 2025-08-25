"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManager = void 0;
const ai_failure_analyzer_1 = require("../ai-failure-analyzer");
const mock_provider_1 = require("../providers/mock-provider");
class ProviderManager {
    constructor(options) {
        this.useMockProviders = options?.useMockProviders || process.env.AI_DEMO === 'true' || false;
        if (this.useMockProviders) {
            console.log('🧪 Mock AI providers enabled for demo mode');
        }
    }
    async analyzeWithProviders(error, stack, testName) {
        // Check for demo mode
        if (this.useMockProviders) {
            return (0, mock_provider_1.getMockAnalysis)(error, stack, testName);
        }
        // Try OpenAI first
        try {
            const aiResult = await (0, ai_failure_analyzer_1.analyzeFailureAI)(error + "\n" + (stack || ""));
            if (aiResult.provider === "OpenAI") {
                return aiResult;
            }
        }
        catch (err) {
            // Try TogetherAI as fallback
            try {
                const aiResult = await (0, ai_failure_analyzer_1.analyzeFailureAI)(error + "\n" + (stack || ""));
                if (aiResult.provider === "TogetherAI") {
                    return aiResult;
                }
            }
            catch (togetherErr) {
                // Final fallback to rule-based analysis
                const ruleBasedResult = (0, ai_failure_analyzer_1.analyzeFailure)(error + "\n" + (stack || ""));
                return {
                    ...ruleBasedResult,
                    provider: "Rule-based"
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
    getProviderError(err) {
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
exports.ProviderManager = ProviderManager;
