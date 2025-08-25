import { TestFailure } from '../ai/AIService';
import { FailureCluster } from '../ai/FailureClusteringService';

interface HistoricalData {
    timestamp: Date;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    clusters: FailureCluster[];
}

interface TrendAnalysis {
    failureRate: number[];
    movingAverage: number[];
    topFailingTests: { testName: string; frequency: number }[];
    categoryTrends: Map<string, number[]>;
    timeOfDayDistribution: Map<number, number>;
}

export class HistoricalAnalysisService {
    private historicalData: HistoricalData[] = [];
    private readonly MOVING_AVERAGE_WINDOW = 7; // 7-day moving average

    constructor() {
        this.loadHistoricalData();
    }

    private loadHistoricalData(): void {
        // TODO: Load historical data from persistent storage
        // This will be implemented with a database or file storage solution
    }

    public addTestResults(
        timestamp: Date,
        totalTests: number,
        passedTests: number,
        duration: number,
        clusters: FailureCluster[]
    ): void {
        const entry: HistoricalData = {
            timestamp,
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            duration,
            clusters
        };

        this.historicalData.push(entry);
        this.saveHistoricalData();
    }

    private saveHistoricalData(): void {
        // TODO: Save historical data to persistent storage
        // This will be implemented with a database or file storage solution
    }

    public analyzeTrends(dateRange?: { start: Date; end: Date }): TrendAnalysis {
        let data = this.historicalData;
        if (dateRange) {
            data = data.filter(entry => 
                entry.timestamp >= dateRange.start && 
                entry.timestamp <= dateRange.end
            );
        }

        return {
            failureRate: this.calculateFailureRates(data),
            movingAverage: this.calculateMovingAverage(data),
            topFailingTests: this.identifyTopFailingTests(data),
            categoryTrends: this.analyzeCategoryTrends(data),
            timeOfDayDistribution: this.analyzeTimeDistribution(data)
        };
    }

    private calculateFailureRates(data: HistoricalData[]): number[] {
        return data.map(entry => 
            (entry.failedTests / entry.totalTests) * 100
        );
    }

    private calculateMovingAverage(data: HistoricalData[]): number[] {
        const failureRates = this.calculateFailureRates(data);
        const movingAverage: number[] = [];

        for (let i = 0; i < failureRates.length; i++) {
            const start = Math.max(0, i - this.MOVING_AVERAGE_WINDOW + 1);
            const windowSlice = failureRates.slice(start, i + 1);
            const average = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
            movingAverage.push(Number(average.toFixed(2)));
        }

        return movingAverage;
    }

    private identifyTopFailingTests(data: HistoricalData[]): { testName: string; frequency: number }[] {
        const testFrequency = new Map<string, number>();

        data.forEach(entry => {
            entry.clusters.forEach(cluster => {
                cluster.failures.forEach(failure => {
                    const count = testFrequency.get(failure.testName) || 0;
                    testFrequency.set(failure.testName, count + 1);
                });
            });
        });

        return Array.from(testFrequency.entries())
            .map(([testName, frequency]) => ({ testName, frequency }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10); // Top 10 failing tests
    }

    private analyzeCategoryTrends(data: HistoricalData[]): Map<string, number[]> {
        const categoryTrends = new Map<string, number[]>();

        data.forEach((entry, index) => {
            const categoryCounts = new Map<string, number>();

            entry.clusters.forEach(cluster => {
                const category = cluster.category;
                const count = categoryCounts.get(category) || 0;
                categoryCounts.set(category, count + cluster.failures.length);
            });

            categoryCounts.forEach((count, category) => {
                if (!categoryTrends.has(category)) {
                    categoryTrends.set(category, new Array(data.length).fill(0));
                }
                categoryTrends.get(category)![index] = count;
            });
        });

        return categoryTrends;
    }

    private analyzeTimeDistribution(data: HistoricalData[]): Map<number, number> {
        const distribution = new Map<number, number>();

        data.forEach(entry => {
            const hour = entry.timestamp.getHours();
            const count = distribution.get(hour) || 0;
            distribution.set(hour, count + entry.failedTests);
        });

        return distribution;
    }

    public getTestStability(testName: string): number {
        const recentData = this.historicalData.slice(-this.MOVING_AVERAGE_WINDOW);
        let failures = 0;
        let totalRuns = 0;

        recentData.forEach(entry => {
            entry.clusters.forEach(cluster => {
                const testFailures = cluster.failures.filter(f => f.testName === testName).length;
                failures += testFailures;
                totalRuns += 1; // Assuming the test runs in each session
            });
        });

        return totalRuns > 0 ? ((totalRuns - failures) / totalRuns) * 100 : 100;
    }

    public getPredictedFailures(): Map<string, number> {
        const predictions = new Map<string, number>();
        const recentData = this.historicalData.slice(-30); // Last 30 data points

        // Simple linear regression for each test
        const testFailures = new Map<string, number[]>();

        recentData.forEach((entry, index) => {
            entry.clusters.forEach(cluster => {
                cluster.failures.forEach(failure => {
                    if (!testFailures.has(failure.testName)) {
                        testFailures.set(failure.testName, new Array(recentData.length).fill(0));
                    }
                    testFailures.get(failure.testName)![index]++;
                });
            });
        });

        testFailures.forEach((failures, testName) => {
            const trend = this.calculateLinearTrend(failures);
            predictions.set(testName, trend);
        });

        return predictions;
    }

    private calculateLinearTrend(values: number[]): number {
        const n = values.length;
        if (n < 2) return 0;

        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += Math.pow(x - xMean, 2);
        });

        return denominator !== 0 ? numerator / denominator : 0;
    }
}