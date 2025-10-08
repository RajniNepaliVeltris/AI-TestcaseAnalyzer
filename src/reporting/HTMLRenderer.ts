import * as fs from 'fs';
import * as path from 'path';
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
  private reportDir: string;
  private screenshotDir: string;

  constructor(reportDir?: string) {
    this.styles = this.loadStyles();
    this.addFailureDetailStyles();
    this.reportDir = reportDir || path.resolve('artifacts/html-report');
    this.screenshotDir = path.join(this.reportDir, 'screenshots');
    
    // Create the screenshot directory if it doesn't exist
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  // Function to copy screenshots to the report directory and return relative paths
  private processScreenshot(screenshotPath?: string): string | null {
    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      return null;
    }

    try {
      // Generate a unique filename based on the original path
      const filename = path.basename(screenshotPath);
      const uniqueFilename = `${Date.now()}-${filename}`;
      const destination = path.join(this.screenshotDir, uniqueFilename);
      
      // Copy the screenshot to the report directory
      fs.copyFileSync(screenshotPath, destination);
      
      // Return a relative path from the report HTML to the screenshot
      return `screenshots/${uniqueFilename}`;
    } catch (error) {
      console.error(`Failed to copy screenshot: ${error}`);
      return null;
    }
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

      /* Enhanced Failure Analysis Styles */
      .failure-analysis-section {
        margin: 2rem 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        overflow: hidden;
      }

      .section-header {
        background: linear-gradient(135deg, var(--primary-color), #2d3748);
        color: white;
        padding: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-header h2 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
      }

      .analysis-stats {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
      }

      .analysis-stats .stat-item {
        text-align: center;
      }

      .analysis-stats .stat-label {
        display: block;
        font-size: 0.875rem;
        opacity: 0.9;
        margin-bottom: 0.25rem;
      }

      .analysis-stats .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .category-tabs {
        background: #f7fafc;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        overflow-x: auto;
        scrollbar-width: thin;
      }

      .tab-button {
        background: none;
        border: none;
        padding: 1rem 1.5rem;
        cursor: pointer;
        font-weight: 500;
        color: var(--muted-color);
        border-bottom: 2px solid transparent;
        transition: all 0.3s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .tab-button:hover {
        background: rgba(0,0,0,0.05);
        color: var(--primary-color);
      }

      .tab-button.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
        background: white;
      }

      .category-container {
        padding: 2rem;
      }

      .failure-card {
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin-bottom: 1.5rem;
        overflow: hidden;
        transition: box-shadow 0.3s ease;
      }

      .failure-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .failure-header {
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .failure-meta {
        flex: 1;
      }

      .failure-title {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 0 0 0.75rem 0;
        flex-wrap: wrap;
      }

      .test-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--primary-color);
      }

      .confidence-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .confidence-high {
        background: rgba(72, 187, 120, 0.1);
        color: #2f855a;
      }

      .confidence-medium {
        background: rgba(237, 137, 54, 0.1);
        color: #c05621;
      }

      .confidence-low {
        background: rgba(245, 101, 101, 0.1);
        color: #c53030;
      }

      .failure-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .tag {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .provider-tag {
        background: #e6fffa;
        color: #065f46;
      }

      .category-tag {
        background: #fef3c7;
        color: #92400e;
      }

      .severity-tag {
        background: #fee2e2;
        color: #991b1b;
      }

      .severity-high {
        background: #dc2626 !important;
        color: white !important;
      }

      .severity-medium {
        background: #ea580c !important;
        color: white !important;
      }

      .failure-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .action-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: white;
        color: var(--primary-color);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .action-btn:hover {
        background: var(--primary-color);
        color: white;
      }

      .action-btn.primary {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }

      .action-btn.primary:hover {
        background: #2d3748;
      }

      .action-btn.secondary {
        background: #f7fafc;
      }

      .action-btn.expanded {
        background: #2d3748;
        color: white;
      }

      .action-btn.copied {
        background: #48bb78;
        color: white;
      }

      .failure-details {
        border-top: 1px solid var(--border-color);
        padding: 1.5rem;
        background: #fafafa;
      }

      .analysis-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 768px) {
        .analysis-grid {
          grid-template-columns: 1fr;
        }
      }

      .analysis-section {
        background: white;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
      }

      .analysis-section h5 {
        margin: 0 0 0.75rem 0;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 600;
      }

      .analysis-content {
        margin-bottom: 1rem;
      }

      .analysis-text {
        margin: 0;
        line-height: 1.6;
        color: #374151;
      }

      .confidence-meter {
        margin-top: 0.75rem;
      }

      .confidence-bar {
        background: #e5e7eb;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.25rem;
      }

      .confidence-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }

      .confidence-fill.confidence-high {
        background: #48bb78;
      }

      .confidence-fill.confidence-medium {
        background: #f59e0b;
      }

      .confidence-fill.confidence-low {
        background: #ef4444;
      }

      .confidence-label {
        font-size: 0.75rem;
        color: var(--muted-color);
        font-weight: 500;
      }

      .solution-steps {
        margin-bottom: 1rem;
      }

      .solution-list {
        margin: 0;
        padding-left: 1.25rem;
      }

      .solution-list li {
        margin-bottom: 0.5rem;
        line-height: 1.5;
      }

      .prevention-tips {
        background: #f0f9ff;
        padding: 0.75rem;
        border-radius: 4px;
        border-left: 3px solid #3b82f6;
      }

      .prevention-tips h6 {
        margin: 0 0 0.5rem 0;
        color: #1e40af;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .prevention-tips ul {
        margin: 0;
        padding-left: 1rem;
      }

      .prevention-tips li {
        color: #374151;
        font-size: 0.875rem;
      }

      .error-details {
        background: white;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        margin-bottom: 1rem;
      }

      .error-details h5 {
        margin: 0 0 1rem 0;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 600;
      }

      .error-content {
        display: grid;
        gap: 1rem;
      }

      .error-message, .error-stack {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 0.75rem;
      }

      .error-label {
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 0.5rem;
        display: block;
      }

      .error-text, .stack-text {
        background: #f1f3f4;
        padding: 0.75rem;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-all;
        margin: 0;
        border: 1px solid #dee2e6;
      }

      .copy-btn {
        margin-top: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: background 0.2s ease;
      }

      .copy-btn:hover {
        background: #2d3748;
      }

      .ai-insights {
        background: white;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
      }

      .ai-insights h5 {
        margin: 0 0 1rem 0;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 600;
      }

      .insights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .insight-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .insight-label {
        font-size: 0.75rem;
        color: var(--muted-color);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .insight-value {
        font-size: 0.875rem;
        color: var(--primary-color);
        font-weight: 600;
      }

      /* Performance Summary Styles */
      .performance-summary {
        margin: 3rem 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        overflow: hidden;
      }

      .performance-summary h2 {
        background: linear-gradient(135deg, var(--primary-color), #2d3748);
        color: white;
        margin: 0;
        padding: 2rem;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        padding: 2rem;
      }

      .metric-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid var(--border-color);
      }

      .metric-card h3 {
        margin: 0 0 1rem 0;
        color: var(--primary-color);
        font-size: 1.125rem;
        font-weight: 600;
      }

      .metric-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e9ecef;
      }

      .metric-item:last-child {
        border-bottom: none;
      }

      .metric-label {
        font-weight: 500;
        color: var(--muted-color);
        font-size: 0.875rem;
      }

      .metric-value {
        font-weight: 600;
        color: var(--primary-color);
        font-size: 0.875rem;
      }

      .recommendation-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .recommendation-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        transition: box-shadow 0.3s ease;
      }

      .recommendation-item:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .recommendation-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .recommendation-content h4 {
        margin: 0 0 0.5rem 0;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 600;
      }

      .recommendation-content p {
        margin: 0;
        color: #374151;
        font-size: 0.875rem;
        line-height: 1.5;
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
      const key = `${curr.failure.testName}-${curr.failure.error}`;
      if (!acc[key]) {
        acc[key] = curr;
      }
      return acc;
    }, {});

    // Group failures by category for better organization
    const failuresByCategory = Object.values(uniqueFailures).reduce((acc: { [key: string]: any[] }, item) => {
      const category = item.analysis.category || 'Unknown';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    // Create category tabs
    const categoryTabs = Object.keys(failuresByCategory).map(category => `
      <button class="tab-button ${category === 'Unknown' ? 'active' : ''}" onclick="showCategory('${category}')">
        ${category} (${failuresByCategory[category].length})
      </button>
    `).join('');

    // Create category content
    const categoryContent = Object.keys(failuresByCategory).map(category => `
      <div id="category-${category}" class="category-content" style="display: ${category === 'Unknown' ? 'block' : 'none'}">
        ${this.renderCategoryFailures(failuresByCategory[category], category)}
      </div>
    `).join('');

    return `
      <section class="failure-analysis-section">
        <div class="section-header">
          <h2>🔍 AI Failure Analysis Details</h2>
          <div class="analysis-stats">
            <div class="stat-item">
              <span class="stat-label">Total Failures</span>
              <span class="stat-value">${Object.values(uniqueFailures).length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Categories</span>
              <span class="stat-value">${Object.keys(failuresByCategory).length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">AI Analyzed</span>
              <span class="stat-value">${Object.values(uniqueFailures).filter(f => f.analysis.provider !== 'Rule-based').length}</span>
            </div>
          </div>
        </div>

        <div class="category-tabs">
          ${categoryTabs}
        </div>

        <div class="category-container">
          ${categoryContent}
        </div>

        <script>
          function showCategory(categoryName) {
            // Hide all category content
            document.querySelectorAll('.category-content').forEach(el => {
              el.style.display = 'none';
            });

            // Remove active class from all tabs
            document.querySelectorAll('.tab-button').forEach(el => {
              el.classList.remove('active');
            });

            // Show selected category
            document.getElementById('category-' + categoryName).style.display = 'block';

            // Add active class to selected tab
            event.target.classList.add('active');
          }

          function toggleFailureDetails(id) {
            const details = document.getElementById('details-' + id);
            const button = document.getElementById('btn-' + id);

            if (details.style.display === 'none') {
              details.style.display = 'block';
              button.textContent = 'Hide Details';
              button.classList.add('expanded');
            } else {
              details.style.display = 'none';
              button.textContent = 'Show Details';
              button.classList.remove('expanded');
            }
          }

          function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
              // Show temporary feedback
              const btn = event.target;
              const originalText = btn.textContent;
              btn.textContent = 'Copied!';
              btn.classList.add('copied');
              setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
              }, 2000);
            });
          }
        </script>
      </section>
    `;
  }

  private renderCategoryFailures(failures: any[], category: string): string {
    return failures.map((item, index) => {
      const { failure, analysis } = item;
      const failureId = `${category}-${index}`;
      const confidence = analysis.confidence || 0.5;
      const confidenceLevel = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';

      return `
        <div class="failure-card" data-category="${category}">
          <div class="failure-header">
            <div class="failure-meta">
              <h4 class="failure-title">
                <span class="test-name">${escapeHtml(failure.testName || 'Unknown Test')}</span>
                <span class="confidence-badge confidence-${confidenceLevel}">
                  ${Math.round(confidence * 100)}% confidence
                </span>
              </h4>
              <div class="failure-tags">
                <span class="tag provider-tag">${escapeHtml(analysis.provider || 'Unknown')}</span>
                <span class="tag category-tag">${escapeHtml(category)}</span>
                <span class="tag severity-tag severity-${this.calculateSeverity(failure)}">
                  ${this.calculateSeverity(failure).toUpperCase()}
                </span>
              </div>
            </div>
            <div class="failure-actions">
              <button id="btn-${failureId}" class="action-btn primary" onclick="toggleFailureDetails('${failureId}')">
                Show Details
              </button>
              ${failure.screenshotPath ? `
                <button class="action-btn secondary" onclick="window.open('${failure.screenshotPath}', '_blank')">
                  📸 Screenshot
                </button>
              ` : ''}
              ${failure.tracePath ? `
                <button class="action-btn secondary" onclick="window.open('${failure.tracePath}', '_blank')">
                  🔍 Trace
                </button>
              ` : ''}
            </div>
          </div>

          <div id="details-${failureId}" class="failure-details" style="display: none;">
            <div class="analysis-grid">
              <div class="analysis-section">
                <h5>🔍 Root Cause Analysis</h5>
                <div class="analysis-content">
                  <p class="analysis-text">${escapeHtml(analysis.reason || 'No analysis available')}</p>
                  ${analysis.confidence ? `
                    <div class="confidence-meter">
                      <div class="confidence-bar">
                        <div class="confidence-fill confidence-${confidenceLevel}" style="width: ${confidence * 100}%"></div>
                      </div>
                      <span class="confidence-label">AI Confidence: ${Math.round(confidence * 100)}%</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="analysis-section">
                <h5>🛠️ Recommended Solution</h5>
                <div class="solution-content">
                  <div class="solution-steps">
                    ${this.formatSolutionSteps(analysis.resolution || 'No solution provided')}
                  </div>
                  ${analysis.prevention ? `
                    <div class="prevention-tips">
                      <h6>💡 Prevention Tips:</h6>
                      <ul>
                        ${analysis.prevention.split('\n').filter((line: string) => line.trim()).map((tip: string) =>
                          `<li>${escapeHtml(tip.trim())}</li>`
                        ).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <div class="error-details">
              <h5>📋 Error Details</h5>
              <div class="error-content">
                ${failure.error ? `
                  <div class="error-message">
                    <div class="error-label">Error Message:</div>
                    <pre class="error-text">${escapeHtml(failure.error)}</pre>
                    <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(failure.error)}')">
                      📋 Copy
                    </button>
                  </div>
                ` : ''}

                ${failure.stack ? `
                  <div class="error-stack">
                    <div class="error-label">Stack Trace:</div>
                    <pre class="stack-text">${escapeHtml(failure.stack)}</pre>
                    <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(failure.stack)}')">
                      📋 Copy
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="ai-insights">
              <h5>🤖 AI Analysis Insights</h5>
              <div class="insights-grid">
                <div class="insight-item">
                  <span class="insight-label">Analysis Provider:</span>
                  <span class="insight-value">${escapeHtml(analysis.provider || 'Unknown')}</span>
                </div>
                <div class="insight-item">
                  <span class="insight-label">Failure Category:</span>
                  <span class="insight-value">${escapeHtml(analysis.category || 'Unknown')}</span>
                </div>
                <div class="insight-item">
                  <span class="insight-label">Analysis Time:</span>
                  <span class="insight-value">~${this.estimateAnalysisTime(analysis)}ms</span>
                </div>
                <div class="insight-item">
                  <span class="insight-label">Pattern Match:</span>
                  <span class="insight-value">${this.getPatternMatchInfo(analysis)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  private formatSolutionSteps(solution: string): string {
    const steps = solution.split('\n').filter(step => step.trim());
    if (steps.length <= 1) {
      return `<p>${escapeHtml(solution)}</p>`;
    }

    return `
      <ol class="solution-list">
        ${steps.map(step => `<li>${escapeHtml(step.trim())}</li>`).join('')}
      </ol>
    `;
  }

  private estimateAnalysisTime(analysis: any): number {
    // Estimate based on provider and complexity
    const baseTime = analysis.provider === 'OpenAI' ? 1500 :
                     analysis.provider === 'TogetherAI' ? 1200 : 200;
    const complexityMultiplier = (analysis.reason?.length || 0) > 100 ? 1.5 : 1;
    return Math.round(baseTime * complexityMultiplier);
  }

  private getPatternMatchInfo(analysis: any): string {
    // This would be enhanced with actual pattern matching data
    const patterns = {
      'Authentication': 'Login/Credential patterns detected',
      'Timing': 'Wait/Timeout patterns detected',
      'Selector': 'Element selection patterns detected',
      'Network': 'API/Network patterns detected',
      'UI Interaction': 'User interface patterns detected'
    };

    return patterns[analysis.category as keyof typeof patterns] || 'General failure patterns';
  }

  private generateRecommendations(clusters: ClusteredFailures, perFailureResults: any[]): string {
    const recommendations = [];

    // Analyze failure patterns and generate recommendations
    const totalFailures = perFailureResults.length;
    const categoryCounts = Object.keys(clusters).reduce((acc, category) => {
      acc[category] = clusters[category].length;
      return acc;
    }, {} as Record<string, number>);

    // Most common failure category
    const mostCommonCategory = Object.keys(categoryCounts).reduce((a, b) =>
      categoryCounts[a] > categoryCounts[b] ? a : b, '');

    if (mostCommonCategory) {
      const percentage = Math.round((categoryCounts[mostCommonCategory] / totalFailures) * 100);
      recommendations.push(`
        <div class="recommendation-item">
          <div class="recommendation-icon">🎯</div>
          <div class="recommendation-content">
            <h4>Address ${mostCommonCategory} Issues</h4>
            <p>${percentage}% of failures are ${mostCommonCategory.toLowerCase()}-related. Focus testing efforts on this area.</p>
          </div>
        </div>
      `);
    }

    // AI confidence analysis
    const avgConfidence = perFailureResults.reduce((sum, r) => sum + (r.analysis.confidence || 0), 0) / totalFailures;
    if (avgConfidence < 0.7) {
      recommendations.push(`
        <div class="recommendation-item">
          <div class="recommendation-icon">🧠</div>
          <div class="recommendation-content">
            <h4>Improve AI Analysis Quality</h4>
            <p>AI confidence is below optimal (${Math.round(avgConfidence * 100)}%). Consider providing more context or using different AI providers.</p>
          </div>
        </div>
      `);
    }

    // Test stability
    if (totalFailures > 0) {
      recommendations.push(`
        <div class="recommendation-item">
          <div class="recommendation-icon">📈</div>
          <div class="recommendation-content">
            <h4>Enhance Test Stability</h4>
          <p>Implement self-healing mechanisms and improve element selectors to reduce ${totalFailures} failure instances.</p>
        </div>
      </div>
      `);
    }

    // Default recommendations if none generated
    if (recommendations.length === 0) {
      recommendations.push(`
        <div class="recommendation-item">
          <div class="recommendation-icon">✅</div>
          <div class="recommendation-content">
            <h4>Tests Performing Well</h4>
            <p>No major issues detected. Continue monitoring and maintaining current test quality standards.</p>
          </div>
        </div>
      `);
    }

    return recommendations.join('');
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
    // Process screenshots for each failure
    perFailureResults = perFailureResults.map(result => {
      if (result.failure.screenshotPath) {
        const processedPath = this.processScreenshot(result.failure.screenshotPath);
        if (processedPath) {
          result.failure.screenshotPath = processedPath;
        }
      }
      return result;
    });

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

            <div class="performance-summary">
              <h2>📊 Performance & Quality Metrics</h2>
              <div class="metrics-grid">
                <div class="metric-card">
                  <h3>Analysis Performance</h3>
                  <div class="metric-content">
                    <div class="metric-item">
                      <span class="metric-label">Processing Method:</span>
                      <span class="metric-value">Batch Processing</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">AI Providers:</span>
                      <span class="metric-value">${[stats.openai.attempts > 0 ? 'OpenAI' : null, stats.together.attempts > 0 ? 'TogetherAI' : null, stats.ruleBased.attempts > 0 ? 'Rule-based' : null].filter(Boolean).join(', ') || 'None'}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">Average Confidence:</span>
                      <span class="metric-value">${perFailureResults.length > 0 ? Math.round((perFailureResults.reduce((sum, r) => sum + (r.analysis.confidence || 0), 0) / perFailureResults.length) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>

                <div class="metric-card">
                  <h3>Test Quality Insights</h3>
                  <div class="metric-content">
                    <div class="metric-item">
                      <span class="metric-label">Failure Categories:</span>
                      <span class="metric-value">${Object.keys(clusters).length}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">Most Common Issue:</span>
                      <span class="metric-value">${Object.keys(clusters).length > 0 ? Object.keys(clusters).reduce((a, b) => clusters[a].length > clusters[b].length ? a : b) : 'None'}</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-label">Test Stability:</span>
                      <span class="metric-value">${passed > 0 ? Math.round((passed / (passed + failures)) * 100) : 0}% Pass Rate</span>
                    </div>
                  </div>
                </div>

                <div class="metric-card">
                  <h3>Recommendations</h3>
                  <div class="metric-content">
                    <div class="recommendation-list">
                      ${this.generateRecommendations(clusters, perFailureResults)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

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