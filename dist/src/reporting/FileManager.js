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
exports.FileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileManager {
    constructor(resultsPath, outputHtml, historyPath) {
        this.resultsPath = resultsPath;
        this.outputHtml = outputHtml;
        this.historyPath = historyPath;
    }
    validateResultsFile() {
        if (!fs.existsSync(this.resultsPath)) {
            // Do not throw here; caller may handle absence. Keep a warning instead.
            console.warn(`Results file not found (will proceed with empty results): ${this.resultsPath}`);
            return;
        }
        const resultsContent = fs.readFileSync(this.resultsPath, 'utf-8');
        if (!resultsContent.trim()) {
            console.warn('Results file is empty; proceeding with empty results');
            return;
        }
        try {
            JSON.parse(resultsContent);
        }
        catch (e) {
            console.warn('Results file contains invalid JSON; proceeding with empty results');
            return;
        }
    }
    readResultsFile() {
        if (!fs.existsSync(this.resultsPath)) {
            return ([]);
        }
        try {
            const content = fs.readFileSync(this.resultsPath, 'utf-8');
            const parsed = content.trim() ? JSON.parse(content) : [];
            // If Playwright JSON reporter produced an object with `suites`, map it to a flat failures array
            if (parsed && !Array.isArray(parsed) && parsed.suites && Array.isArray(parsed.suites)) {
                const failures = [];
                for (const suite of parsed.suites) {
                    for (const spec of suite.specs || []) {
                        for (const testRecord of spec.tests || []) {
                            for (const result of testRecord.results || []) {
                                failures.push({
                                    testFile: spec.file || suite.file || null,
                                    testName: testRecord.title || testRecord.id || null,
                                    status: result.status || null,
                                    error: result.error ? (result.error.message || null) : null,
                                    stack: result.error ? (result.error.stack || null) : null,
                                    duration: result.duration || null,
                                    startTime: result.startTime || null,
                                    attachments: result.attachments || [],
                                    project: result.projectName || result.project || null,
                                });
                            }
                        }
                    }
                }
                return failures;
            }
            // Normalize to an array when the results file contains an object with a `results` field
            if (parsed && !Array.isArray(parsed) && parsed.results && Array.isArray(parsed.results)) {
                return parsed.results;
            }
            return (Array.isArray(parsed) ? parsed : []);
        }
        catch (e) {
            console.warn('Failed to read results file; proceeding with empty results');
            return ([]);
        }
    }
    loadHistory() {
        if (!fs.existsSync(this.historyPath)) {
            return [];
        }
        try {
            return JSON.parse(fs.readFileSync(this.historyPath, "utf-8"));
        }
        catch {
            return [];
        }
    }
    saveHistory(history) {
        const outputDir = path.dirname(this.historyPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), "utf-8");
    }
    writeReport(html) {
        const outputDir = path.dirname(this.outputHtml);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(this.outputHtml, html, "utf-8");
    }
    writeErrorReport(err) {
        const errorReport = path.resolve(process.cwd(), "artifacts/report-error.log");
        const errorContent = `AI Report Generation Error
========================
Time: ${new Date().toISOString()}
Severity: Critical
Component: Report Generator
Error: ${err instanceof Error ? err.message : String(err)}
${err instanceof Error && err.stack ? `\nStack Trace:\n${err.stack}` : ''}

Context:
- Results Path: ${this.resultsPath}
- Output Path: ${this.outputHtml}
- History Path: ${this.historyPath}
`;
        try {
            const errorDir = path.dirname(errorReport);
            if (!fs.existsSync(errorDir)) {
                fs.mkdirSync(errorDir, { recursive: true });
            }
            fs.writeFileSync(errorReport, errorContent, 'utf-8');
            console.error(`\nDetailed error log written to: ${errorReport}`);
        }
        catch (writeErr) {
            console.error("Failed to write error log:", writeErr);
        }
    }
}
exports.FileManager = FileManager;
