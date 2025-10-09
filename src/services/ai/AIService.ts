import OpenAI from 'openai';
import natural from 'natural';
import { rateLimiters } from '../../utils/rateLimiter';
import { InputValidator } from '../../utils/inputValidator';

export interface TestFailure {
    testName: string;
    error: string;
    stackTrace: string;
    screenshot?: string;
    timestamp: string | Date;
}

export interface AnalysisResult {
    rootCause: string;
    category: string;
    suggestedFix: string;
    confidence: number;
}

interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

interface CacheEntry {
    result: AnalysisResult;
    timestamp: number;
    ttl: number;
}

export class AIService {
    private openai: OpenAI;
    private tokenizer: natural.WordTokenizer;
    private tfidf: natural.TfIdf;

    // Error handling and performance enhancements
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private cache: Map<string, CacheEntry> = new Map();
    private retryConfig: RetryConfig;
    private cacheTTL: number = 3600000; // 1 hour in milliseconds

    constructor(retryConfig: Partial<RetryConfig> = {}) {
        // Validate environment
        const envValidation = InputValidator.validateEnvironment();
        if (!envValidation.isValid) {
            console.warn('Environment validation warnings:', envValidation.errors.join(', '));
        }

        // Validate API keys
        if (process.env.OPENAI_API_KEY) {
            const keyValidation = InputValidator.validateApiKey(process.env.OPENAI_API_KEY, 'OpenAI');
            if (!keyValidation.isValid) {
                console.warn('OpenAI API key validation warnings:', keyValidation.errors.join(', '));
            }
        }

        if (process.env.TOGETHER_AI_KEY) {
            const keyValidation = InputValidator.validateApiKey(process.env.TOGETHER_AI_KEY, 'TogetherAI');
            if (!keyValidation.isValid) {
                console.warn('TogetherAI API key validation warnings:', keyValidation.errors.join(', '));
            }
        }

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
        });

        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();

        // Default retry configuration
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            ...retryConfig
        };

        // Initialize circuit breakers
        this.initializeCircuitBreakers();
    }

    private initializeCircuitBreakers(): void {
        this.circuitBreakers.set('openai', { failures: 0, lastFailureTime: 0, state: 'CLOSED' });
        this.circuitBreakers.set('together', { failures: 0, lastFailureTime: 0, state: 'CLOSED' });
    }

    async analyzeFailure(failure: TestFailure): Promise<AnalysisResult> {
        // Validate input
        const validation = InputValidator.validateTestFailure(failure);
        if (!validation.isValid) {
            throw new Error(`Invalid test failure input: ${validation.errors.join(', ')}`);
        }

        // Sanitize inputs
        const sanitizedFailure: TestFailure = {
            ...failure,
            testName: InputValidator.sanitizeInput(failure.testName),
            error: InputValidator.sanitizeInput(failure.error),
            stackTrace: failure.stackTrace ? InputValidator.sanitizeInput(failure.stackTrace) : '',
            screenshot: failure.screenshot
        };

        // Check cache first
        const cacheKey = this.generateCacheKey(sanitizedFailure);
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            console.log(`Using cached result for failure: ${sanitizedFailure.testName}`);
            return cachedResult;
        }

        let result: AnalysisResult | null = null;
        let lastError: Error | null = null;

        // Try OpenAI first
        if (process.env.OPENAI_API_KEY && this.isCircuitBreakerClosed('openai')) {
            try {
                result = await this.withRetry(
                    () => this.analyzeWithOpenAI(sanitizedFailure),
                    'openai'
                );
                this.recordSuccess('openai');
            } catch (error) {
                lastError = error as Error;
                this.recordFailure('openai');
                console.log('OpenAI analysis failed:', lastError.message);
            }
        }

        // Try TogetherAI if OpenAI failed
        if (!result && process.env.TOGETHER_AI_KEY && this.isCircuitBreakerClosed('together')) {
            try {
                result = await this.withRetry(
                    () => this.analyzeWithTogetherAI(sanitizedFailure),
                    'together'
                );
                this.recordSuccess('together');
            } catch (error) {
                lastError = error as Error;
                this.recordFailure('together');
                console.log('TogetherAI analysis failed:', lastError.message);
            }
        }

        // Final fallback: Local rule-based analysis
        if (!result) {
            console.log('Using local rule-based analysis as fallback');
            result = this.localRuleBasedAnalysis(sanitizedFailure);
        }

        // Cache the result
        this.setCachedResult(cacheKey, result);

        return result;
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        provider: string,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.retryConfig.maxRetries) {
                throw error;
            }

            const delay = Math.min(
                this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
                this.retryConfig.maxDelay
            );

            console.log(`Retrying ${provider} analysis in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
            await this.delay(delay);
            return this.withRetry(operation, provider, attempt + 1);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private isCircuitBreakerClosed(provider: string): boolean {
        const breaker = this.circuitBreakers.get(provider);
        if (!breaker) return true;

        const now = Date.now();
        const timeSinceLastFailure = now - breaker.lastFailureTime;

        // Reset circuit breaker after timeout (30 seconds)
        if (breaker.state === 'OPEN' && timeSinceLastFailure > 30000) {
            breaker.state = 'HALF_OPEN';
            breaker.failures = 0;
        }

        return breaker.state !== 'OPEN';
    }

    private recordSuccess(provider: string): void {
        const breaker = this.circuitBreakers.get(provider);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'CLOSED';
        }
    }

    private recordFailure(provider: string): void {
        const breaker = this.circuitBreakers.get(provider);
        if (breaker) {
            breaker.failures++;
            breaker.lastFailureTime = Date.now();

            // Open circuit breaker after 5 consecutive failures
            if (breaker.failures >= 5) {
                breaker.state = 'OPEN';
                console.warn(`Circuit breaker opened for ${provider} after ${breaker.failures} failures`);
            }
        }
    }

    private generateCacheKey(failure: TestFailure): string {
        // Create a hash of the failure content for caching
        const content = `${failure.testName}:${failure.error}:${failure.stackTrace}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private getCachedResult(cacheKey: string): AnalysisResult | null {
        const entry = this.cache.get(cacheKey);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }

        return entry.result;
    }

    private setCachedResult(cacheKey: string, result: AnalysisResult): void {
        this.cache.set(cacheKey, {
            result,
            timestamp: Date.now(),
            ttl: this.cacheTTL
        });

        // Clean up old cache entries periodically
        if (this.cache.size > 1000) {
            this.cleanupCache();
        }
    }

    private cleanupCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    private async analyzeWithOpenAI(failure: TestFailure): Promise<AnalysisResult> {
        const prompt = this.constructAnalysisPrompt(failure);

        // Apply rate limiting
        await rateLimiters.openai.waitForSlot();

        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4',
                messages: [{
                    role: 'system',
                    content: 'You are an expert test failure analyzer. Analyze the test failure and provide the root cause, category, and suggested fix.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 1000
            }, {
                timeout: 30000 // 30 second timeout
            });

            const analysis = response.choices[0]?.message?.content;
            if (!analysis) {
                throw new Error('No analysis received from OpenAI');
            }

            return this.parseAIResponse(analysis);
        } catch (error) {
            // Enhanced error handling with specific error types
            if ((error as any).code === 'rate_limit_exceeded') {
                throw new Error('OpenAI rate limit exceeded. Please try again later.');
            }
            if ((error as any).code === 'insufficient_quota') {
                throw new Error('OpenAI quota exceeded. Please check your billing.');
            }
            if ((error as any).status === 429) {
                throw new Error('OpenAI rate limited. Please wait before retrying.');
            }
            throw error;
        }
    }

    private async analyzeWithTogetherAI(failure: TestFailure): Promise<AnalysisResult> {
        // Implementation for Together AI analysis
        const prompt = this.constructAnalysisPrompt(failure);

        // Apply rate limiting
        await rateLimiters.together.waitForSlot();

        try {
            const response = await fetch('https://api.together.xyz/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.TOGETHER_AI_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                    messages: [{
                        role: 'system',
                        content: 'You are an expert test failure analyzer. Analyze the test failure and provide the root cause, category, and suggested fix.'
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.3,
                    max_tokens: 1000
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`TogetherAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content;

            if (!analysis) {
                throw new Error('No analysis received from TogetherAI');
            }

            return this.parseAIResponse(analysis);
        } catch (error) {
            // Enhanced error handling for TogetherAI
            if ((error as any).name === 'AbortError') {
                throw new Error('TogetherAI request timed out');
            }
            if ((error as any).code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to TogetherAI API');
            }
            throw error;
        }
    }

    private localRuleBasedAnalysis(failure: TestFailure): AnalysisResult {
        // Fallback rule-based analysis using natural language processing
        const tokens = this.tokenizer.tokenize(failure.error.toLowerCase());
        
        // Add to TF-IDF for analysis
        this.tfidf.addDocument(failure.error);
        
        let category = this.determineCategory(tokens);
        let rootCause = this.determineRootCause(tokens, failure);
        
        return {
            rootCause,
            category,
            suggestedFix: this.generateSuggestedFix(category, rootCause),
            confidence: 0.7 // Lower confidence for rule-based analysis
        };
    }

    private determineCategory(tokens: string[]): string {
        const categories = {
            timeout: ['timeout', 'wait', 'exceeded'],
            selector: ['selector', 'element', 'locator'],
            network: ['network', 'connection', 'http', 'response'],
            assertion: ['assert', 'expect', 'should', 'compare']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => tokens.includes(keyword))) {
                return category;
            }
        }

        return 'unknown';
    }

    private determineRootCause(tokens: string[], failure: TestFailure): string {
        // Basic pattern matching for common issues
        if (tokens.includes('timeout')) {
            return 'Element not found within specified timeout period';
        }
        if (tokens.includes('selector')) {
            return 'Invalid or changed element selector';
        }
        // Add more patterns as needed

        return 'Unknown root cause';
    }

    private generateSuggestedFix(category: string, rootCause: string): string {
        const fixes: { [key: string]: string } = {
            timeout: 'Increase the wait timeout or check if the element is actually present in the page',
            selector: 'Update the element selector or use a more robust selection strategy',
            network: 'Check network connectivity and ensure the API endpoints are responding',
            assertion: 'Verify the expected values and actual values match'
        };

        return fixes[category] || 'Manual investigation required';
    }

    private constructAnalysisPrompt(failure: TestFailure): string {
        return `
Analyze the following test failure:

Test Name: ${failure.testName}
Error Message: ${failure.error}
Stack Trace: ${failure.stackTrace}

Please provide:
1. Root cause of the failure
2. Category of the issue (e.g., timeout, selector, network, assertion)
3. Suggested fix for the issue
`;
    }

    private parseAIResponse(response: string): AnalysisResult {
        // Simple parsing implementation - can be enhanced
        const lines = response.split('\n');
        return {
            rootCause: lines[0] || 'Unknown root cause',
            category: lines[1] || 'unknown',
            suggestedFix: lines[2] || 'Manual investigation required',
            confidence: 0.9
        };
    }
}