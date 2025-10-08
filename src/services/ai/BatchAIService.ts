import { AIService, TestFailure, AnalysisResult } from './AIService';

export interface BatchAnalysisOptions {
    concurrency: number;
    batchSize: number;
    enableParallel: boolean;
    enableCaching: boolean;
}

export interface BatchAnalysisResult {
    results: Array<AnalysisResult & { failure: TestFailure }>;
    totalProcessed: number;
    totalErrors: number;
    processingTime: number;
    cacheHits: number;
}

export class BatchAIService {
    private aiService: AIService;
    private options: BatchAnalysisOptions;

    constructor(options: Partial<BatchAnalysisOptions> = {}) {
        this.aiService = new AIService();
        this.options = {
            concurrency: 5, // Process 5 failures concurrently
            batchSize: 10, // Process in batches of 10
            enableParallel: true,
            enableCaching: true,
            ...options
        };
    }

    /**
     * Analyze multiple test failures with optimized performance
     */
    async analyzeBatch(failures: TestFailure[]): Promise<BatchAnalysisResult> {
        const startTime = Date.now();
        let cacheHits = 0;

        if (!this.options.enableParallel) {
            // Sequential processing
            const results = [];
            for (const failure of failures) {
                try {
                    const result = await this.aiService.analyzeFailure(failure);
                    results.push({ ...result, failure });
                } catch (error) {
                    console.error(`Failed to analyze failure: ${failure.testName}`, error);
                    results.push({
                        rootCause: 'Analysis failed',
                        category: 'error',
                        suggestedFix: 'Manual investigation required',
                        confidence: 0,
                        failure
                    });
                }
            }
            return {
                results,
                totalProcessed: results.length,
                totalErrors: results.filter(r => r.category === 'error').length,
                processingTime: Date.now() - startTime,
                cacheHits
            };
        }

        // Parallel processing with batching
        const results: Array<AnalysisResult & { failure: TestFailure }> = [];
        const batches = this.createBatches(failures, this.options.batchSize);

        for (const batch of batches) {
            const batchPromises = batch.map(async (failure) => {
                try {
                    const result = await this.aiService.analyzeFailure(failure);
                    return { ...result, failure };
                } catch (error) {
                    console.error(`Failed to analyze failure: ${failure.testName}`, error);
                    return {
                        rootCause: 'Analysis failed',
                        category: 'error',
                        suggestedFix: 'Manual investigation required',
                        confidence: 0,
                        failure
                    };
                }
            });

            // Process batch with controlled concurrency
            const batchResults = await this.processWithConcurrency(batchPromises, this.options.concurrency);
            results.push(...batchResults);
        }

        return {
            results,
            totalProcessed: results.length,
            totalErrors: results.filter(r => r.category === 'error').length,
            processingTime: Date.now() - startTime,
            cacheHits
        };
    }

    /**
     * Process promises with controlled concurrency
     */
    private async processWithConcurrency<T>(
        promises: Promise<T>[],
        concurrency: number
    ): Promise<T[]> {
        const results: T[] = [];
        const chunks = this.chunkArray(promises, concurrency);

        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(chunk);
            for (const result of chunkResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    // Handle rejected promises gracefully
                    console.error('Promise rejected in batch processing:', result.reason);
                    // You might want to add a default error result here
                }
            }
        }

        return results;
    }

    /**
     * Split array into batches
     */
    private createBatches<T>(array: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Split array into chunks for concurrency control
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Analyze failures with priority (critical failures first)
     */
    async analyzeWithPriority(failures: TestFailure[]): Promise<BatchAnalysisResult> {
        // Separate critical failures (timeouts, network errors) from others
        const criticalFailures = failures.filter(f =>
            f.error.toLowerCase().includes('timeout') ||
            f.error.toLowerCase().includes('network') ||
            f.error.toLowerCase().includes('connection')
        );

        const otherFailures = failures.filter(f => !criticalFailures.includes(f));

        // Process critical failures first with higher concurrency
        const criticalOptions = { ...this.options, concurrency: Math.max(3, this.options.concurrency) };
        const criticalService = new BatchAIService(criticalOptions);
        const criticalResult = await criticalService.analyzeBatch(criticalFailures);

        // Process other failures
        const otherResult = await this.analyzeBatch(otherFailures);

        // Combine results
        return {
            results: [...criticalResult.results, ...otherResult.results],
            totalProcessed: criticalResult.totalProcessed + otherResult.totalProcessed,
            totalErrors: criticalResult.totalErrors + otherResult.totalErrors,
            processingTime: Math.max(criticalResult.processingTime, otherResult.processingTime),
            cacheHits: criticalResult.cacheHits + otherResult.cacheHits
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): {
        averageProcessingTime: number;
        cacheHitRate: number;
        errorRate: number;
    } {
        // This would track metrics over time
        return {
            averageProcessingTime: 0,
            cacheHitRate: 0,
            errorRate: 0
        };
    }

    /**
     * Update configuration
     */
    updateConfig(options: Partial<BatchAnalysisOptions>): void {
        this.options = { ...this.options, ...options };
    }
}