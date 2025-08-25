// generateReport.ts
import * as path from "path";
import * as fs from "fs";
import { ReportGenerator } from "./reporting/ReportGenerator";
import { ProviderManager } from "./reporting/ProviderManager";
import { StatsTracker } from "./reporting/StatsTracker";
import { HTMLRenderer } from "./reporting/HTMLRenderer";

// Paths (can be made configurable via env)
const RESULTS_PATHS = [
  process.env.PLAYWRIGHT_RESULTS_PATH || '',
  path.resolve('results/test-results.json'),
  path.resolve('artifacts/results.json'),
  path.resolve('artifacts/analytics-history.json') // fallback placeholder
].filter(Boolean);

const HISTORY_PATH = path.resolve('artifacts/analytics-history.json');
const REPORT_PATH = path.resolve('artifacts/html-report/ai-analysis-report.html');

async function generateReport() {
  try {
    console.log("🔎 Locating test results file...");
    let foundResults: string | null = null;
    for (const p of RESULTS_PATHS) {
      if (fs.existsSync(p)) {
        foundResults = p;
        break;
      }
    }

    if (!foundResults) {
      console.warn('⚠️ No test-results file found in expected locations. Please set PLAYWRIGHT_RESULTS_PATH or place results under results/ or artifacts/.');
    }

    console.log("📊 Initializing components...");
    const providerManager = new ProviderManager();
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

  console.log(" Generating consolidated report...");
  // ReportGenerator handles reading results, updating history and writing output itself
  await reportGenerator.generateReport();

    console.log(`✅ Report successfully generated at: ${REPORT_PATH}`);
  } catch (error: any) {
    console.error("❌ Report generation failed:", error.message);
    process.exit(1);
  }
}

generateReport();
