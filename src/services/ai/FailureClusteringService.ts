import natural from 'natural';
import { TestFailure } from './AIService';

export interface FailureCluster {
    id: string;
    category: string;
    failures: TestFailure[];
    commonPatterns: string[];
    firstOccurrence: string | Date;
    lastOccurrence: string | Date;
    frequency: number;
}

export interface ClusteringOptions {
    similarityThreshold: number;
    maxClusters: number;
    enableParallelProcessing: boolean;
    batchSize: number;
}

export class FailureClusteringService {
    private tfidf: natural.TfIdf;
    private clusters: Map<string, FailureCluster>;
    private options: ClusteringOptions;

    constructor(options: Partial<ClusteringOptions> = {}) {
        this.tfidf = new natural.TfIdf();
        this.clusters = new Map();
        this.options = {
            similarityThreshold: 0.7,
            maxClusters: 100,
            enableParallelProcessing: true,
            batchSize: 50,
            ...options
        };
    }

    /**
     * Add a single failure to clustering
     */
    public addFailure(failure: TestFailure): void {
        const document = this.failureToDocument(failure);
        this.tfidf.addDocument(document);

        const similarCluster = this.findSimilarCluster(document);

        if (similarCluster) {
            this.updateCluster(similarCluster, failure);
        } else {
            this.createNewCluster(failure);
        }
    }

    /**
     * Add multiple failures in batch for better performance
     */
    public async addFailuresBatch(failures: TestFailure[]): Promise<void> {
        if (!this.options.enableParallelProcessing || failures.length < this.options.batchSize) {
            // Process sequentially for small batches
            failures.forEach(failure => this.addFailure(failure));
            return;
        }

        // Process in batches for better performance
        const batches = this.createBatches(failures, this.options.batchSize);

        for (const batch of batches) {
            await this.processBatch(batch);
        }

        // Re-cluster if we have too many clusters
        if (this.clusters.size > this.options.maxClusters) {
            await this.consolidateClusters();
        }
    }

