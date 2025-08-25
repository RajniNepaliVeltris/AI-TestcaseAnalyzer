import OpenAI from 'openai';
import natural from 'natural';
import dotenv from 'dotenv';

dotenv.config();

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

export class AIService {
    private openai: OpenAI;
    private tokenizer: natural.WordTokenizer;
    private tfidf: natural.TfIdf;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('OpenAI API key not found, falling back to local analysis');
        }
        
        this.openai = new OpenAI({
            apiKey: apiKey || 'dummy-key'  // Provide a dummy key, we'll handle the error in analyzeFailure
        });
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
    }

    async analyzeFailure(failure: TestFailure): Promise<AnalysisResult> {
        if (process.env.OPENAI_API_KEY) {
            try {
                // First attempt: OpenAI analysis
                return await this.analyzeWithOpenAI(failure);
            } catch (error) {
                console.log('OpenAI analysis failed:', (error as Error).message || 'Unknown error');
            }
        }

        if (process.env.TOGETHER_API_KEY) {
            try {
                // Second attempt: Together AI
                return await this.analyzeWithTogetherAI(failure);
            } catch (error) {
                console.log('Together AI failed:', (error as Error).message || 'Unknown error');
            }
        }

        console.log('Using local rule-based analysis');
        // Final fallback: Local rule-based analysis
        return this.localRuleBasedAnalysis(failure);
    }

    private async analyzeWithOpenAI(failure: TestFailure): Promise<AnalysisResult> {
        const prompt = this.constructAnalysisPrompt(failure);
        
        const response = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4',
            messages: [{
                role: 'system',
                content: 'You are an expert test failure analyzer. Analyze the test failure and provide the root cause, category, and suggested fix.'
            }, {
                role: 'user',
                content: prompt
            }],
            temperature: 0.3
        });

        const analysis = response.choices[0].message.content;
        if (!analysis) {
            throw new Error('No analysis received from OpenAI');
        }
        return this.parseAIResponse(analysis);
    }

    private async analyzeWithTogetherAI(failure: TestFailure): Promise<AnalysisResult> {
        // Implementation for Together AI analysis
        // This would be similar to OpenAI but using Together AI's API
        throw new Error('Together AI implementation pending');
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