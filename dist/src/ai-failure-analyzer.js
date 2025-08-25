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
exports.parsePlaywrightResults = parsePlaywrightResults;
exports.analyzeFailure = analyzeFailure;
exports.analyzeFailureAI = analyzeFailureAI;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
require("dotenv/config");
const mock_provider_1 = require("./providers/mock-provider");
/**
 * Parse Playwright JSON results to extract failed test artifacts.
 */
function parsePlaywrightResults(resultsPath) {
    console.log('\ud83d\udcca Parsing Playwright test results...');
    const raw = fs.readFileSync(resultsPath, "utf-8");
    const data = JSON.parse(raw);
    const failures = [];
    for (const suite of data.suites ?? []) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                for (const result of test.results ?? []) {
                    if (result.status === "failed") {
                        console.log(`\u274c Found failed test: ${spec.title}`);
                        const errorObj = result.error || (result.errors && result.errors[0]) || {};
                        const error = errorObj.message || "Unknown error";
                        const stack = errorObj.stack || "";
                        let screenshotPath, tracePath;
                        if (result.attachments) {
                            for (const att of result.attachments) {
                                if (att.contentType === "image/png") {
                                    screenshotPath = att.path;
                                    console.log(`\ud83d\udcf7 Screenshot found: ${path.basename(att.path)}`);
                                }
                                if (att.contentType === "application/zip") {
                                    tracePath = att.path;
                                    console.log(`\ud83d\udd0d Trace file found: ${path.basename(att.path)}`);
                                }
                            }
                        }
                        // Correct screenshot path if malformed
                        const correctedScreenshotPath = screenshotPath?.replace(/file:\/\/C:\/C:\//g, "file:///");
                        // Extract retry info
                        const retry = result.retry !== undefined
                            ? result.retry
                            : result.retries?.length ?? 0;
                        if (retry > 0) {
                            console.log(`\ud83d\udd04 Test had ${retry} retry attempt(s)`);
                        }
                        failures.push({
                            testName: spec.title,
                            error,
                            stack,
                            screenshotPath: correctedScreenshotPath,
                            tracePath,
                            retry,
                        });
                    }
                }
            }
        }
    }
    return failures;
}
/**
 * Helper: find a test artifact by extension in test-results directory.
 */
function findArtifactPath(test, ext) {
    const testResultsDir = path.join("test-results");
    const files = fs.readdirSync(testResultsDir, { withFileTypes: true });
    for (const dirent of files) {
        if (dirent.isDirectory() && dirent.name.includes(test.title)) {
            const dirPath = path.join(testResultsDir, dirent.name);
            const artifacts = fs.readdirSync(dirPath);
            for (const file of artifacts) {
                if (file.endsWith("." + ext)) {
                    return path.join(dirPath, file);
                }
            }
        }
    }
    return undefined;
}
/**
 * Rule-based fallback analyzer for Playwright failures.
 */
