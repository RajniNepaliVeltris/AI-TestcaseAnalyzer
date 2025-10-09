// generateReport.ts
import * as path from "path";
import * as fs from "fs";
import dotenv from 'dotenv';
import { ReportGenerator } from "./reporting/ReportGenerator";
import { ProviderManager } from "./reporting/ProviderManager";
import { StatsTracker } from "./reporting/StatsTracker";
import { HTMLRenderer } from "./reporting/HTMLRenderer";
import { BatchAIService } from "./services/ai/BatchAIService";
import { FailureClusteringService } from "./services/ai/FailureClusteringService";
import { fixTestTitles } from "./utils/test-title-fixer";

// Load environment variables
// Load production environment file
const envPath = path.resolve('.env.prod');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded production environment from .env.prod');
} else {
  console.warn('⚠️  .env.prod file not found, loading default .env');
  dotenv.config();
}

// Configuration
const CONFIG = {
  resultsDir: path.resolve('test-results'),
  artifactsDir: path.resolve('artifacts'),
  reportDir: path.resolve('artifacts/html-report'),
  historyFile: path.resolve('artifacts/analytics-history.json')
};

// Paths (can be made configurable via env)
const RESULTS_PATHS = [
  process.env.PLAYWRIGHT_RESULTS_PATH || '',
  CONFIG.resultsDir,
  path.resolve('results/test-results.json'),
  path.join(CONFIG.artifactsDir, 'results.json'),
  CONFIG.historyFile
].filter(Boolean);

// Function to process Playwright test results from results.json
function processTestResults(resultsPath: string): any {
  const results = {
    failed: [] as any[],
    passed: [] as any[],
    total: 0
  };

  try {
    // Read the Playwright results.json file
    const playwrightResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    if (!playwrightResults.suites || !Array.isArray(playwrightResults.suites)) {
      console.warn('No test suites found in Playwright results');
      return results;
    }

    // Process each test suite
    playwrightResults.suites.forEach((suite: any) => {
      if (suite.suites) {
        suite.suites.forEach((subSuite: any) => {
          processTestSuite(subSuite, results);
        });
      } else {
        processTestSuite(suite, results);
      }
    });

    results.total = results.failed.length + results.passed.length;
    return results;
  } catch (error) {
    console.error('Error processing Playwright results:', error);
    return results;
  }
}

