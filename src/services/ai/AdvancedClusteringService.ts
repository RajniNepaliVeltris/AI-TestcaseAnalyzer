import natural from 'natural';
import { TestFailure } from './AIService';
import { FailureCluster } from './FailureClusteringService';

interface StackTraceElement {
    functionName: string;
    fileName: string;
    lineNumber: number;
    columnNumber: number;
}

interface ErrorPattern {
    type: string;
    message: string;
    selector?: string;
    timeout?: number;
    stackElements: StackTraceElement[];
}

export class AdvancedClusteringService {
    private stemmer: typeof natural.PorterStemmer;
    private tokenizer: natural.WordTokenizer;
    private tfidf: natural.TfIdf;
    private clusters: Map<string, FailureCluster>;
    private patternCache: Map<string, ErrorPattern>;

    constructor() {
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.tfidf = new natural.TfIdf();
        this.clusters = new Map();
        this.patternCache = new Map();
    }

    public analyzeAndCluster(failures: TestFailure[]): FailureCluster[] {
        // Reset for new analysis
        this.clusters.clear();
        this.patternCache.clear();

        // First pass: Extract patterns and create initial clusters
        failures.forEach(failure => {
            const pattern = this.extractErrorPattern(failure);
            this.patternCache.set(failure.testName, pattern);
            this.createInitialCluster(failure, pattern);
        });

        // Second pass: Merge similar clusters
        this.mergeSimilarClusters();

        // Third pass: Hierarchical organization
        this.organizeHierarchically();

        return Array.from(this.clusters.values());
    }

    private extractErrorPattern(failure: TestFailure): ErrorPattern {
        const stackElements = this.parseStackTrace(failure.stackTrace);
        const errorType = this.determineErrorType(failure.error);
        const selector = this.extractSelector(failure.error);
        const timeout = this.extractTimeout(failure.error);

        return {
            type: errorType,
            message: this.normalizeErrorMessage(failure.error),
            selector,
            timeout,
            stackElements
        };
    }

    private parseStackTrace(stackTrace: string): StackTraceElement[] {
        const stackLines = stackTrace.split('\n');
        return stackLines
            .map(line => {
                const match = line.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
                if (match) {
                    return {
                        functionName: match[1],
                        fileName: match[2],
                        lineNumber: parseInt(match[3], 10),
                        columnNumber: parseInt(match[4], 10)
                    };
                }
                return null;
            })
            .filter((element): element is StackTraceElement => element !== null);
    }

    private determineErrorType(error: string): string {
        const errorTypes = [
            { pattern: /(timeout|wait)/i, type: 'timeout' },
            { pattern: /(element|selector|locator)/i, type: 'selector' },
            { pattern: /(network|connection|http|request)/i, type: 'network' },
            { pattern: /(assertion|expect|assert|should)/i, type: 'assertion' },
            { pattern: /(type|input|value)/i, type: 'input' },
            { pattern: /(click|tap|press)/i, type: 'interaction' },
            { pattern: /(visible|hidden|display)/i, type: 'visibility' },
            { pattern: /(auth|login|permission)/i, type: 'authentication' }
        ];

        for (const { pattern, type } of errorTypes) {
            if (pattern.test(error.toLowerCase())) {
                return type;
            }
        }

        return 'unknown';
    }