function analyzeFailure(logs) {
    const text = normalize(logs);
    const ctx = {
        selector: extractSelector(text),
        timeoutMs: extractTimeout(text),
        statusCode: extractStatus(text),
        url: extractUrl(text),
    };
    const RULES = [
        // Assertion mismatch (highest priority)
        {
            id: "assertion-mismatch",
            pattern: /(Expected pattern|Expected:|Received:|expect\(.+\)\.toHaveTitle)/i,
            priority: 95,
            reason: (t) => {
                const expected = extractBetween(t, /Expected(?: pattern)?:\s*(.*)/i);
                const received = extractBetween(t, /Received(?: string)?:\s*(.*)/i);
                if (expected && received) {
                    return `Assertion failed: expected "${expected}" but received "${received}".`;
                }
                return "Assertion failed due to mismatch between expected and actual values.";
            },
            resolution: () => bullets([
                "Check expected value matches application output.",
                "Update test expectation if app changed intentionally.",
                "Add waits if mismatch is timing-related.",
                "Use regex/substring for partial checks.",
            ]),
            confidence: 0.9,
        },
        // Timeout
        {
            id: "timeout",
            pattern: /timeout|timed out|exceeded.*ms/i,
            priority: 90,
            reason: () => "Operation timed out.",
            resolution: () => bullets([
                "Verify awaited locator is correct.",
                "Ensure app reaches expected state before asserting.",
                "Increase timeout only after validating cause.",
            ]),
            confidence: 0.85,
        },
        // Network issues
        {
            id: "network-errors",
            pattern: /network|connection|DNS resolution failed|net::ERR_/i,
            priority: 92,
            reason: () => "Network-related issue detected.",
            resolution: () => bullets([
                "Verify base URL and server availability.",
                "Check proxy/VPN/firewall/DNS resolution.",
                "Stub or mock external dependencies if possible.",
            ]),
            confidence: 0.85,
        },
        // Locator issues
        {
            id: "locator-issues",
            pattern: /locator|selector|strict mode violation|querySelector.*returned null/i,
            priority: 80,
            reason: () => "Locator-related issue detected.",
            resolution: () => bullets([
                "Use stable locators (role/testid).",
                "Narrow locator with role, name, or filter.",
                "Ensure locator targets unique element.",
            ]),
            confidence: 0.8,
        },
        // Visual/layout
        {
            id: "visual-layout",
            pattern: /element.*not.*visible|element.*hidden|covered|overlapped|layout.*changed/i,
            priority: 85,
            reason: () => "Visual or layout-related issue detected.",
            resolution: () => bullets([
                "Scroll element into view if needed.",
                "Check overlays/modals covering element.",
                "Ensure layout is stable before interaction.",
                "Wait for animations/transitions to complete.",
            ]),
            confidence: 0.85,
        },
    ];
    // Pick best matching rule
    const matches = RULES.map((rule) => {
        const m = text.match(rule.pattern);
        return m
            ? {
                rule,
                match: m,
                score: rule.priority * 100 + Math.round(rule.confidence * 100),
            }
            : null;
    }).filter(Boolean);
    if (matches.length > 0) {
        matches.sort((a, b) => b.score - a.score);
        const top = matches[0];
        return {
            reason: top.rule.reason(text, ctx, top.match),
            resolution: top.rule.resolution(text, ctx, top.match),
            provider: "Rule-based",
            category: top.rule.id,
            prevention: "Implement error handling and validation.",
            confidence: top.rule.confidence,
        };
    }
    // Fallback
    return {
        reason: "Unknown failure.",
        resolution: bullets([
            "Review logs and stack trace for first error.",
            "Check network, locator stability, and async waits.",
            "Enable tracing/screenshot/video for more context.",
        ]),
        provider: "Rule-based",
        category: "other",
        prevention: "Improve logging and monitoring.",
        confidence: 0.7,
    };
    // ---- Helpers ----
    function normalize(s) {
        return (s || "")
            .replace(/\u001b\[[0-9;]*m/g, "")
            .replace(/\r/g, "")
            .replace(/\t/g, "  ")
            .replace(/[ ]{2,}/g, " ")
            .trim();
    }
    function bullets(lines) {
        return lines.map((l) => `• ${l}`).join("\n");
    }
    function extractSelector(t) {
        const patterns = [
            /locator\((?:'|")([^"'`]+)(?:'|")\)/i,
            /waiting for selector "?([^"\n]+)"?/i,
            /getBy(Role|TestId|Text)\((?:'|")([^"'`]+)(?:'|")\)/i,
            /querySelector\((?:'|")([^"'`]+)(?:'|")\)/i,
        ];
        for (const p of patterns) {
            const m = t.match(p);
            if (m)
                return m[2] ?? m[1];
        }
        return undefined;
    }
    function extractTimeout(t) {
        const m = t.match(/(?:timeout|Exceeded timeout of)\s*(\d{2,})\s*ms/i);
        return m ? Number(m[1]) : undefined;
    }
    function extractStatus(t) {
        const m = t.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2})\b/);
        return m ? Number(m[1]) : undefined;
    }
    function extractUrl(t) {
        const m = t.match(/(https?:\/\/[^\s'"]+)/i) ||
            t.match(/Navigating to (https?:\/\/[^\s'"]+)/i);
        return m ? m[1] : undefined;
    }
    function extractBetween(t, regex) {
        const m = t.match(regex);
        return m ? m[1].trim() : undefined;
    }
}
// ---------- AI-powered Analyzer with Fallback ----------
async function analyzeFailureAI(logs, testName) {
    console.log('🔍 Analyzing test failure with AI...');
    console.log(`💬 Test name: ${testName || 'Unknown test'}`);
    // Extract error message and stack trace from logs
    const errorMatch = logs.match(/Error:\s*([^\n]+)/i);
    const error = errorMatch ? errorMatch[1] : "Unknown error";
    const stack = logs.substring(logs.indexOf("stack") + 6) || logs;
    // DEMO MODE: Use mock AI provider instead of real API calls
    console.log('✨ Using DEMO MODE with simulated AI responses');
    // Simulate API latency for a more realistic demo
    const delay = Math.floor(Math.random() * 1000) + 500; // Random delay between 500-1500ms
    console.log(`⏱️ AI processing time: ${delay}ms`);
    // Add a simulated delay
    await new Promise(resolve => setTimeout(resolve, delay));
    // Show which AI provider is being used
    const provider = Math.random() > 0.5 ? 'OpenAI' : 'TogetherAI';
    console.log(`🤖 Using AI provider: ${provider}`);
    try {
        // Get analysis from mock provider
        const analysis = (0, mock_provider_1.getMockAnalysis)(error, stack, testName);
        // Log success for demo purposes
        console.log('✅ AI analysis completed successfully');
        console.log(`📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log(`🏷️ Category: ${analysis.category || 'Uncategorized'}`);
        return analysis;
    }
    catch (err) {
        // If mock provider fails, use rule-based analysis
        console.log('⚠️ AI analysis failed, falling back to rule-based analysis');
        const fallbackAnalysis = analyzeFailure(logs);
        return {
            ...fallbackAnalysis,
            provider: 'Rule-based',
            aiStatus: {
                openai: { available: false, error: 'Demo mode: API error simulated' },
                together: { available: false, error: 'Demo mode: API error simulated' }
            }
        };
    }
}
