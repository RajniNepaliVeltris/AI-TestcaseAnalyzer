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
            throw new Error(`Results file not found: ${this.resultsPath}`);
        }
        const resultsContent = fs.readFileSync(this.resultsPath, 'utf-8');
        if (!resultsContent.trim()) {
            throw new Error('Results file is empty');
        }
        try {
            JSON.parse(resultsContent);
        }
        catch (e) {
            throw new Error('Results file contains invalid JSON');
        }
    }
    readResultsFile() {
        return JSON.parse(fs.readFileSync(this.resultsPath, 'utf-8'));
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
