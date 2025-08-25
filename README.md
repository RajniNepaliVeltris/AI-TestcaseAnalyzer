# QA Analyzer

QA Analyzer is a reusable framework for AI-based test failure analysis and report generation. It integrates seamlessly with Playwright projects and provides powerful tools for debugging and reporting.

## Features
- **AI Integration**: Supports multiple AI providers (OpenAI, TogetherAI, etc.) with fallback to rule-based analysis.
- **Customizable**: Configurable paths, AI providers, and report settings.
- **Reusable**: Can be integrated into any Playwright project.
- **CLI Commands**: Easy-to-use commands for running tests, analyzing failures, and generating reports.

## How It Works
1. **Test Execution**:
   - The framework runs Playwright tests and collects logs for failed test cases.

2. **Failure Analysis**:
   - AI-based analysis is performed on the failure logs using configured AI providers (e.g., OpenAI, TogetherAI).
   - If AI analysis fails, the framework falls back to rule-based analysis.

3. **Report Generation**:
   - A detailed HTML report is generated, including failure reasons, probable resolutions, and links to screenshots and traces.
   - The report also includes analytics like failure trends and cluster distributions.

## Framework Details
### Modules
- **Test Execution**:
  - Handles running Playwright tests and collecting failure logs.
- **Failure Analysis**:
  - Performs AI-based and rule-based analysis of test failures.
- **Report Generation**:
  - Generates an HTML report with detailed failure analysis and analytics.

### Configuration
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

### CLI Commands
#### Running Tests
```bash
# Run all tests
npx qa-analyzer run

# Run with options
npx qa-analyzer run --parallel     # Run tests in parallel (4 workers)
npx qa-analyzer run --headed       # Run in headed mode
npx qa-analyzer run --tags smoke,regression  # Run specific test tags
npx qa-analyzer run --grep "Search"  # Run tests matching pattern
npx qa-analyzer run --retries 2    # Set retry count

# Multiple options can be combined
npx qa-analyzer run --parallel --tags regression --retries 2
```

#### Test Execution Features
- **Parallel Execution**: Run tests concurrently with `--parallel`
- **Test Filtering**: 
  - By tags: `--tags smoke,regression`
  - By pattern: `--grep "Search"`
- **Browser Mode**: 
  - Headless (default)
  - Headed: `--headed`
- **Retry Control**: `--retries <count>`
- **Real-time Reporting**:
  - Test progress
  - Execution time
  - Failure analysis
  - Retry attempts

#### Analysis and Reports
```bash
# Analyze failures
npx qa-analyzer analyze

# Generate reports
npx qa-analyzer report
```

The test execution provides:
- Detailed test statistics
- Execution timing
- Failure retry summary
- Category-wise results
- Links to HTML and JSON reports

### Integration with CI/CD
Add the following commands to your CI/CD pipeline:
```bash
npx qa-analyzer run
npx qa-analyzer analyze
npx qa-analyzer report
```

## Installation
1. Install the package:
   ```bash
   npm install /path/to/qa-analyzer
   ```

2. Add the configuration file:
   Copy `qa-analyzer.config.json` to the root of your project and customize it as needed.

## Troubleshooting
- Ensure the `qa-analyzer.config.json` file is correctly configured.
- Verify that the AI providers are accessible and properly authenticated.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any bugs or feature requests.

## License
This project is licensed under the MIT License.