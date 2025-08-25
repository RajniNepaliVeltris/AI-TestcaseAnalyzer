"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// generateReport.ts
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ReportGenerator_1 = require("./reporting/ReportGenerator");
const ProviderManager_1 = require("./reporting/ProviderManager");
const StatsTracker_1 = require("./reporting/StatsTracker");
const HTMLRenderer_1 = require("./reporting/HTMLRenderer");
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
        let foundResults = null;
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
        // For demo mode: Add console information about mock AI providers
        console.log("🤖 DEMO MODE: Using simulated AI providers");
        console.log("    - OpenAI (simulated)");
        console.log("    - TogetherAI (simulated)");
        console.log("    - Rule-based fallback");
        const providerManager = new ProviderManager_1.ProviderManager({ useMockProviders: true });
        const statsTracker = new StatsTracker_1.StatsTracker();
        const htmlRenderer = new HTMLRenderer_1.HTMLRenderer();
        const reportGenerator = new ReportGenerator_1.ReportGenerator(providerManager, statsTracker, htmlRenderer, {
            resultsPath: foundResults || path.resolve('artifacts/results.json'),
            historyPath: HISTORY_PATH,
            outputHtml: REPORT_PATH
        });
        console.log("🔄 Generating consolidated report...");
        console.log("[DEBUG] Starting report generation process with results from: " + (foundResults || "No results file found"));
        // ReportGenerator handles reading results, updating history and writing output itself
        await reportGenerator.generateReport();
        console.log(`✅ Report successfully generated at: ${REPORT_PATH}`);
    }
    catch (error) {
        console.error("❌ Report generation failed:", error.message);
        process.exit(1);
    }
}
generateReport();
