import { AIService, TestFailure, AnalysisResult } from '../ai/AIService';
import { FailureClusteringService, FailureCluster } from '../ai/FailureClusteringService';
import { AdvancedClusteringService } from '../ai/AdvancedClusteringService';
import { ReportingService, TestRunSummary, HistoricalData } from '../reporting/ReportingService';
import { EnhancedReportingService } from '../reporting/EnhancedReportingService';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TestAnalyzer {
    private aiService: AIService;
    private basicClusteringService: FailureClusteringService;
    private advancedClusteringService: AdvancedClusteringService;
    private reportingService: ReportingService;
    private enhancedReportingService: EnhancedReportingService;
    private historicalDataPath: string;

    constructor(
        outputDir: string = 'reports',
        historicalDataPath: string = path.join(outputDir, 'historical-data.json')
    ) {
        this.aiService = new AIService();
        this.basicClusteringService = new FailureClusteringService();
        this.advancedClusteringService = new AdvancedClusteringService();
        this.reportingService = new ReportingService(outputDir);
        this.enhancedReportingService = new EnhancedReportingService(outputDir);
        this.historicalDataPath = historicalDataPath;
    }

    async analyzeTestRun(
        results: {
            passed: TestFailure[];
            failed: TestFailure[];
            skipped: TestFailure[];
            duration: number;
        }
    ): Promise<{ standardReport: string; enhancedReport: string }> {
        // Analyze failures using AI
        const analysisPromises = results.failed.map(failure => 
            this.aiService.analyzeFailure(failure)
        );
        const analyses = await Promise.all(analysisPromises);

        // Use advanced clustering for detailed analysis
        const advancedClusters = this.advancedClusteringService.analyzeAndCluster(results.failed);

        // Also maintain basic clustering for backward compatibility
        results.failed.forEach(failure => {
            this.basicClusteringService.addFailure(failure);
        });

        const clusters = advancedClusters;

        // Create summary
        const summary: TestRunSummary = {
            totalTests: results.passed.length + results.failed.length + results.skipped.length,
            passed: results.passed.length,
            failed: results.failed.length,
            skipped: results.skipped.length,
            duration: results.duration,
            timestamp: new Date()
        };

        // Update historical data
        const historicalData = await this.updateHistoricalData(summary, clusters);

        // Generate report
        // Generate both standard and enhanced reports
        const [reportPath, enhancedReportPath] = await Promise.all([
            this.reportingService.generateReport(
                summary,
                results.failed,
                clusters,
                historicalData
            ),
            this.enhancedReportingService.generateEnhancedReport(
                summary,
                results.failed,
                clusters,
                historicalData
            )
        ]);

        return {
            standardReport: reportPath,
            enhancedReport: enhancedReportPath
        };
    }

    private async updateHistoricalData(
        summary: TestRunSummary,
        clusters: FailureCluster[]
    ): Promise<HistoricalData> {
        let historicalData: HistoricalData;

        try {
            const data = await fs.readFile(this.historicalDataPath, 'utf8');
            historicalData = JSON.parse(data);
        } catch (error) {
            // Initialize new historical data if file doesn't exist
            historicalData = {
                summaries: [],
                clusters: [],
                trends: {
                    failureRate: [],
                    commonFailures: {},
                    averageDuration: 0
                }
            };
        }

        // Update summaries
        historicalData.summaries.push({
            ...summary,
            timestamp: new Date(summary.timestamp)
        });
        if (historicalData.summaries.length > 30) { // Keep last 30 days
            historicalData.summaries.shift();
        }

        // Update clusters
        historicalData.clusters = clusters;

        // Update trends
        historicalData.trends.failureRate = historicalData.summaries.map(s => 
            (s.failed / s.totalTests) * 100
        );

        // Update common failures
        const failureCounts: { [key: string]: number } = {};
        clusters.forEach(cluster => {
            failureCounts[cluster.category] = (failureCounts[cluster.category] || 0) + cluster.frequency;
        });
        historicalData.trends.commonFailures = failureCounts;

        // Calculate average duration
        historicalData.trends.averageDuration = historicalData.summaries.reduce(
            (sum, s) => sum + s.duration, 
            0
        ) / historicalData.summaries.length;

        // Save updated historical data
        await fs.mkdir(path.dirname(this.historicalDataPath), { recursive: true });
        await fs.writeFile(
            this.historicalDataPath,
            JSON.stringify(historicalData, null, 2)
        );

        return historicalData;
    }
}