    /**
     * Process a batch of failures
     */
    private async processBatch(failures: TestFailure[]): Promise<void> {
        const documents = failures.map(failure => this.failureToDocument(failure));

        // Add all documents to TF-IDF at once
        documents.forEach(doc => this.tfidf.addDocument(doc));

        // Process each failure
        const promises = failures.map(async (failure, index) => {
            const document = documents[index];
            const similarCluster = this.findSimilarCluster(document);

            if (similarCluster) {
                this.updateCluster(similarCluster, failure);
            } else {
                this.createNewCluster(failure);
            }
        });

        // Process with controlled concurrency
        await this.processWithConcurrency(promises, 10);
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
                }
            }
        }

        return results;
    }

    /**
     * Consolidate clusters when we have too many
     */
    private async consolidateClusters(): Promise<void> {
        console.log(`Consolidating ${this.clusters.size} clusters...`);

        const allClusters = Array.from(this.clusters.values());
        const consolidatedClusters = new Map<string, FailureCluster>();

        // Merge similar clusters
        for (const cluster of allClusters) {
            let merged = false;

            for (const [id, existingCluster] of consolidatedClusters) {
                if (this.clustersSimilar(cluster, existingCluster)) {
                    // Merge clusters
                    existingCluster.failures.push(...cluster.failures);
                    existingCluster.frequency += cluster.frequency;
                    existingCluster.lastOccurrence = cluster.lastOccurrence;
                    existingCluster.commonPatterns = this.mergePatterns(
                        existingCluster.commonPatterns,
                        cluster.commonPatterns
                    );
                    merged = true;
                    break;
                }
            }

            if (!merged && consolidatedClusters.size < this.options.maxClusters) {
                consolidatedClusters.set(cluster.id, cluster);
            }
        }

        this.clusters = consolidatedClusters;
        console.log(`Consolidated to ${this.clusters.size} clusters`);
    }

    /**
     * Check if two clusters are similar
     */
    private clustersSimilar(cluster1: FailureCluster, cluster2: FailureCluster): boolean {
        // Simple similarity check based on category and patterns
        if (cluster1.category !== cluster2.category) return false;

        const commonPatterns = cluster1.commonPatterns.filter(pattern =>
            cluster2.commonPatterns.includes(pattern)
        );

        return commonPatterns.length > 0;
    }

    /**
     * Merge common patterns from two clusters
     */
    private mergePatterns(patterns1: string[], patterns2: string[]): string[] {
        const combined = new Set([...patterns1, ...patterns2]);
        return Array.from(combined).slice(0, 10); // Limit to top 10 patterns
    }

    /**
     * Create batches from array
     */
    private createBatches<T>(array: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Split array into chunks
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private failureToDocument(failure: TestFailure): string {
        return `${failure.testName} ${failure.error} ${this.extractKeywordsFromStack(failure.stackTrace)}`;
    }

    private extractKeywordsFromStack(stackTrace: string): string {
        // Extract meaningful parts from stack trace (file names, function names, etc.)
        const lines = stackTrace.split('\n');
        return lines
            .map(line => {
                const matches = line.match(/at\s+(\w+)\s+\((.+?):(\d+):(\d+)\)/);
                return matches ? `${matches[1]} ${matches[2]}` : '';
            })
            .filter(Boolean)
            .join(' ');
    }

    private findSimilarCluster(document: string): FailureCluster | null {
        let maxSimilarity = 0;
        let mostSimilarCluster: FailureCluster | null = null;

        this.clusters.forEach(cluster => {
            const similarity = this.calculateSimilarity(document, cluster);
            if (similarity > maxSimilarity && similarity >= this.options.similarityThreshold) {
                maxSimilarity = similarity;
                mostSimilarCluster = cluster;
            }
        });

        return mostSimilarCluster;
    }

    private calculateSimilarity(document: string, cluster: FailureCluster): number {
        // Use cosine similarity between TF-IDF vectors
        const documentVector = this.tfidf.tfidfs(document);
        const clusterVector = this.tfidf.tfidfs(this.failureToDocument(cluster.failures[0]));

        return this.cosineSimilarity(documentVector, clusterVector);
    }

    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

        return dotProduct / (mag1 * mag2);
    }

    private updateCluster(cluster: FailureCluster, failure: TestFailure): void {
        cluster.failures.push(failure);
        cluster.lastOccurrence = failure.timestamp;
        cluster.frequency = cluster.failures.length;
        this.updateCommonPatterns(cluster);
    }

    private createNewCluster(failure: TestFailure): void {
        const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newCluster: FailureCluster = {
            id: clusterId,
            category: this.determineCategory(failure),
            failures: [failure],
            commonPatterns: this.extractPatterns(failure),
            firstOccurrence: failure.timestamp,
            lastOccurrence: failure.timestamp,
            frequency: 1
        };

        this.clusters.set(clusterId, newCluster);
    }

    private determineCategory(failure: TestFailure): string {
        const error = failure.error.toLowerCase();
        
        if (error.includes('timeout')) return 'timeout';
        if (error.includes('selector') || error.includes('element')) return 'selector';
        if (error.includes('network') || error.includes('http')) return 'network';
        if (error.includes('assert') || error.includes('expect')) return 'assertion';
        
        return 'unknown';
    }

    private extractPatterns(failure: TestFailure): string[] {
        const patterns: string[] = [];
        const tokenizer = new natural.WordTokenizer();
        const words = tokenizer.tokenize(failure.error);

        if (words) {
            // Extract common error patterns
            const errorPattern = words
                .filter(word => !this.isStopWord(word))
                .join(' ');
            patterns.push(errorPattern);

            // Extract any selector patterns
            const selectorMatch = failure.error.match(/['"]([^'"]+)['"]/);
            if (selectorMatch) {
                patterns.push(`selector: ${selectorMatch[1]}`);
            }
        }

        return patterns;
    }

    private updateCommonPatterns(cluster: FailureCluster): void {
        const allPatterns = cluster.failures
            .flatMap(failure => this.extractPatterns(failure));

        // Find patterns that appear in majority of failures
        const patternFrequency = new Map<string, number>();
        allPatterns.forEach(pattern => {
            patternFrequency.set(pattern, (patternFrequency.get(pattern) || 0) + 1);
        });

        const threshold = cluster.failures.length * 0.5; // 50% threshold
        cluster.commonPatterns = Array.from(patternFrequency.entries())
            .filter(([_, freq]) => freq >= threshold)
            .map(([pattern]) => pattern);
    }

    private isStopWord(word: string): boolean {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
        return stopWords.has(word.toLowerCase());
    }
}