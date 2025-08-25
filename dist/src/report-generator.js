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
const RESULTS_PATH = path.resolve("results/test-results.json");
const HISTORY_PATH = path.resolve("results/failure-history.json");
const REPORT_PATH = path.resolve("results/consolidated-report.html");
async function generateReport() {
    try {
        console.log("🔎 Validating test results path...");
        if (!fs.existsSync(RESULTS_PATH)) {
            throw new Error(`Test results file not found: ${RESULTS_PATH}`);
        }
        console.log("📊 Initializing components...");
        const providerManager = new ProviderManager_1.ProviderManager();
        const statsTracker = new StatsTracker_1.StatsTracker();
        const htmlRenderer = new HTMLRenderer_1.HTMLRenderer();
        const reportGenerator = new ReportGenerator_1.ReportGenerator(providerManager, statsTracker, htmlRenderer);
        console.log(" Generating consolidated report...");
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
