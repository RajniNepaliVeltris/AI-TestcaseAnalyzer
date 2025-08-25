import { TestFailure } from '../ai/AIService';
import { FailureCluster } from '../ai/FailureClusteringService';
import fs from 'fs/promises';
import path from 'path';
import { HistoricalData, TestRunSummary } from './ReportingService';

interface ClusterTrend {
    category: string;
    counts: number[];
    dates: string[];
}

interface FailureAnalytics {
    totalFailures: number;
    uniqueCategories: Set<string>;
    categoryDistribution: Map<string, number>;
    timeBasedDistribution: Map<string, number>;
    commonPatterns: string[];
    failureRate: number;
    avgTimeToFix: number;
    topFailingTests: { testName: string; count: number }[];
}

export class EnhancedReportingService {
    private outputDir: string;
    private dbPath: string;

    constructor(outputDir: string = 'reports', dbPath: string = 'data/test-history.sqlite') {
        this.outputDir = outputDir;
        this.dbPath = dbPath;
    }

    async generateEnhancedReport(
        summary: TestRunSummary,
        failures: TestFailure[],
        clusters: FailureCluster[],
        historicalData: HistoricalData
    ): Promise<string> {
        await fs.mkdir(this.outputDir, { recursive: true });

        const analytics = this.analyzeFailures(failures, clusters);
        const trends = this.analyzeTrends(historicalData);
        const clusterTrends = this.analyzeClusterTrends(historicalData);

        const reportData = {
            summary,
            failures,
            clusters,
            analytics,
            trends,
            clusterTrends,
            charts: this.generateChartConfigs(summary, analytics, trends, clusterTrends)
        };

        const htmlReport = await this.generateEnhancedHTML(reportData);
        const reportPath = path.join(this.outputDir, `enhanced-report-${Date.now()}.html`);
        
        await fs.writeFile(reportPath, htmlReport);
        return reportPath;
    }

