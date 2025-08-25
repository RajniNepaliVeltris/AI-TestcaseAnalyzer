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
            console.log(`🧠 Analyzing test: ${failure.testName}`);
            return await this.providerManager.analyzeWithProviders(failure.error, failure.stack || '', failure.testName);
        }
        catch (error) {
            console.error(`❌ Analysis failed for test: ${failure.testName}`);
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
            console.log("🔍 Validating test results file...");
            this.fileManager.validateResultsFile();
            console.log("📑 Reading test results data...");
            const allResults = this.fileManager.readResultsFile();
            console.log(`[DEBUG] Found ${allResults.length} total test results`);
            console.log("=== TEST CASE NAMES (All Results) ===");
            allResults.forEach((result, index) => {
                console.log(`[DEBUG] Test #${index + 1}: ${result.testName || '[No test name]'} (${result.status || 'unknown status'})`);
            });
            console.log("=====================================");
            // Only analyze failed results
            const failures = allResults.filter((r) => r.status === 'failed' || r.error);
            console.log(`[DEBUG] Found ${failures.length} failed test results`);
            console.log("=== TEST CASE NAMES (Failed Results) ===");
            failures.forEach((failure, index) => {
                console.log(`[DEBUG] Failed Test #${index + 1}: ${failure.testName || '[No test name]'}`);
                console.log(`[DEBUG] - Error: ${failure.error ? failure.error.substring(0, 100) + (failure.error.length > 100 ? '...' : '') : 'No error message'}`);
            });
            console.log("========================================");
            const clusters = (0, failure_clustering_1.clusterFailures)(failures);
            console.log(`[DEBUG] Clustered failures into ${Object.keys(clusters).length} groups`);
            // Group failures by test name to identify unique tests vs retry attempts
            const failuresByTest = failures.reduce((acc, failure) => {
                if (!acc[failure.testName])
                    acc[failure.testName] = [];
                acc[failure.testName].push(failure);
                return acc;
            }, {});
            const uniqueFailures = new Set(failures.filter((f) => f.error).map((f) => f.testName));
            const uniquePasses = new Set(allResults.filter((f) => !f.error).map((f) => f.testName));
            const failedCount = uniqueFailures.size; // Number of unique failed tests
            const totalFailureAttempts = failures.length; // Total number of failure records (including retries)
            const passedCount = uniquePasses.size;
            console.log(`[DEBUG] Unique test names - Failed: ${failedCount}, Passed: ${passedCount}`);
            console.log("=== UNIQUE FAILED TEST NAMES ===");
            uniqueFailures.forEach(testName => {
                console.log(`[DEBUG] - ${testName}`);
            });
            console.log("===============================");
            const perFailureResults = [];
            // Analyze failures and collect per-failure results
            for (const failure of failures) {
                const result = await this.analyzeFailure(failure);
                perFailureResults.push({ failure, analysis: result });
                const aiStatus = result.aiStatus;
                if (aiStatus) {
                    if (aiStatus.openai) {
                        this.statsTracker.incrementAttempts('openai');
                        if (aiStatus.openai.available) {
                            this.statsTracker.incrementSuccesses('openai');
                            this.statsTracker.setSuccess('openai');
                        }
                        else {
                            this.statsTracker.setError('openai', aiStatus.openai.error || 'OpenAI unavailable');
                        }
                    }
                    if (aiStatus.together) {
                        this.statsTracker.incrementAttempts('together');
                        if (aiStatus.together.available) {
                            this.statsTracker.incrementSuccesses('together');
                            this.statsTracker.setSuccess('together');
                        }
                        else {
                            this.statsTracker.setError('together', aiStatus.together.error || 'TogetherAI unavailable');
                        }
                    }
                }
                else {
                    // rule-based
                    this.statsTracker.incrementAttempts('ruleBased');
                    this.statsTracker.incrementSuccesses('ruleBased');
                    this.statsTracker.setSuccess('ruleBased');
                }
                this.updateStats(result);
            }
            // Build provider HTML snippets
            const openaiStats = this.statsTracker.getStats().openai;
            this.statsTracker.updateProviderStats('openai', {
                html: this.htmlRenderer.generateProviderHTML('OpenAI', 'gpt-3.5-turbo', 'LLM', openaiStats.attempts, openaiStats.successes, openaiStats.error),
            });
            const togetherStats = this.statsTracker.getStats().together;
            this.statsTracker.updateProviderStats('together', {
                html: this.htmlRenderer.generateProviderHTML('TogetherAI', 'togethercomputer/llama-2-70b-chat', 'LLM', togetherStats.attempts, togetherStats.successes, togetherStats.error),
            });
            const ruleStats = this.statsTracker.getStats().ruleBased;
            this.statsTracker.updateProviderStats('ruleBased', {
                html: this.htmlRenderer.generateProviderHTML('Rule-based', 'heuristic-rules', 'Fallback', ruleStats.attempts, ruleStats.successes, ruleStats.error),
            });
            const history = this.fileManager.loadHistory();
            history.push({ date: new Date().toISOString(), total: failures.length, failed: failedCount, passed: passedCount });
            this.fileManager.saveHistory(history);
            const html = this.htmlRenderer.generateFullReport(this.statsTracker.getStats(), clusters, history, allResults.length, // Total tests
            failures.length, // Total failures including retries
            passedCount, // Passed tests
            perFailureResults);
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
