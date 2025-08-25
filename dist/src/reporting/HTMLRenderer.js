"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLRenderer = void 0;
const utils_1 = require("./utils");
class HTMLRenderer {
    constructor() {
        this.styles = this.loadStyles();
    }
    loadStyles() {
        return `
      body { font-family: Arial, sans-serif; margin: 0; background: #fafafa; }
      .provider-stats { display: flex; flex-direction: column; gap: 0.5em; margin-top: 1em; }
      .provider-error { margin-top: 1em; padding: 1em; border-radius: 4px; background: #ffebee; }
      .provider-error .title { color: #d32f2f; font-weight: bold; margin-bottom: 0.5em; }
      .provider-error .message { color: #666; font-size: 0.9em; }
      .technical-analysis { margin: 2em 0; padding: 1.5em; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #eee; }
      /* ... rest of your styles ... */
    `;
    }
    generateProviderHTML(provider, model, role, attempts, successes, error = null) {
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
        ${error ? `<div class="error-message">${(0, utils_1.escapeHtml)(error)}</div>` : ''}
      </div>
    `;
    }
    generateSummaryCards(totalTests, failures, passed) {
        return `
      <section class="summary-cards" aria-label="Test execution summary">
        <div class="card" role="region" aria-label="Total test count">
          <h3>Total Tests</h3>
          <div class="value">${totalTests}</div>
        </div>
        <div class="card" style="background:#ffe5e5;" role="region" aria-label="Failed test count">
          <h3>Failures</h3>
          <div class="value">${failures}</div>
        </div>
        <div class="card" style="background:#e5ffe5;" role="region" aria-label="Passed test count">
          <h3>Passed</h3>
          <div class="value">${passed}</div>
        </div>
      </section>
    `;
    }
    generateProviderSection(stats) {
        return `
      <section class="summary-cards" aria-label="AI provider status">
        ${this.generateProviderCard('OpenAI', stats.openai)}
        ${this.generateProviderCard('TogetherAI', stats.together)}
        ${this.generateProviderCard('Rule-based', stats.ruleBased)}
      </section>
    `;
    }
    generateProviderCard(name, stats) {
        return `
      <div class="card" role="region" aria-label="${name} status">
        <h3>${name} Status</h3>
        <div class="value">${stats.status}</div>
        ${stats.html}
      </div>
    `;
    }
    generateClusterSection(clusters) {
        return `
      <section class="technical-analysis">
        <h3>Technical Analysis</h3>
        <div class="details">
          <div class="detail-card">
            <h4>Error Categories</h4>
            <div class="content">
              <ul>
                ${Object.entries(clusters).map(([category, items]) => `<li>${category}: ${items.length} failures</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>
    `;
    }
    generateChartScripts(clusters, history) {
        return `
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        const clusters = ${JSON.stringify(clusters)};
        const historyData = ${JSON.stringify(history)};
        // ... chart initialization code ...
      </script>
    `;
    }
    generateFullReport(stats, clusters, history, totalTests, failures, passed) {
        return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>AI Failure Analysis Report</title>
          <style>${this.styles}</style>
        </head>
        <body>
          <header role="banner" aria-label="AI Failure Analysis Dashboard">
            🧠 AI Failure Analysis Dashboard
          </header>
          <main role="main">
            ${this.generateSummaryCards(totalTests, failures, passed)}
            ${this.generateProviderSection(stats)}
            ${this.generateClusterSection(clusters)}
            <!-- Additional sections -->
            ${this.generateChartScripts(clusters, history)}
          </main>
        </body>
      </html>
    `;
    }
}
exports.HTMLRenderer = HTMLRenderer;
