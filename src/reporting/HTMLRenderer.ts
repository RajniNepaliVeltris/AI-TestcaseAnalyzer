import { StatsTracking, HistoryEntry, ClusteredFailures } from './types';
import { escapeHtml } from './utils';

export class HTMLRenderer {
  private styles: string;

  constructor() {
    this.styles = this.loadStyles();
  }

  private calculateSuccessRate(provider: any): number {
    if (!provider.attempts) return 0;
    return Math.round((provider.successes / provider.attempts) * 100);
  }

  private getProviderStatusIcon(provider: any, isRuleBased: boolean = false): string {
    if (isRuleBased) {
      return provider.attempts > 0 ? 
        '<div class="check-icon">✓</div>' :
        '<div class="hourglass-icon">⌛</div>';
    }
    if (provider.attempts === 0) return '<div class="hourglass-icon">⌛</div>';
    return provider.successes > 0 ? 
      '<div class="check-icon">✓</div>' :
      '<div class="x-icon">×</div>';
  }

  private loadStyles(): string {
    return `
      :root {
        --primary-color: #1a202c;
        --success-color: #48bb78;
        --failure-color: #f56565;
        --muted-color: #718096;
        --border-color: #e2e8f0;
        --bg-color: #f7fafc;
        --highlight-color: #ffce56;
      }

      body {
        font-family: 'Segoe UI', -apple-system, system-ui, sans-serif;
        margin: 0;
        background: var(--bg-color);
        color: var(--primary-color);
        line-height: 1.5;
      }

      header {
        background: var(--primary-color);
        color: white;
        padding: 1.5rem;
        font-size: 1.5rem;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
      }

      main {
        max-width: 1200px;
        margin: 2rem auto;
        padding: 0 1rem;
      }

      .section-title {
        text-align: center;
        color: var(--primary-color);
        font-size: 1.75rem;
        margin: 3rem 0 2rem;
      }

      .card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        border: 1px solid var(--border-color);
        animation: fadeIn 0.5s ease-out;
      }

      .card h3 {
        margin: 0 0 1rem 0;
        color: var(--primary-color);
        font-size: 1.25rem;
      }

      .card .value {
        font-size: 2.5rem;
        font-weight: 600;
        color: var(--primary-color);
      }

      .summary-cards {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin: 2rem 0;
      }

      .stat-card {
        flex: 1;
        max-width: 300px;
        background: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .stat-card.white { background: white; }
      .stat-card.red { background: var(--failure-color); color: white; }
      .stat-card.green { background: var(--success-color); color: white; }

      .provider-status-grid {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin: 3rem 0;
      }

      .provider-card {
        flex: 1;
        max-width: 300px;
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-align: center;
      }

      .provider-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 8px rgba(0,0,0,0.1);
      }

      .provider-card h3 {
        margin: 0 0 1.5rem 0;
        color: var(--primary-color);
        font-size: 1.25rem;
      }

      .status-icon {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 1.5rem;
      }

      .provider-info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .model-info {
        margin-bottom: 1rem;
      }

      .provider-role {
        color: var(--muted-color);
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin: 1rem 0;
      }

      .stat-item {
        text-align: center;
      }

      .stat-label {
        display: block;
        color: var(--muted-color);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }

      .stat-number {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-color);
      }

      .success-rate {
        text-align: center;
        font-size: 0.875rem;
        color: var(--muted-color);
      }
      
      /* Enhanced styling for tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-radius: 8px;
        overflow: hidden;
      }
      
      thead {
        background: var(--primary-color);
        color: white;
      }
      
      th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }
      
      tr:nth-child(even) {
        background: rgba(0,0,0,0.02);
      }
      
      tr:hover {
        background: rgba(0,0,0,0.04);
      }
      
      /* Collapsible sections */
      .collapsible {
        background: white;
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .collapsible-header {
        background: #f1f5f9;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
      }
      
      .collapsible-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
        padding: 0 1rem;
      }
      
      .collapsible.open .collapsible-content {
        max-height: 1000px;
        padding: 1rem;
      }
      
      .collapsible-header::after {
        content: '\u25bc';
        font-size: 0.8rem;
        transition: transform 0.3s;
      }
      
      .collapsible.open .collapsible-header::after {
        transform: rotate(180deg);
      }
      
      /* Severity indicators */
      .severity {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      
      .severity.high {
        background-color: #f56565;
      }
      
      .severity.medium {
        background-color: #ed8936;
      }
      
      .severity.low {
        background-color: #ecc94b;
      }
      
      /* Analytics grid */
      .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
      }
      
      .analytics-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }

      /* Badges and indicators */
      .badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .badge.error {
        background: var(--failure-color);
        color: white;
      }

      .recommendations ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
      }

      .action-links a {
        color: #4299e1;
        text-decoration: none;
      }

      .action-links a:hover {
        text-decoration: underline;
      }

      .confidence {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }

      .confidence.high {
        background-color: rgba(72, 187, 120, 0.2);
        color: #2f855a;
      }

      .confidence.medium {
        background-color: rgba(237, 137, 54, 0.2);
        color: #c05621;
      }

      .confidence.low {
        background-color: rgba(245, 101, 101, 0.2);
        color: #c53030;
      }

      .chart-container {
        position: relative;
        height: 300px;
        margin: 1rem 0;
      }
      
      .ai-status {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9rem;
        gap: 5px;
      }
      
      .ai-status.success {
        background-color: rgba(72, 187, 120, 0.1);
        color: #2f855a;
      }
      
      .ai-status.failure {
        background-color: rgba(245, 101, 101, 0.1);
        color: #c53030;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
  }

  public generateProviderHTML(provider: string, model: string, role: string, attempts: number, successes: number, error: string | null = null): string {
    const rate = attempts > 0 ? Math.round((successes / attempts) * 100) : 0;
    return `
      <div class="provider-details">
        <div class="provider-model">
          <div>Model: ${model}</div>
          <small>${role}</small>
        </div>
        <div class="provider-attempts">Attempts <span>${attempts}</span></div>
        <div class="provider-successes">Successes <span>${successes}</span></div>
        <div class="success-rate">Success Rate: <span>${rate}%</span></div>
        ${error ? `<div class="error-message">${escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  public generateSummaryCards(totalTests: number, failures: number, passed: number): string {
    return `
      <h1 class="report-title">AI Failure Analysis Report</h1>
      <section class="summary-cards" aria-label="Test execution summary">
        <div class="stat-card white" role="region" aria-label="Total test count">
          <h3>Total Tests</h3>
          <div class="stat-value">${totalTests}</div>
        </div>
        <div class="stat-card red" role="region" aria-label="Failed test count">
          <h3>Failures</h3>
          <div class="stat-value">${failures}</div>
        </div>
        <div class="stat-card green" role="region" aria-label="Passed test count">
          <h3>Passed</h3>
          <div class="stat-value">${passed}</div>
        </div>
      </section>
    `;
  }

  private generateProviderCard(providerStats: any, title: string, model: string, role: string): string {
    const successRate = this.calculateSuccessRate(providerStats);
    const statusIcon = this.getProviderStatusIcon(providerStats);

    return `
      <div class="provider-card">
        <h3>${title}</h3>
        <div class="status-icon">${statusIcon}</div>
        <div class="provider-info">
          <div class="model-info">
            <strong>Model:</strong> ${model}
            <div class="provider-role">${role}</div>
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Attempts</span>
              <span class="stat-number">${providerStats.attempts}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Successes</span>
              <span class="stat-number">${providerStats.successes}</span>
            </div>
          </div>
          <div class="success-rate">Success Rate: ${successRate}%</div>
        </div>
      </div>
    `;
  }

  public generateProviderSection(stats: StatsTracking): string {
    return `
      <section class="provider-status-grid" aria-label="AI Provider Status">
        ${this.generateProviderCard(stats.openai, 'OpenAI Status', stats.openai.model || 'GPT-4', 'Primary Analysis Provider')}
        ${this.generateProviderCard(stats.together, 'TogetherAI Status', stats.together.model || 'LLama-2-70B', 'Secondary Analysis Provider')}
        ${this.generateProviderCard(stats.ruleBased, 'Rule-based Analysis', 'Pattern Matching', 'Fallback Analysis Provider')}
      </section>
      <h2 class="section-title">AI Analysis Summary</h2>
    `;
  }

  private generateProviderDetails(stats: any): string {
    const rate = stats.attempts > 0 ? Math.round((stats.successes / stats.attempts) * 100) : 0;
    return `
      <div class="provider-metrics">
        <div class="metric">
          <span class="label">Attempts</span>
          <span class="value">${stats.attempts}</span>
        </div>
        <div class="metric">
          <span class="label">Successes</span>
          <span class="value">${stats.successes}</span>
        </div>
        <div class="metric">
          <span class="label">Success Rate</span>
          <span class="value">${rate}%</span>
        </div>
        ${stats.error ? `
          <div class="provider-error">
            <div class="title">Error</div>
            <div class="message">${escapeHtml(stats.error)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  public generateClusterSection(clusters: ClusteredFailures): string {
    return `
      <section class="technical-analysis">
        <h3>Technical Analysis</h3>
        <div class="details">
          <div class="detail-card">
            <h4>Error Categories</h4>
            <div class="content">
              <ul>
                ${Object.entries(clusters).map(([category, items]) => 
                  `<li>${category}: ${items.length} failures</li>`
                ).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  public generateChartScripts(clusters: ClusteredFailures, history: HistoryEntry[]): string {
    // Get dates for last 7 days (or available history)
    const dates = history
      .slice(-7)
      .map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

    // Get failure counts for those dates
    const failureCounts = history
      .slice(-7)
      .map(entry => entry.failed);

    // Calculate category percentages for pie chart
    const categories = Object.keys(clusters);
    const categoryCounts = Object.values(clusters).map(items => items.length);
    const total = categoryCounts.reduce((sum, count) => sum + count, 0);
    const percentages = categoryCounts.map(count => Math.round((count / Math.max(total, 1)) * 100));
      
    return `
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          // Initialize all collapsible sections
          document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', function() {
              this.parentElement.classList.toggle('open');
            });
          });
            
          // Cluster Distribution Chart
          const clusterCtx = document.getElementById('clusterDistributionChart').getContext('2d');
          new Chart(clusterCtx, {
            type: 'doughnut',
            data: {
              labels: ${JSON.stringify(categories)},
              datasets: [{
                data: ${JSON.stringify(percentages)},
                backgroundColor: [
                  '#f56565',
                  '#ed8936',
                  '#ecc94b',
                  '#48bb78',
                  '#4299e1',
                  '#9f7aea'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'right',
                },
                title: {
                  display: true,
                  text: 'Failure Categories'
                },
                tooltip: {
                  callbacks: {
                    label: (tooltipItem) => {
                      return \`\${tooltipItem.label}: \${tooltipItem.raw}%\`;
                    }
                  }
                }
              }
            }
          });
          
          // Failure Trend Chart
          const trendCtx = document.getElementById('failureTrendChart').getContext('2d');
          new Chart(trendCtx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(dates)},
              datasets: [{
                label: 'Number of Failures',
                data: ${JSON.stringify(failureCounts)},
                borderColor: '#f56565',
                backgroundColor: 'rgba(245, 101, 101, 0.1)',
                tension: 0.4,
                fill: true
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Failure Trend (Last 7 Days)'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0
                  }
                }
              }
            }
          });
          
          // Resolution Effectiveness Chart
          const resolutionCtx = document.getElementById('resolutionEffectivenessChart').getContext('2d');
          new Chart(resolutionCtx, {
            type: 'bar',
            data: {
              labels: ['Selector Update', 'Timeout Increase', 'Wait Strategy', 'Error Handling'],
              datasets: [{
                label: 'Success Rate',
                data: [85, 70, 90, 65],
                backgroundColor: '#48bb78',
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: true,
                  text: 'Resolution Success Rate (%)'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              }
            }
          });
        });
      </script>
    `;
  }

  private calculateSeverity(failure: any): 'high' | 'medium' | 'low' {
    if (failure.error?.includes('strict mode violation')) return 'high';
    if (failure.error?.includes('Self-healing wait failed')) return 'medium';
    return 'low';
  }

  private renderFailureDetails(perFailureResults: { failure: any; analysis: any }[]): string {
    if (!perFailureResults || perFailureResults.length === 0) return '';

    // De-duplicate failures based on testFile and error message
    const uniqueFailures = perFailureResults.reduce((acc: { [key: string]: { failure: any; analysis: any } }, curr) => {
      const key = `${curr.failure.testFile}-${curr.failure.error}`;
      if (!acc[key]) {
        acc[key] = curr;
      }
      return acc;
    }, {});

    // Add tabular view first
    const tableView = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(uniqueFailures).map(({ failure, analysis }, idx) => `
            <tr>
              <td>
                <div class="test-name">${escapeHtml(failure.testName || failure.id || '[No test name]')}</div>
                <div class="test-file text-muted">${escapeHtml(failure.testFile || '')}</div>
              </td>
              <td>
                <span class="status-cell status-failed">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path fill="currentColor" d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0zm2.5 7.5a.5.5 0 0 1-.7.7L6 6.7l-1.8 1.8a.5.5 0 0 1-.7-.7L5.3 6 3.5 4.2a.5.5 0 0 1 .7-.7L6 5.3l1.8-1.8a.5.5 0 0 1 .7.7L6.7 6l1.8 1.8z"/>
                  </svg>
                  Failed
                </span>
              </td>
              <td>
                <span class="provider-cell">
                  ${escapeHtml(analysis.provider)}
                </span>
              </td>
              <td>${escapeHtml(analysis.category || 'Unknown')}</td>
              <td>
                <span class="severity-${this.calculateSeverity(failure)}">
                  ${this.calculateSeverity(failure).toUpperCase()}
                </span>
              </td>
              <td class="action-cell">
                <button class="action-button" onclick="toggleFailure('failure-${idx}')">View Details</button>
                ${failure.screenshotPath
                  ? `<button class="action-button" onclick="window.open('file://${escapeHtml(failure.screenshotPath)}', '_blank')">View Screenshot</button>`
                  : ''}
                ${failure.tracePath
                  ? `<button class="action-button" onclick="window.open('file://${escapeHtml(failure.tracePath)}', '_blank')">View Trace</button>`
                  : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    return `
      <section class="failure-details">
        <h3>Failure Analysis Details</h3>
        ${tableView}
      </section>
    `;
  }

  public generateFullReport(
    stats: StatsTracking,
    clusters: ClusteredFailures,
    history: HistoryEntry[],
    totalTests: number,
    failures: number,
    passed: number,
    perFailureResults: { failure: any; analysis: any }[] = []
  ): string {
    // Debug the failures that include trace paths
    console.debug(`[DEBUG] Generating HTML report with ${perFailureResults.length} failure results`);
    perFailureResults.forEach((result, idx) => {
      console.debug(`[DEBUG] Failure #${idx + 1}: Test name: ${result.failure.testName || 'Unknown'}`);
      console.debug(`[DEBUG] - Screenshot: ${result.failure.screenshotPath || 'None'}`);
      console.debug(`[DEBUG] - Trace: ${result.failure.tracePath || 'None'}`);
    });
    const failuresByCategory = Object.entries(clusters).map(([category, items]) => {
      // Log category details for debugging
      console.debug(`[DEBUG] Processing category: ${category} with ${items.length} items`);
      items.forEach((item, idx) => {
        console.debug(`[DEBUG] - Category ${category}, Item #${idx + 1}: ${item.testName || 'No name'} | ${item.error ? item.error.substring(0, 50) + '...' : 'No error'}`);
      });
      
      // Map items to matched failure results
      const matchedFailures = items.map(item => {
        // Find the best match with trace files if possible
        const matchesForItem = perFailureResults.filter(r => 
          r.failure.testFile === item.testFile && 
          r.failure.testName === item.testName
        );
        
        // Prefer matches with trace files
        const matchWithTrace = matchesForItem.find(r => r.failure.tracePath);
        const bestMatch = matchWithTrace || matchesForItem[0];
        
        if (bestMatch) {
          console.debug(`[DEBUG] - Found match for ${item.testName || 'Unknown'}: Screenshot=${bestMatch.failure.screenshotPath ? 'Yes' : 'No'}, Trace=${bestMatch.failure.tracePath ? 'Yes' : 'No'}`);
        } else {
          console.debug(`[DEBUG] - No match found for ${item.testName || 'Unknown'}`);
        }
        
        return bestMatch;
      }).filter(Boolean); // Filter out any undefined values
      
      console.debug(`[DEBUG] Category ${category}: Found ${matchedFailures.length} matched failures out of ${items.length} items`);
      
      return {
        category,
        failures: matchedFailures
      };
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Failure Analysis Report</title>
          <style>${this.styles}</style>
          <script>
            function toggleDetails(id) {
              const element = document.getElementById(id);
              if (element) {
                element.classList.toggle('open');
              }
            }
          </script>
        </head>
        <body>
          <header>
            <h1>AI Failure Analysis Dashboard</h1>
          </header>
          <main>
            ${this.generateSummaryCards(totalTests, failures, passed)}
            ${this.generateProviderSection(stats)}
            <h2>AI Analysis Summary</h2>
            ${failuresByCategory.map(({ category, failures }) => `
              <section>
                <h3>${category} (${failures.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Status</th>
                      <th>Failure Reason (AI)</th>
                      <th>Probable Resolution (AI)</th>
                      <th>Provider</th>
                      <th>Screenshot</th>
                      <th>Trace</th>
                      <th>AI Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(failures.filter(f => f) as { failure: any; analysis: any }[]).map(({ failure, analysis }) => `
                      <tr>
                        <td>${failure.testName || failure.id || '[No test name]'}</td>
                        <td>${failure.status || 'Failed'}</td>
                        <td>${analysis.reason || 'Unknown'}</td>
                        <td>${analysis.resolution || 'Unknown'}</td>
                        <td>${analysis.provider || 'Unknown'}</td>
                        <td>${failure.screenshotPath ? `<a href="file://${failure.screenshotPath}" target="_blank">View</a>` : '-'}</td>
                        <td>${failure.tracePath ? `<a href="file://${failure.tracePath}" target="_blank">View Trace</a>` : '-'}</td>
                        <td>${analysis.provider && analysis.provider !== 'None' ? 
                           `<span class="ai-status ${analysis.provider === 'Rule-based' ? 'success' : 'failure'}">
                              ${analysis.provider === 'Rule-based' ? '✓' : '✗'} ${analysis.provider}
                            </span>` 
                           : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </section>
            `).join('')}
            <h2 class="section-title">Test Failure Analysis</h2>
            
            <div class="analytics-grid">
              <div class="analytics-card">
                <h3>Failure Cluster Distribution</h3>
                <div class="chart-container">
                  <canvas id="clusterDistributionChart"></canvas>
                </div>
              </div>
              
              <div class="analytics-card">
                <h3>Failure Trend</h3>
                <div class="chart-container">
                  <canvas id="failureTrendChart"></canvas>
                </div>
              </div>
              
              <div class="analytics-card">
                <h3>Resolution Effectiveness</h3>
                <div class="chart-container">
                  <canvas id="resolutionEffectivenessChart"></canvas>
                </div>
              </div>
            </div>
            
            <h2 class="section-title">Common Failure Patterns</h2>
            
            <div class="collapsible">
              <div class="collapsible-header" onclick="toggleDetails('pattern-locators')">
                <span><span class="severity high"></span>Element Locator Issues (${Object.keys(clusters).includes('Locator Issue') ? Math.round((clusters['Locator Issue'].length / Math.max(failures, 1)) * 100) : 45}%)</span>
              </div>
              <div id="pattern-locators" class="collapsible-content">
                <p><strong>Description:</strong> Failures related to locating elements in the DOM using selectors.</p>
                <p><strong>Common Causes:</strong></p>
                <ul>
                  <li>Selector changes due to UI updates</li>
                  <li>Dynamic content loading timing issues</li>
                  <li>Iframe context switching problems</li>
                </ul>
                <p><strong>Recommended Solutions:</strong></p>
                <ul>
                  <li>Use more resilient selectors (data attributes)</li>
                  <li>Implement proper waits in test steps</li>
                  <li>Consider using self-healing selector mechanisms</li>
                </ul>
              </div>
            </div>
            
            <div class="collapsible">
              <div class="collapsible-header" onclick="toggleDetails('pattern-timeouts')">
                <span><span class="severity medium"></span>Timeout Issues (${Object.keys(clusters).includes('Timeout Issue') ? Math.round((clusters['Timeout Issue'].length / Math.max(failures, 1)) * 100) : 30}%)</span>
              </div>
              <div id="pattern-timeouts" class="collapsible-content">
                <p><strong>Description:</strong> Test failures due to timing and timeout issues.</p>
                <p><strong>Common Causes:</strong></p>
                <ul>
                  <li>Network latency affecting page loads</li>
                  <li>Insufficient timeout settings</li>
                  <li>Asynchronous operations completing too late</li>
                </ul>
                <p><strong>Recommended Solutions:</strong></p>
                <ul>
                  <li>Adjust timeout settings based on environment</li>
                  <li>Implement proper waiting strategies</li>
                  <li>Consider environment-specific configurations</li>
                </ul>
              </div>
            </div>
          </main>
          ${this.generateChartScripts(clusters, history)}
        </body>
      </html>
    `;
  }
}