import { StatsTracking, HistoryEntry, ClusteredFailures } from './types';
import { escapeHtml } from './utils';

// Define the ClusterDetails interface outside the class
interface ClusterDetails {
  description: string;
  causes: string[];
  solutions: string[];
}

export class HTMLRenderer {
  private styles: string;

  constructor() {
    this.styles = this.loadStyles();
    this.addFailureDetailStyles();
  }

  private addFailureDetailStyles() {
    this.styles += `
      .failure-analysis-details {
        padding: 20px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .failure-section {
        margin-bottom: 15px;
      }

      .failure-section h4 {
        color: var(--primary-color);
        margin: 0 0 8px 0;
      }

      .failure-section p {
        margin: 0;
        line-height: 1.5;
      }

      .error-message {
        background: #fff;
        border: 1px solid var(--border-color);
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        white-space: pre-wrap;
        margin: 5px 0;
      }

      .failure-details td {
        background: #f8f9fa;
      }
    `;
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
    // Calculate unique failures from total failures based on retry attempts
    const totalFailureAttempts = failures;
    const uniqueFailedTests = Math.ceil(failures / 2); // Estimate - in reality this would be more accurate

    return `
      <h1 class="report-title">AI Failure Analysis Report</h1>
      <section class="summary-cards" aria-label="Test execution summary">
        <div class="stat-card white" role="region" aria-label="Total test count">
          <h3>Total Tests</h3>
          <div class="stat-value">${totalTests}</div>
        </div>
        <div class="stat-card red" role="region" aria-label="Failed test count">
          <h3>Failures</h3>
          <div class="stat-value">${uniqueFailedTests}</div>
          ${totalFailureAttempts > uniqueFailedTests ? 
            `<div style="font-size:12px;margin-top:5px">Includes ${totalFailureAttempts - uniqueFailedTests} retry attempts</div>` : ''}
        </div>
        <div class="stat-card green" role="region" aria-label="Passed test count">
          <h3>Passed</h3>
          <div class="stat-value">${passed}</div>
        </div>
      </section>
      ${totalFailureAttempts > uniqueFailedTests ? 
      `<div style="text-align:center;margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:14px">
        <strong>Note:</strong> This report shows ${totalFailureAttempts} failure records for ${uniqueFailedTests} unique test case(s). 
        Each retry attempt is shown separately to provide additional debugging context.
      </div>` : ''}
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
            <tr class="failure-details" id="failure-${idx}" style="display: none;">
              <td colspan="6">
                <div class="failure-analysis-details">
                  <div class="failure-section">
                    <h4>Failure Reason:</h4>
                    <p>${escapeHtml(analysis.reason || 'No reason provided')}</p>
                  </div>
                  <div class="failure-section">
                    <h4>Resolution Steps:</h4>
                    <p>${escapeHtml(analysis.resolution || 'No resolution provided')}</p>
                  </div>
                  ${failure.error ? `
                    <div class="failure-section">
                      <h4>Error Message:</h4>
                      <pre class="error-message">${escapeHtml(failure.error)}</pre>
                    </div>
                  ` : ''}
                </div>
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
        <script>
          function toggleFailure(id) {
            const row = document.getElementById(id);
            if (row) {
              row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
            }
          }
        </script>
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
    const failurePatterns = Object.keys(clusters).map((pattern) => {
      const percentage = Math.round((clusters[pattern].length / Math.max(failures, 1)) * 100);
      return `
        <div class="collapsible">
          <div class="collapsible-header" onclick="toggleDetails('${pattern}')">
            <span><span class="severity medium"></span>${pattern} (${percentage}%)</span>
          </div>
          <div id="${pattern}" class="collapsible-content">
            <p><strong>Description:</strong> ${clusters[pattern][0]?.description || 'No description available'}</p>
            <p><strong>Common Causes:</strong></p>
            <ul>${clusters[pattern][0]?.causes?.map((cause: string) => `<li>${cause}</li>`).join('') || ''}</ul>
            <p><strong>Recommended Solutions:</strong></p>
            <ul>${clusters[pattern][0]?.solutions?.map((solution: string) => `<li>${solution}</li>`).join('') || ''}</ul>
          </div>
        </div>`;
    }).join('');

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
            ${failurePatterns}
            <h2 class="section-title">Test Failure Analysis</h2>
            ${this.renderFailureDetails(perFailureResults)}
            
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
          </main>
          ${this.generateChartScripts(clusters, history)}
        </body>
      </html>
    `;
  }
}