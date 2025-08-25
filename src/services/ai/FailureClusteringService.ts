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

export class FailureClusteringService {
    private tfidf: natural.TfIdf;
    private clusters: Map<string, FailureCluster>;
    private similarityThreshold: number;

    constructor(similarityThreshold: number = 0.7) {
        this.tfidf = new natural.TfIdf();
        this.clusters = new Map();
        this.similarityThreshold = similarityThreshold;
    }

    public addFailure(failure: TestFailure): void {
        // Convert failure to document for TF-IDF
        const document = this.failureToDocument(failure);
        this.tfidf.addDocument(document);

        // Find the most similar cluster or create a new one
        const similarCluster = this.findSimilarCluster(document);
        
        if (similarCluster) {
            this.updateCluster(similarCluster, failure);
        } else {
            this.createNewCluster(failure);
        }
    }

    public getClusters(): FailureCluster[] {
        return Array.from(this.clusters.values());
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
            if (similarity > maxSimilarity && similarity >= this.similarityThreshold) {
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