    private extractSelector(error: string): string | undefined {
        const selectorPatterns = [
            /(['"])([^'"]+)\1/,  // Quoted strings
            /\[([^\]]+)\]/,      // Square bracket content
            /(#|\.|\/|\[)([^\s]+)/ // CSS/XPath selectors
        ];

        for (const pattern of selectorPatterns) {
            const match = error.match(pattern);
            if (match) {
                return match[2];
            }
        }

        return undefined;
    }

    private extractTimeout(error: string): number | undefined {
        const timeoutMatch = error.match(/timeout.*?(\d+)/i);
        return timeoutMatch ? parseInt(timeoutMatch[1], 10) : undefined;
    }

    private normalizeErrorMessage(message: string): string {
        // Remove variable parts like specific values, timestamps, IDs
        return message
            .replace(/[0-9]+/g, '{n}')
            .replace(/(['"])[^'"]+\1/g, '{value}')
            .replace(/\{.*?\}/g, '{value}')
            .toLowerCase();
    }

    private createInitialCluster(failure: TestFailure, pattern: ErrorPattern): void {
        const clusterId = this.generateClusterId(pattern);
        
        if (!this.clusters.has(clusterId)) {
            this.clusters.set(clusterId, {
                id: clusterId,
                category: pattern.type,
                failures: [],
                commonPatterns: [pattern.message],
                firstOccurrence: failure.timestamp instanceof Date ? 
                    failure.timestamp : new Date(failure.timestamp),
                lastOccurrence: failure.timestamp instanceof Date ? 
                    failure.timestamp : new Date(failure.timestamp),
                frequency: 0
            });
        }

        const cluster = this.clusters.get(clusterId)!;
        cluster.failures.push(failure);
        cluster.frequency++;
        
        const failureDate = failure.timestamp instanceof Date ? 
            failure.timestamp : new Date(failure.timestamp);
        const clusterFirstDate = cluster.firstOccurrence instanceof Date ? 
            cluster.firstOccurrence : new Date(cluster.firstOccurrence);
        const clusterLastDate = cluster.lastOccurrence instanceof Date ? 
            cluster.lastOccurrence : new Date(cluster.lastOccurrence);

        if (failureDate < clusterFirstDate) {
            cluster.firstOccurrence = failureDate;
        }
        if (failureDate > clusterLastDate) {
            cluster.lastOccurrence = failureDate;
        }
    }

    private generateClusterId(pattern: ErrorPattern): string {
        // Create a unique identifier based on error characteristics
        const components = [
            pattern.type,
            pattern.message,
            pattern.selector || '',
            pattern.stackElements[0]?.fileName || ''
        ];

        return components.join('::');
    }

    private mergeSimilarClusters(): void {
        const clusterIds = Array.from(this.clusters.keys());
        const merged = new Set<string>();

        for (let i = 0; i < clusterIds.length; i++) {
            if (merged.has(clusterIds[i])) continue;

            const cluster1 = this.clusters.get(clusterIds[i])!;
            
            for (let j = i + 1; j < clusterIds.length; j++) {
                if (merged.has(clusterIds[j])) continue;

                const cluster2 = this.clusters.get(clusterIds[j])!;
                
                if (this.shouldMergeClusters(cluster1, cluster2)) {
                    this.mergeClusters(cluster1, cluster2);
                    merged.add(clusterIds[j]);
                    this.clusters.delete(clusterIds[j]);
                }
            }
        }
    }

    private shouldMergeClusters(cluster1: FailureCluster, cluster2: FailureCluster): boolean {
        // Check if clusters are similar enough to merge
        if (cluster1.category !== cluster2.category) return false;

        const pattern1 = this.patternCache.get(cluster1.failures[0].testName)!;
        const pattern2 = this.patternCache.get(cluster2.failures[0].testName)!;

        // Check if they share similar stack traces
        const stackSimilarity = this.calculateStackSimilarity(
            pattern1.stackElements,
            pattern2.stackElements
        );

        // Check if they have similar error messages
        const messageSimilarity = natural.JaroWinklerDistance(
            pattern1.message,
            pattern2.message
        );

        // Check if they share similar selectors
        const selectorMatch = pattern1.selector && pattern2.selector &&
            (pattern1.selector === pattern2.selector ||
             this.calculateSelectorSimilarity(pattern1.selector, pattern2.selector) > 0.8);

        return (stackSimilarity > 0.7 && messageSimilarity > 0.8) || 
               (Boolean(selectorMatch) && messageSimilarity > 0.7);
    }

    private calculateStackSimilarity(stack1: StackTraceElement[], stack2: StackTraceElement[]): number {
        const minLength = Math.min(stack1.length, stack2.length);
        if (minLength === 0) return 0;

        let matchingFrames = 0;
        for (let i = 0; i < minLength; i++) {
            if (stack1[i].fileName === stack2[i].fileName &&
                stack1[i].functionName === stack2[i].functionName) {
                matchingFrames++;
            }
        }

        return matchingFrames / minLength;
    }

    private calculateSelectorSimilarity(selector1: string, selector2: string): number {
        // Break selectors into parts
        const parts1 = selector1.split(/[\s>+~]/);
        const parts2 = selector2.split(/[\s>+~]/);

        // Calculate similarity for each part
        let totalSimilarity = 0;
        const minParts = Math.min(parts1.length, parts2.length);

        for (let i = 0; i < minParts; i++) {
            totalSimilarity += natural.JaroWinklerDistance(parts1[i], parts2[i]);
        }

        return totalSimilarity / minParts;
    }

    private mergeClusters(target: FailureCluster, source: FailureCluster): void {
        // Merge failures
        target.failures.push(...source.failures);
        
        // Update timestamps
        const targetFirstDate = target.firstOccurrence instanceof Date ? 
            target.firstOccurrence : new Date(target.firstOccurrence);
        const sourceFirstDate = source.firstOccurrence instanceof Date ? 
            source.firstOccurrence : new Date(source.firstOccurrence);
        const targetLastDate = target.lastOccurrence instanceof Date ? 
            target.lastOccurrence : new Date(target.lastOccurrence);
        const sourceLastDate = source.lastOccurrence instanceof Date ? 
            source.lastOccurrence : new Date(source.lastOccurrence);

        target.firstOccurrence = new Date(Math.min(
            targetFirstDate.getTime(),
            sourceFirstDate.getTime()
        ));
        target.lastOccurrence = new Date(Math.max(
            targetLastDate.getTime(),
            sourceLastDate.getTime()
        ));
        
        // Update frequency
        target.frequency += source.frequency;
        
        // Merge patterns
        target.commonPatterns = Array.from(new Set([
            ...target.commonPatterns,
            ...source.commonPatterns
        ]));
    }

    private organizeHierarchically(): void {
        const hierarchyMap = new Map<string, Set<string>>();
        
        // Group clusters by error type
        Array.from(this.clusters.values()).forEach(cluster => {
            const category = cluster.category;
            if (!hierarchyMap.has(category)) {
                hierarchyMap.set(category, new Set());
            }
            hierarchyMap.get(category)!.add(cluster.id);
        });

        // Update cluster information with hierarchy data
        hierarchyMap.forEach((clusterIds, category) => {
            clusterIds.forEach(clusterId => {
                const cluster = this.clusters.get(clusterId)!;
                cluster.category = `${category}/${this.getSubcategory(cluster)}`;
            });
        });
    }

    private getSubcategory(cluster: FailureCluster): string {
        const pattern = this.patternCache.get(cluster.failures[0].testName)!;
        
        switch (pattern.type) {
            case 'timeout':
                return pattern.timeout ? `${pattern.timeout}ms` : 'unknown-duration';
            case 'selector':
                return pattern.selector ? 
                    pattern.selector.split(/[\s>+~]/)[0].replace(/[^a-zA-Z0-9]/g, '-') : 
                    'unknown-selector';
            case 'network':
                return this.determineNetworkSubcategory(cluster.failures[0].error);
            default:
                return 'general';
        }
    }

    private determineNetworkSubcategory(error: string): string {
        if (error.includes('404')) return 'not-found';
        if (error.includes('500')) return 'server-error';
        if (error.includes('403')) return 'forbidden';
        if (error.includes('401')) return 'unauthorized';
        return 'connection-error';
    }
}