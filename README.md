# AI-TestcaseAnalyzer

[![Playwright](https://img.shields.io/badge/Powered%20by-Playwright-45ba4b.svg)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![AI-Powered](https://img.shields.io/badge/AI--Powered-Analysis-9233FF.svg)](https://openai.com/)

A powerful test automation framework that leverages AI to analyze test failures, providing intelligent insights and actionable solutions. AI-TestcaseAnalyzer integrates seamlessly with Playwright projects and provides advanced tools for debugging, analysis, and reporting.

## 🌟 Features

- **AI-Powered Test Failure Analysis**: Automatically analyzes test failures using OpenAI or TogetherAI
- **Intelligent Failure Clustering**: Groups similar failures to identify patterns and common issues
- **Enhanced HTML Reports**: Detailed, interactive reports with AI-driven insights and visualizations
- **Self-Healing Mechanisms**: Adaptive element selection to improve test stability
- **Historical Trend Analysis**: Track test reliability and improvement over time
- **Customizable**: Configurable paths, AI providers, and report settings
- **Reusable**: Can be integrated into any Playwright project

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- Supported browsers for Playwright (automatically installed)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/RajniNepaliVeltris/AI-TestcaseAnalyzer.git
cd AI-TestcaseAnalyzer
```

2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npm run playwright:install
```

4. Set up environment variables:

Create a `.env.prod` file in the project root with your API keys (for production mode):

```
OPENAI_API_KEY=your-openai-key
TOGETHER_AI_KEY=your-together-ai-key
```

## 🧠 How It Works

1. **Test Execution**:
   - The framework runs Playwright tests and collects logs for failed test cases.
   - Self-healing mechanisms attempt to recover from common test failures.

2. **Failure Analysis**:
   - AI-based analysis is performed on the failure logs using configured AI providers (OpenAI, TogetherAI).
   - Advanced clustering algorithms group similar failures to identify patterns.
   - If AI analysis fails, the framework falls back to rule-based analysis.

3. **Report Generation**:
   - A detailed HTML report is generated, including failure reasons, probable resolutions, and links to screenshots and traces.
   - The report includes analytics like failure trends, cluster distributions, and AI provider performance.

## 📊 Usage

### Running Tests with AI Analysis

To run tests with AI analysis in production mode (uses actual AI providers):

```bash
npm run prod
```

### Running Tests Only

```bash
npm run test
```

### Generating AI Analysis Report Only

For production mode:
```bash
npm run prod:report
```

## 📋 Available Scripts

- `npm run test` - Run Playwright tests
- `npm run build` - Build TypeScript files
- `npm run playwright:install` - Install Playwright browsers and dependencies
- `npm run analyze` - Generate AI analysis for test failures
- `npm run demo` - Run tests in demo mode with simulated AI responses
- `npm run prod` - Run tests in production mode with real AI analysis
- `npm run demo:full` - Run tests in demo mode and open the report automatically
- `npm run demo:headed` - Run demo tests in headed mode
- `npm run prod:legacy` - Run tests in production mode with advanced failure clustering
- `npm run prod:report` - Generate production AI analysis report
- `npm run cluster` - Run failure clustering analysis
- `npm run setup` - Set up test environment

## ⚙️ Configuration

The `qa-analyzer.config.json` file allows you to customize the framework:

```json
{
  "resultsPath": "artifacts/results.json",
  "outputHtml": "artifacts/html-report/ai-failure-report.html",
  "aiProviders": [
    "OpenAI",
    "TogetherAI"
  ],
  "fallback": "Rule-based",
  "reportSettings": {
    "includeCharts": true,
    "includeHistory": true
  }
}
```

## 🧠 AI Analysis Features

### Failure Analysis
The framework detects various failure patterns and provides specific recommendations:

- **Authentication Issues**: Analyzes login failures and credential problems
- **Timing Problems**: Identifies race conditions and synchronization issues
- **Element Visibility**: Diagnoses DOM-related failures and selector problems
- **Network Issues**: Detects connectivity and API-related failures
- **Form Validation**: Analyzes input validation failures
- **State Management**: Identifies state-related issues in applications
- **Shadow DOM**: Helps debug complex DOM structures

### Report Sections
The AI analysis report includes:

- Executive summary of test results
- AI-driven failure analysis with root causes
- Recommended solutions and prevention strategies
- Failure clustering to identify patterns
- Historical trends and reliability metrics
- Provider performance statistics

## 📝 Demo Tests

The repository includes demo tests that showcase the AI analysis capabilities:

- **Authentication Test**: Demonstrates analysis of login failures
- **Dynamic Content Test**: Shows timing analysis for dynamic elements
- **DOM Mutation Test**: Tests AI analysis of dynamic DOM changes
- **Network Resilience Test**: Demonstrates network analysis capabilities
- **Form Validation Test**: Shows validation error analysis
- **State Management Test**: Analyzes application state issues

## 📈 Project Structure

```
AI-TestcaseAnalyzer/
├── src/                       # Source code
│   ├── ai-failure-analyzer.ts # Core AI analysis logic
│   ├── failure-clustering.ts  # Failure pattern clustering
│   ├── report-generator.ts    # HTML report generation
│   ├── selfHealing.ts         # Self-healing test mechanisms
│   ├── providers/             # AI provider implementations
│   ├── reporting/             # Reporting components
│   ├── services/              # Core services
│   └── utils/                 # Utility functions
├── tests/                     # Test scripts
├── artifacts/                 # Generated reports and data
├── test-results/              # Playwright test results
└── playwright.config.ts       # Playwright configuration
```

## 🔄 Integration with CI/CD

Add the following commands to your CI/CD pipeline:

```bash
npm run prod
npm run notify  # For Slack notifications (if configured)
```

Or use the combined CI command:

```bash
npm run ci
```

## ❓ Troubleshooting

- Ensure the `qa-analyzer.config.json` file is correctly configured.
- Verify that the AI providers are accessible and properly authenticated.
- Check the `.env.prod` file contains valid API keys for production mode.
- Examine the `artifacts/report-error.log` file for detailed error information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.