// generateReport.ts
import * as path from "path";
import * as fs from "fs";
import { ReportGenerator } from "./reporting/ReportGenerator";
import { ProviderManager } from "./reporting/ProviderManager";
import { StatsTracker } from "./reporting/StatsTracker";
import { HTMLRenderer } from "./reporting/HTMLRenderer";
import { fixTestTitles } from "./utils/test-title-fixer";

// Configuration
const CONFIG = {
  resultsDir: path.resolve('test-results'),
  artifactsDir: path.resolve('artifacts'),
  reportDir: path.resolve('artifacts/html-report'),
  historyFile: path.resolve('artifacts/analytics-history.json'),
  isDemo: process.argv.includes('--demo') || process.env.NODE_ENV === 'demo',
  mockData: {
    openai: {
      authFailure: "Authentication failure detected. Common issues: invalid credentials, rate limiting, or network issues. Recommended actions: 1) Verify credentials, 2) Implement retry mechanism, 3) Add error logging.",
      timingIssue: "Timing-related failure detected. Potential causes: race conditions, slow responses, or dynamic content. Solutions: 1) Increase timeout, 2) Add wait conditions, 3) Improve error handling.",
      domMutation: "DOM element not found. Likely causes: element not loaded, dynamic content, or incorrect selector. Fixes: 1) Add wait conditions, 2) Use more reliable selectors, 3) Handle dynamic content."
    }
  }
};

// Paths (can be made configurable via env)
const RESULTS_PATHS = [
  process.env.PLAYWRIGHT_RESULTS_PATH || '',
  CONFIG.resultsDir,
  path.resolve('results/test-results.json'),
  path.join(CONFIG.artifactsDir, 'results.json'),
  CONFIG.historyFile
].filter(Boolean);

// Function to process test results directory
function processTestResults(testResultsDir: string): any {
  const results = {
    failed: [] as any[],
    passed: [] as any[],
    total: 0
  };
  
  // Define a mapping of test tags to their actual titles
  const testTitleMapping: Record<string, string> = {
    'auth': 'Test intelligent authentication analysis',
    'timing': 'Test AI-driven dynamic content analysis',
    'dom': 'Test AI analysis of DOM mutations',
    'network': 'Test AI-driven network analysis',
    'validation': 'Test AI analysis of form validation',
    'state': 'Test AI-driven state management analysis',
    'shadow': 'Test AI analysis of Shadow DOM',
    'iframe': 'Test AI-driven iframe analysis',
    'race': 'Test AI analysis of race conditions',
    'recovery': 'Test AI-driven error recovery analysis'
  };
  
  if (fs.existsSync(testResultsDir) && fs.statSync(testResultsDir).isDirectory()) {
    const dirs = fs.readdirSync(testResultsDir);
    dirs.forEach(dir => {
      const fullPath = path.join(testResultsDir, dir);
      if (fs.statSync(fullPath).isDirectory() && !dir.includes('retry')) {
        const contextPath = path.join(fullPath, 'error-context.md');
        
        // Extract the tag from the directory name
        // Format is typically: ai-analysis-demo--auth-Tes-c2cd5-ent-authentication-analysis-chromium
        let testName = dir.replace(/-/g, ' ');
        const tagMatch = dir.match(/--([^-]+)-/);
        const tag = tagMatch ? tagMatch[1] : '';
        
        // Use the mapping to get the correct test title
        if (tag && testTitleMapping[tag]) {
          testName = testTitleMapping[tag];
          // Add browser info if present
          if (dir.includes('chromium')) testName += ' (Chromium)';
          else if (dir.includes('firefox')) testName += ' (Firefox)';
          else if (dir.includes('webkit')) testName += ' (WebKit)';
        }
        
        if (fs.existsSync(contextPath)) {
          results.failed.push({
            testName: testName,
            context: fs.readFileSync(contextPath, 'utf8')
          });
        } else {
          results.passed.push({
            testName: testName
          });
        }
      }
    });
    results.total = results.failed.length + results.passed.length;
  }
  return results;
}

const HISTORY_PATH = path.resolve('artifacts/analytics-history.json');
const REPORT_PATH = path.resolve('artifacts/html-report/ai-analysis-report.html');

async function generateReport() {
  try {
    console.log(`=== Starting Report Generation in ${CONFIG.isDemo ? 'DEMO' : 'PRODUCTION'} mode ===\n`);
    console.log(`DEBUG - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`DEBUG - argv: ${process.argv.join(' ')}`);
    console.log(`DEBUG - isDemo: ${CONFIG.isDemo}`);
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
    
    // Clean up previous results.json if it exists
    const resultsJsonPath = path.join(CONFIG.artifactsDir, 'results.json');
    if (fs.existsSync(resultsJsonPath)) {
      fs.rmSync(resultsJsonPath, { force: true });
    }

    if (CONFIG.isDemo) {
      console.log("🤖 Running in DEMO mode");
      console.log("- Using simulated AI responses");
      console.log("- No API calls will be made");
      console.log("- Demonstrating analysis capabilities\n");
    }

    console.log("🔎 Locating test results...");
    let foundResults: string | null = null;
    let testResults: any = null;

    for (const p of RESULTS_PATHS) {
      if (fs.existsSync(p)) {
        if (fs.statSync(p).isDirectory() && p.includes('test-results')) {
          console.log(`📁 Found test results directory: ${p}`);
          testResults = processTestResults(p);
          foundResults = p;
          // Write processed results to artifacts/results.json
          fs.writeFileSync(
            path.resolve('artifacts/results.json'), 
            JSON.stringify(testResults, null, 2)
          );
          // Fix the test titles in the results file
          fixTestTitles(path.resolve('artifacts/results.json'));
          break;
        } else if (fs.statSync(p).isFile()) {
          console.log(`📄 Found results file: ${p}`);
          foundResults = p;
          break;
        }
      }
    }

    if (!foundResults) {
      console.warn('⚠️ No test results found in expected locations. Please run tests first or check configuration.');
    }

    console.log("📊 Initializing components...");
    
    const isDemo = process.argv.includes('--demo');
    if (isDemo) {
      console.log("🤖 DEMO MODE: Using simulated AI providers");
      console.log("    - OpenAI (simulated)");
      console.log("    - TogetherAI (simulated)");
      console.log("    - Rule-based fallback");
    }
    
    const providerManager = new ProviderManager({ useMockProviders: isDemo });
    const statsTracker = new StatsTracker();
    const htmlRenderer = new HTMLRenderer();
    const reportGenerator = new ReportGenerator(
      providerManager,
      statsTracker,
      htmlRenderer,
      {
        resultsPath: foundResults || path.resolve('artifacts/results.json'),
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
