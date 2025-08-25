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
exports.ReportGenerator = void 0;
const path = __importStar(require("path"));
const FileManager_1 = require("./FileManager");
const failure_clustering_1 = require("../failure-clustering");
class ReportGenerator {
    constructor(providerManager, statsTracker, htmlRenderer, options = {}) {
        this.providerManager = providerManager;
        this.statsTracker = statsTracker;
        this.htmlRenderer = htmlRenderer;
        const defaultResultsPath = path.resolve(process.cwd(), 'artifacts/results.json');
        const defaultOutputHtml = path.resolve(process.cwd(), process.env.PLAYWRIGHT_AI_REPORT_PATH || 'artifacts/html-report/ai-analysis-report.html');
        const defaultHistoryPath = path.resolve(process.cwd(), 'artifacts/analytics-history.json');
        this.fileManager = new FileManager_1.FileManager(options.resultsPath || defaultResultsPath, options.outputHtml || defaultOutputHtml, options.historyPath || defaultHistoryPath);
    }
    async analyzeFailure(failure) {
        if (!failure.error) {
            return {
                reason: 'Test passed successfully',
                resolution: 'No resolution needed',
                provider: 'System',
                category: 'Passed'
            };
        }
        try {
            return await this.providerManager.analyzeWithProviders(failure.error, failure.stack || '');
        }
        catch (error) {
            return {
                reason: 'Analysis failed',
                resolution: 'Check system logs for details',
                provider: 'Error',
                category: 'System Error'
            };
        }
    }
    updateStats(result) {
        switch (result.provider) {
            case 'OpenAI':
                this.statsTracker.incrementSuccesses('openai');
                this.statsTracker.setSuccess('openai');
                break;
            case 'TogetherAI':
                this.statsTracker.incrementSuccesses('together');
                this.statsTracker.setSuccess('together');
                break;
            case 'Rule-based':
                this.statsTracker.incrementSuccesses('ruleBased');
                this.statsTracker.setSuccess('ruleBased');
                break;
        }
    }
    async generateReport() {
        try {
            this.fileManager.validateResultsFile();
            const failures = this.fileManager.readResultsFile();
            const clusters = (0, failure_clustering_1.clusterFailures)(failures);
            const uniqueFailures = new Set(failures.filter((f) => f.error).map((f) => f.testName));
            const uniquePasses = new Set(failures.filter((f) => !f.error).map((f) => f.testName));
            const failedCount = uniqueFailures.size;
            const passedCount = uniquePasses.size;
            for (const failure of failures) {
                const result = await this.analyzeFailure(failure);
                this.updateStats(result);
            }
            const history = this.fileManager.loadHistory();
            history.push({ date: new Date().toISOString(), total: failures.length, failed: failedCount, passed: passedCount });
            this.fileManager.saveHistory(history);
            const html = this.htmlRenderer.generateFullReport(this.statsTracker.getStats(), clusters, history, failures.length, failedCount, passedCount);
            this.fileManager.writeReport(html);
            console.log('✅ AI Failure Analysis Report generated successfully');
        }
        catch (err) {
            this.fileManager.writeErrorReport(err);
            console.error('\n❌ Error in report generator:');
            if (err instanceof Error) {
                console.error('Message:', err.message);
                if (err.stack)
                    console.error('\nStack trace:', err.stack);
            }
            else {
                console.error(err);
            }
            throw err;
        }
    }
}
exports.ReportGenerator = ReportGenerator;
