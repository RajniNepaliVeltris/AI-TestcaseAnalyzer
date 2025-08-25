import { TestFailure } from '../ai/AIService';
import { FailureCluster } from '../ai/FailureClusteringService';
import fs from 'fs/promises';
import path from 'path';

export interface TestRunSummary {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string | Date;
}

export interface HistoricalData {
    summaries: TestRunSummary[];
    clusters: FailureCluster[];
    trends: {
        failureRate: number[];
        commonFailures: { [key: string]: number };
        averageDuration: number;
    };
}

export class ReportingService {
    private outputDir: string;

    constructor(outputDir: string = 'reports') {
        this.outputDir = outputDir;
    }

    async generateReport(
        summary: TestRunSummary,
        failures: TestFailure[],
        clusters: FailureCluster[],
        historicalData: HistoricalData
    ): Promise<string> {
        // Ensure output directory exists
        await fs.mkdir(this.outputDir, { recursive: true });

        const reportData = {
            summary,
            failures,
            clusters,
            historicalData,
            charts: this.generateChartConfigs(summary, historicalData)
        };

        const htmlReport = await this.generateHTML(reportData);
        const reportPath = path.join(this.outputDir, `report-${Date.now()}.html`);
        
        await fs.writeFile(reportPath, htmlReport);
        return reportPath;
    }

    private generateChartConfigs(summary: TestRunSummary, historicalData: HistoricalData) {
        return {
            testResults: {
                type: 'pie',
                data: {
                    labels: ['Passed', 'Failed', 'Skipped'],
                    datasets: [{
                        data: [summary.passed, summary.failed, summary.skipped],
                        backgroundColor: ['#4caf50', '#f44336', '#ff9800']
                    }]
                }
            },
            failureTrends: {
                type: 'line',
                data: {
                    labels: historicalData.summaries.map(s => 
                        (s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp)).toLocaleDateString()
                    ),
                    datasets: [{
                        label: 'Failure Rate',
                        data: historicalData.trends.failureRate,
                        borderColor: '#f44336',
                        tension: 0.1
                    }]
                }
            },
            commonFailures: {
                type: 'bar',
                data: {
                    labels: Object.keys(historicalData.trends.commonFailures),
                    datasets: [{
                        label: 'Frequency',
                        data: Object.values(historicalData.trends.commonFailures),
                        backgroundColor: '#2196f3'
                    }]
                }
            }
        };
    }

    private async generateHTML(data: any): Promise<string> {
        const template = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin-bottom: 20px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .cluster {
            border-left: 4px solid #2196f3;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .failure {
            border-left: 4px solid #f44336;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        h1, h2, h3 {
            color: #333;
        }
        .stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .stat-item {
            text-align: center;
            padding: 15px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .trend-indicator {
            display: inline-block;
            margin-left: 10px;
            font-size: 0.8em;
        }
        .trend-up { color: #f44336; }
        .trend-down { color: #4caf50; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Analysis Report</h1>
        
        <div class="stats">
            <div class="stat-item">
                <h3>Total Tests</h3>
                <p>${data.summary.totalTests}</p>
            </div>
            <div class="stat-item">
                <h3>Pass Rate</h3>
                <p>${((data.summary.passed / data.summary.totalTests) * 100).toFixed(1)}%</p>
            </div>
            <div class="stat-item">
                <h3>Duration</h3>
                <p>${(data.summary.duration / 1000).toFixed(1)}s</p>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>Test Results</h2>
                <div class="chart-container">
                    <canvas id="testResults"></canvas>
                </div>
            </div>
            
            <div class="card">
                <h2>Failure Trends</h2>
                <div class="chart-container">
                    <canvas id="failureTrends"></canvas>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Common Failures</h2>
            <div class="chart-container">
                <canvas id="commonFailures"></canvas>
            </div>
        </div>

        <div class="card">
            <h2>Failure Clusters</h2>
            ${data.clusters.map((cluster: FailureCluster) => `
                <div class="cluster">
                    <h3>${cluster.category} (${cluster.failures.length} occurrences)</h3>
                    <p><strong>Common Patterns:</strong> ${cluster.commonPatterns.join(', ')}</p>
                    <p><strong>First seen:</strong> ${cluster.firstOccurrence.toLocaleString()}</p>
                    <p><strong>Last seen:</strong> ${cluster.lastOccurrence.toLocaleString()}</p>
                </div>
            `).join('')}
        </div>

        <div class="card">
            <h2>Recent Failures</h2>
            ${data.failures.map((failure: TestFailure) => `
                <div class="failure">
                    <h3>${failure.testName}</h3>
                    <p><strong>Error:</strong> ${failure.error}</p>
                    <p><strong>Time:</strong> ${failure.timestamp.toLocaleString()}</p>
                </div>
            `).join('')}
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
            document.getElementById('commonFailures'),
            charts.commonFailures
        );
    </script>
</body>
</html>
        `;

        return template;
    }
}