function processTestSuite(suite: any, results: any) {
  if (!suite.specs) return;

  suite.specs.forEach((spec: any) => {
    if (!spec.tests) return;

    spec.tests.forEach((test: any) => {
      if (!test.results || !Array.isArray(test.results)) return;

      // Process each test result (including retries)
      test.results.forEach((result: any, index: number) => {
        const testName = spec.title; // Use spec title, not test.title
        const isRetry = index > 0;

        if (result.status === 'failed') {
          // Extract real error message from Playwright results
          let errorMessage = 'Unknown error occurred';
          let errorStack = '';

          if (result.error && result.error.message) {
            // Clean up ANSI color codes and formatting
            errorMessage = result.error.message
              .replace(/\u001b\[[0-9;]*m/g, '') // Remove ANSI color codes
              .replace(/\n+/g, ' ') // Replace multiple newlines with single space
              .trim();

            if (result.error.stack) {
              errorStack = result.error.stack.replace(/\u001b\[[0-9;]*m/g, '');
            }
          }

          // Find error context file
          let context = '';
          const errorContextAttachment = result.attachments?.find((att: any) =>
            att.name === 'error-context'
          );

          if (errorContextAttachment && fs.existsSync(errorContextAttachment.path)) {
            context = fs.readFileSync(errorContextAttachment.path, 'utf8');
          }

          results.failed.push({
            testName: isRetry ? `${testName} (Retry ${index})` : testName,
            error: errorMessage,
            stack: errorStack,
            context: context,
            retry: index
          });
        } else if (result.status === 'passed' && !isRetry) {
          // Only add passed tests once (not for retries)
          results.passed.push({
            testName: testName
          });
        }
      });
    });
  });
}const HISTORY_PATH = path.resolve('artifacts/analytics-history.json');
const REPORT_PATH = path.resolve('artifacts/html-report/ai-analysis-report.html');

async function generateReport() {
  try {
    console.log(`=== Starting Report Generation ===\n`);
    console.log(`DEBUG - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`DEBUG - argv: ${process.argv.join(' ')}`);
    console.log(`DEBUG - reportDir: ${CONFIG.reportDir}`);

    // Make sure directories exist but don't delete existing content
    if (!fs.existsSync(CONFIG.artifactsDir)) {
      fs.mkdirSync(CONFIG.artifactsDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }
    
    // Only remove our AI analysis report if it exists
    const aiReportPath = path.join(CONFIG.reportDir, 'ai-analysis-report.html');
    if (fs.existsSync(aiReportPath)) {
      fs.rmSync(aiReportPath, { force: true });
    }
    
    // Clean up previous results.json if it exists (could be file or directory)
    const resultsJsonPath = path.join(CONFIG.artifactsDir, 'results.json');
    if (fs.existsSync(resultsJsonPath)) {
      const stat = fs.statSync(resultsJsonPath);
      if (stat.isDirectory()) {
        fs.rmSync(resultsJsonPath, { recursive: true, force: true });
      } else {
        fs.rmSync(resultsJsonPath, { force: true });
      }
    }

    console.log("🔎 Locating test results...");
    let foundResults: string | null = null;
    let testResults: any = null;

    // Look for Playwright results.json file first
    const playwrightResultsPath = path.resolve('artifacts/playwright-results.json');
    if (fs.existsSync(playwrightResultsPath) && fs.statSync(playwrightResultsPath).isFile()) {
      console.log(`📄 Found Playwright results file: ${playwrightResultsPath}`);
      testResults = processTestResults(playwrightResultsPath);
      // Save processed results for ReportGenerator
      const processedResultsPath = path.resolve('artifacts/results.json');
      fs.writeFileSync(processedResultsPath, JSON.stringify(testResults, null, 2));
      foundResults = playwrightResultsPath;
    } else {
      // Fallback to legacy artifacts/results.json
      const legacyResultsPath = path.resolve('artifacts/results.json');
      if (fs.existsSync(legacyResultsPath) && fs.statSync(legacyResultsPath).isFile()) {
        console.log(`📄 Found legacy results file: ${legacyResultsPath}`);
        testResults = processTestResults(legacyResultsPath);
        foundResults = legacyResultsPath;
      } else {
        // Fallback to directory processing (legacy)
        for (const p of RESULTS_PATHS) {
          if (fs.existsSync(p)) {
            if (fs.statSync(p).isDirectory() && p.includes('test-results')) {
              console.log(`📁 Found test results directory: ${p}`);
              testResults = processTestResults(p);
              foundResults = p;
              break;
            } else if (fs.statSync(p).isFile()) {
              console.log(`📄 Found results file: ${p}`);
              foundResults = p;
              break;
            }
          }
        }
      }
    }

    if (!foundResults) {
      console.warn('⚠️ No test results found in expected locations. Please run tests first or check configuration.');
    }

    console.log("📊 Initializing components...");
    
    const providerManager = new ProviderManager({ useMockProviders: false }); // Always use real providers
    const statsTracker = new StatsTracker();
    const htmlRenderer = new HTMLRenderer();
    const reportGenerator = new ReportGenerator(
      providerManager,
      statsTracker,
      htmlRenderer,
      {
        resultsPath: path.resolve('artifacts/results.json'), // Always use processed results
        historyPath: HISTORY_PATH,
        outputHtml: REPORT_PATH
      }
    );

    console.log("🔄 Generating consolidated report...");
    console.log("[DEBUG] Starting report generation process with results from: " + (foundResults || "No results file found"));
    
    await reportGenerator.generateReport();
    console.log(`✅ Report successfully generated at: ${REPORT_PATH}`);
  } catch (error: any) {
    console.error("❌ Report generation failed:", error.message);
    process.exit(1);
  }
}

generateReport();