    private analyzeFailures(failures: TestFailure[], clusters: FailureCluster[]): FailureAnalytics {
        const analytics: FailureAnalytics = {
            totalFailures: failures.length,
            uniqueCategories: new Set(clusters.map(c => c.category)),
            categoryDistribution: new Map(),
            timeBasedDistribution: new Map(),
            commonPatterns: [],
            failureRate: 0,
            avgTimeToFix: 0,
            topFailingTests: []
        };

        // Calculate category distribution
        clusters.forEach(cluster => {
            analytics.categoryDistribution.set(
                cluster.category,
                (analytics.categoryDistribution.get(cluster.category) || 0) + cluster.failures.length
            );
        });

        // Calculate time-based distribution
        failures.forEach(failure => {
            const hour = (failure.timestamp instanceof Date ? failure.timestamp : new Date(failure.timestamp)).getHours();
            analytics.timeBasedDistribution.set(
                hour.toString(),
                (analytics.timeBasedDistribution.get(hour.toString()) || 0) + 1
            );
        });

        // Extract common patterns
        analytics.commonPatterns = Array.from(new Set(
            clusters.flatMap(c => c.commonPatterns)
        )).slice(0, 10);

        // Calculate top failing tests
        const testCounts = new Map<string, number>();
        failures.forEach(failure => {
            testCounts.set(
                failure.testName,
                (testCounts.get(failure.testName) || 0) + 1
            );
        });

        analytics.topFailingTests = Array.from(testCounts.entries())
            .map(([testName, count]) => ({ testName, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return analytics;
    }

    private analyzeTrends(historicalData: HistoricalData) {
        // Initialize with empty data if no history
        const emptySummary = {
            dates: [],
            failureRates: [],
            passRates: [],
            durations: [],
            movingAverages: {
                failureRate: [],
                duration: []
            }
        };

        if (!historicalData?.summaries?.length) {
            return emptySummary;
        }

        const datePoints = historicalData.summaries.map(s => {
            try {
                const date = s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp);
                return date.toLocaleDateString();
            } catch {
                return new Date().toLocaleDateString(); // Fallback to current date if conversion fails
            }
        });
        const failureRates = historicalData.summaries.map(s => (s.failed / s.totalTests) * 100);
        const passRates = historicalData.summaries.map(s => (s.passed / s.totalTests) * 100);
        const durations = historicalData.summaries.map(s => s.duration / 1000); // Convert to seconds

        return {
            dates: datePoints,
            failureRates,
            passRates,
            durations,
            movingAverages: {
                failureRate: this.calculateMovingAverage(failureRates, 7),
                duration: this.calculateMovingAverage(durations, 7)
            }
        };
    }

    private analyzeClusterTrends(historicalData: HistoricalData): ClusterTrend[] {
        if (!historicalData?.summaries?.length) {
            return [];
        }

        const categoryTrends = new Map<string, number[]>();
        const dates = historicalData.summaries.map(s => {
            try {
                const date = s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp);
                return date.toLocaleDateString();
            } catch {
                return new Date().toLocaleDateString();
            }
        });

        historicalData.clusters.forEach(cluster => {
            if (!categoryTrends.has(cluster.category)) {
                categoryTrends.set(cluster.category, Array(dates.length).fill(0));
            }

            const dateIndex = dates.indexOf(
                (cluster.lastOccurrence instanceof Date ? 
                    cluster.lastOccurrence : 
                    new Date(cluster.lastOccurrence)
                ).toLocaleDateString()
            );
            if (dateIndex !== -1) {
                const counts = categoryTrends.get(cluster.category)!;
                counts[dateIndex] += cluster.frequency;
            }
        });

        return Array.from(categoryTrends.entries()).map(([category, counts]) => ({
            category,
            counts,
            dates
        }));
    }

    private calculateMovingAverage(data: number[], window: number): number[] {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - window + 1);
            const values = data.slice(start, i + 1);
            const average = values.reduce((a, b) => a + b, 0) / values.length;
            result.push(average);
        }
        return result;
    }

    private generateChartConfigs(
        summary: TestRunSummary,
        analytics: FailureAnalytics,
        trends: any,
        clusterTrends: ClusterTrend[]
    ) {
        return {
            testResults: {
                type: 'pie',
                data: {
                    labels: ['Passed', 'Failed', 'Skipped'],
                    datasets: [{
                        data: [summary.passed, summary.failed, summary.skipped],
                        backgroundColor: ['#4caf50', '#f44336', '#ff9800']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Test Results Distribution'
                        }
                    }
                }
            },
            failureTrends: {
                type: 'line',
                data: {
                    labels: trends.dates,
                    datasets: [
                        {
                            label: 'Failure Rate',
                            data: trends.failureRates,
                            borderColor: '#f44336',
                            tension: 0.1
                        },
                        {
                            label: '7-day Moving Average',
                            data: trends.movingAverages.failureRate,
                            borderColor: '#2196f3',
                            tension: 0.1,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Failure Rate Trend'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Failure Rate (%)'
                            }
                        }
                    }
                }
            },
            categoryDistribution: {
                type: 'bar',
                data: {
                    labels: Array.from(analytics.categoryDistribution.keys()),
                    datasets: [{
                        label: 'Number of Failures',
                        data: Array.from(analytics.categoryDistribution.values()),
                        backgroundColor: '#2196f3'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Failures by Category'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            },
            timeDistribution: {
                type: 'line',
                data: {
                    labels: Array.from(analytics.timeBasedDistribution.keys()),
                    datasets: [{
                        label: 'Failures',
                        data: Array.from(analytics.timeBasedDistribution.values()),
                        fill: true,
                        backgroundColor: 'rgba(33, 150, 243, 0.2)',
                        borderColor: '#2196f3'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Failures by Time of Day'
                        }
                    }
                }
            }
        };
    }

    private async generateEnhancedHTML(data: any): Promise<string> {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced Test Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #1976d2;
            --secondary-color: #dc004e;
            --background-color: #f5f5f5;
            --surface-color: #ffffff;
            --text-primary: #333333;
            --text-secondary: #666666;
        }

        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: var(--background-color);
            color: var(--text-primary);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: var(--surface-color);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: var(--surface-color);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-card h3 {
            margin: 0;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .stat-card .value {
            font-size: 2em;
            font-weight: 500;
            color: var(--primary-color);
            margin: 10px 0;
        }

        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .chart-container {
            background: var(--surface-color);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .failure-cluster {
            background: var(--surface-color);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .failure-cluster h3 {
            color: var(--primary-color);
            margin-top: 0;
        }

        .pattern-list {
            list-style: none;
            padding: 0;
        }

        .pattern-list li {
            padding: 10px;
            border-left: 4px solid var(--primary-color);
            background: rgba(25, 118, 210, 0.05);
            margin-bottom: 10px;
        }

        .trend-indicator {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .trend-up {
            background: rgba(244, 67, 54, 0.1);
            color: #f44336;
        }

        .trend-down {
            background: rgba(76, 175, 80, 0.1);
            color: #4caf50;
        }

        .tabs {
            display: flex;
            margin-bottom: 20px;
        }

        .tab {
            padding: 10px 20px;
            background: var(--surface-color);
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 1em;
            color: var(--text-secondary);
        }

        .tab.active {
            border-bottom-color: var(--primary-color);
            color: var(--primary-color);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }
        
        @media (max-width: 768px) {
            .chart-grid {
                grid-template-columns: 1fr;
            }
            
            .summary-stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <h3>Total Tests</h3>
                <div class="value">${data.summary.totalTests}</div>
            </div>
            <div class="stat-card">
                <h3>Pass Rate</h3>
                <div class="value">${((data.summary.passed / data.summary.totalTests) * 100).toFixed(1)}%</div>
                ${this.generateTrendIndicator(data.trends.passRates)}
            </div>
            <div class="stat-card">
                <h3>Duration</h3>
                <div class="value">${(data.summary.duration / 1000).toFixed(1)}s</div>
            </div>
            <div class="stat-card">
                <h3>Active Clusters</h3>
                <div class="value">${data.clusters.length}</div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('overview')">Overview</button>
            <button class="tab" onclick="showTab('trends')">Trends</button>
            <button class="tab" onclick="showTab('clusters')">Clusters</button>
            <button class="tab" onclick="showTab('details')">Details</button>
        </div>

        <div id="overview" class="tab-content active">
            <div class="chart-grid">
                <div class="chart-container">
                    <canvas id="testResults"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="categoryDistribution"></canvas>
                </div>
            </div>
        </div>

        <div id="trends" class="tab-content">
            <div class="chart-grid">
                <div class="chart-container">
                    <canvas id="failureTrends"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="timeDistribution"></canvas>
                </div>
            </div>
        </div>

        <div id="clusters" class="tab-content">
            ${data.clusters.map((cluster: FailureCluster) => `
                <div class="failure-cluster">
                    <h3>${cluster.category} (${cluster.failures.length} occurrences)</h3>
                    <p><strong>Common Patterns:</strong></p>
                    <ul class="pattern-list">
                        ${cluster.commonPatterns.map((pattern: string) => `
                            <li>${pattern}</li>
                        `).join('')}
                    </ul>
                    <p><strong>First seen:</strong> ${cluster.firstOccurrence.toLocaleString()}</p>
                    <p><strong>Last seen:</strong> ${cluster.lastOccurrence.toLocaleString()}</p>
                </div>
            `).join('')}
        </div>

        <div id="details" class="tab-content">
            <div class="failure-cluster">
                <h3>Top Failing Tests</h3>
                <ul class="pattern-list">
                    ${data.analytics.topFailingTests.map((test: { testName: string; count: number }) => `
                        <li>${test.testName} (${test.count} failures)</li>
                    `).join('')}
                </ul>
            </div>
        </div>
    </div>

    <script>
        // Initialize charts
        const charts = ${JSON.stringify(data.charts)};
        
        new Chart(
            document.getElementById('testResults'),
            charts.testResults
        );
        
        new Chart(
            document.getElementById('failureTrends'),
            charts.failureTrends
        );
        
        new Chart(
            document.getElementById('categoryDistribution'),
            charts.categoryDistribution
        );
        
        new Chart(
            document.getElementById('timeDistribution'),
            charts.timeDistribution
        );

        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Deactivate all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Activate selected tab
            document.querySelector(\`button[onclick="showTab('\${tabName}')"]\`).classList.add('active');
        }
    </script>
</body>
</html>
        `;
    }

    private generateTrendIndicator(rates: number[]): string {
        if (rates.length < 2) return '';
        
        const latest = rates[rates.length - 1];
        const previous = rates[rates.length - 2];
        const diff = latest - previous;
        
        if (Math.abs(diff) < 0.1) return '';
        
        const trend = diff > 0 ? 'up' : 'down';
        const symbol = diff > 0 ? '↑' : '↓';
        return `
            <div class="trend-indicator trend-${trend}">
                ${symbol} ${Math.abs(diff).toFixed(1)}%
            </div>
        `;
    }
}