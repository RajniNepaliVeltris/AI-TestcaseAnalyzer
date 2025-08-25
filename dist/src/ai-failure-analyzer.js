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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlaywrightResults = parsePlaywrightResults;
exports.analyzeFailure = analyzeFailure;
exports.analyzeFailureAI = analyzeFailureAI;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
const rate_limiter_1 = require("./utils/rate-limiter");
function parsePlaywrightResults(resultsPath) {
    const raw = fs.readFileSync(resultsPath, "utf-8");
    const data = JSON.parse(raw);
    const failures = [];
    for (const suite of data.suites ?? []) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                for (const result of test.results ?? []) {
                    if (result.status === "failed") {
                        const errorObj = result.error || (result.errors && result.errors[0]) || {};
                        const error = errorObj.message || "Unknown error";
                        const stack = errorObj.stack || "";
                        let screenshotPath, tracePath;
                        if (result.attachments) {
                            for (const att of result.attachments) {
                                if (att.contentType === "image/png")
                                    screenshotPath = att.path;
                                if (att.contentType === "application/zip")
                                    tracePath = att.path;
                            }
                        }
                        // Correcting the screenshot report link
                        const correctedScreenshotPath = screenshotPath?.replace(/file:\/\/C:\/C:\//g, 'file:///');
                        // Get retry information from test result
                        const retry = result.retry !== undefined ? result.retry : (result.retries?.length ?? 0);
                        failures.push({
                            testName: spec.title,
                            error,
                            stack,
                            screenshotPath: correctedScreenshotPath,
                            tracePath,
                            retry
                        });
                    }
                }
            }
        }
    }
    return failures;
}
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
// ---------- Rule-based fallback ----------
/**
 * Analyze common E2E/test runner failures from raw logs.
 * This version remains API-compatible with your original function,
 * but adds more patterns, better explanations, and actionable steps.
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
        // Visual/Layout Issues
        {
            id: 'visual-layout',
            pattern: /element.*not.*visible|element.*hidden|element.*covered|element.*overlapped|layout.*changed/i,
            priority: 85,
            reason: () => 'Visual or layout-related issue detected.',
            resolution: () => bullets([
                'Check if element is visible in viewport (scrollIntoView if needed)',
                'Verify element is not covered by overlays/modals/popups',
                'Ensure responsive layout is stable before interaction',
                'Consider adding wait for animation/transition completion',
            ]),
            confidence: 0.85,
        },
        // State Management Issues
        {
            id: 'state-management',
            pattern: /state.*not.*updated|previous.*state|stale.*state|loading.*state/i,
            priority: 88,
            reason: () => 'State management or data synchronization issue detected.',
            resolution: () => bullets([
                'Add explicit waits for state changes',
                'Verify data loading and state updates complete before assertions',
                'Check for race conditions in async operations',
                'Consider adding state readiness checks',
            ]),
            confidence: 0.85,
        },
        // iFrame/Shadow DOM Issues
        {
            id: 'iframe-shadow-dom',
            pattern: /frame.*not.*found|shadow.*root|cannot.*access.*frame|cross-origin.*frame/i,
            priority: 87,
            reason: () => 'iFrame or Shadow DOM access issue detected.',
            resolution: () => bullets([
                'Use frame.locator() for elements inside iframes',
                'Add proper frame navigation and waiting',
                'Handle Shadow DOM with pierce operators',
                'Check cross-origin frame permissions',
            ]),
            confidence: 0.85,
        },
        // Dynamic Content Issues
        {
            id: 'dynamic-content',
            pattern: /content.*changed|dynamic.*update|mutation.*observer|element.*detached/i,
            priority: 86,
            reason: () => 'Dynamic content update or DOM mutation issue detected.',
            resolution: () => bullets([
                'Add waits for content stability',
                'Use mutation observers or retry mechanisms',
                'Handle element re-attachment scenarios',
                'Consider implementing content load checks',
            ]),
            confidence: 0.85,
        },
        // Performance Issues
        {
            id: 'performance',
            pattern: /slow.*response|performance.*degraded|high.*cpu|high.*memory/i,
            priority: 84,
            reason: () => 'Performance-related issue detected.',
            resolution: () => bullets([
                'Profile test execution for bottlenecks',
                'Optimize resource usage and parallel execution',
                'Consider implementing performance budgets',
                'Monitor system resources during test runs',
            ]),
            confidence: 0.8,
        },
        // Timeout
        {
            id: "timeout",
            pattern: /timeout|timed out|exceeded.*ms/i,
            priority: 90,
            reason: () => "Operation timed out.",
            resolution: () => bullets([
                "Verify the awaited condition/locator is correct.",
                "Ensure the app reaches the expected state; avoid racing assertions.",
                "Increase the timeout after validating the cause.",
            ]),
            confidence: 0.85,
        },
        // Assertion mismatch (Expected vs Received)
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
            resolution: (t) => bullets([
                "Check if the expected value in the test matches the application output.",
                "If the app title/content changed intentionally, update the test expectation.",
                "If the mismatch is timing-related, add appropriate waits before the assertion.",
                "For partial checks, use regex or substring instead of strict match.",
            ]),
            confidence: 0.9,
        },
        // Locator Issues
        {
            id: "locator-issues",
            pattern: /locator|selector|strict mode violation|querySelector.*returned null/i,
            priority: 80,
            reason: () => "Locator-related issue detected.",
            resolution: () => bullets([
                "Narrow the locator with a role, name, or additional filter.",
                "Use robust selectors (role/testid) instead of brittle CSS/XPath.",
                "Ensure the locator targets a stable, unique element.",
            ]),
            confidence: 0.8,
        },
        // Network Issues
        {
            id: "network-errors",
            pattern: /network|connection|DNS resolution failed|net::ERR_/i,
            priority: 92,
            reason: () => "Network-related issue detected.",
            resolution: () => bullets([
                "Verify the base URL and server availability.",
                "Check proxies/VPN/firewall rules and DNS resolution.",
                "Mock or stub external dependencies where possible.",
            ]),
            confidence: 0.85,
        },
        // Memory Issues
        {
            id: "memory-limit-exceeded",
            pattern: /memory usage exceeds limit|heap out of memory/i,
            priority: 88,
            reason: () => "Memory limit exceeded during test execution.",
            resolution: () => bullets([
                "Increase memory allocation for the test runner.",
                "Optimize memory usage by reducing large in-memory artifacts.",
                "Close unused pages or contexts to free up memory.",
            ]),
            confidence: 0.8,
        },
        // Browser-specific Issues
        {
            id: "browser-specific-issue",
            pattern: /browser compatibility|specific browser quirks/i,
            priority: 70,
            reason: () => "Browser-specific issue detected.",
            resolution: () => bullets([
                "Verify browser compatibility for the application.",
                "Check for browser-specific quirks and apply necessary fixes.",
                "Use polyfills or feature detection for unsupported features.",
            ]),
            confidence: 0.75,
        },
    ];
    // Evaluate rules and pick the best match
    const matches = RULES
        .map((rule) => {
        const m = text.match(rule.pattern);
        return m
            ? {
                rule,
                match: m,
                score: rule.priority * 100 + Math.round(rule.confidence * 100),
            }
            : null;
    })
        .filter(Boolean);
    if (matches.length > 0) {
        matches.sort((a, b) => b.score - a.score);
        const top = matches[0];
        return {
            reason: top.rule.reason(text, ctx, top.match),
            resolution: top.rule.resolution(text, ctx, top.match),
            provider: "Rule-based",
            category: top.rule.id,
            prevention: "Implement proper error handling and validation."
        };
    }
    // Default fallback
    return {
        reason: "Unknown failure.",
        resolution: bullets([
            "Review the logs and stack trace for the first meaningful error.",
            "Check for network issues, locator stability, and async waits.",
            "Enable tracing/screenshot/video for more context (e.g., Playwright trace viewer).",
        ]) + "\n",
        provider: "Rule-based",
        category: "other",
        prevention: "Implement proper logging and monitoring."
    };
    // ---- Helpers ----
    function normalize(s) {
        return (s || "")
            .replace(/\u001b\[[0-9;]*m/g, "") // strip ANSI
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
            /selector:? "?([^"\n]+)"?/i,
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
    // Enhanced context extraction helpers
    function extractTestContext(t) {
        return {
            stack: extractStackTrace(t),
            error: extractErrorCode(t),
            browser: extractBrowser(t),
            device: extractDevice(t),
            viewport: extractViewport(t),
            network: extractNetworkInfo(t),
            performance: extractPerformanceInfo(t)
        };
    }
    function extractBrowser(t) {
        const m = t.match(/\b(chromium|firefox|webkit)\b/i);
        return m ? m[1].toLowerCase() : undefined;
    }
    function extractDevice(t) {
        const m = t.match(/device:\s*['"](\w+)['"]|iPhone|iPad|Pixel|Galaxy/i);
        return m ? m[1] || m[0] : undefined;
    }
    function extractViewport(t) {
        const m = t.match(/viewport:\s*(\d+)\s*x\s*(\d+)/i);
        return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
    }
    function extractNetworkInfo(t) {
        return {
            status: extractStatus(t),
            method: (t.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/) || [])[1],
            contentType: (t.match(/Content-Type:\s*([^\s;]+)/) || [])[1],
            responseTime: Number((t.match(/response\s+time:\s*(\d+)ms/) || [])[1])
        };
    }
    function extractPerformanceInfo(t) {
        return {
            loadTime: Number((t.match(/load\s+time:\s*(\d+)ms/) || [])[1]),
            cpuUsage: Number((t.match(/cpu\s+usage:\s*(\d+)%/) || [])[1]),
            memoryUsage: Number((t.match(/memory\s+usage:\s*(\d+)MB/) || [])[1])
        };
    }
    function extractStackTrace(t) {
        const m = t.match(/\b(at\s+.*\s+\(.*\))\b/i);
        return m ? m[1] : undefined;
    }
    function extractErrorCode(t) {
        const m = t.match(/\bError\s+Code:\s+(\d+)\b/i);
        return m ? m[1] : undefined;
    }
}
async function analyzeFailureAI(logs) {
    const aiStatus = {
        openai: {
            available: false,
            error: null
        },
        together: {
            available: false,
            error: null
        }
    };
    const openaiKey = process.env.OPENAI_API_KEY;
    const togetherKey = process.env.TOGETHER_API_KEY;
    // Check API key availability
    if (!openaiKey) {
        aiStatus.openai.error = "API key not configured";
    }
    if (!togetherKey) {
        aiStatus.together.error = "API key not configured";
    }
    const prompt = `Analyze the following Playwright test failure logs and stack trace.
Return ONLY in this format:
Reason: <10 word explanation>
Resolution: <15 word fix>

Logs:
${logs}`;
    let aiText = "";
    let provider = "Fallback";
    async function tryAIAnalysis(apiCall, apiName) {
        try {
            console.log(`Using ${apiName} for analysis...`);
            const result = await apiCall();
            if (!result) {
                throw new Error(`${apiName} returned empty response`);
            }
            if (apiName === "OpenAI") {
                aiStatus.openai.available = true;
            }
            else if (apiName === "TogetherAI") {
                aiStatus.together.available = true;
            }
            return result;
        }
        catch (err) {
            console.error(`${apiName} analysis failed:`, err.message);
            const status = apiName === "OpenAI" ? aiStatus.openai : aiStatus.together;
            if (err.response?.status === 429 || err.response?.status === 402) {
                status.error = "API quota exhausted or payment required";
                console.warn(`${apiName} ${status.error}. Trying next AI provider...`);
            }
            else if (err.response?.status === 401) {
                status.error = "API key is invalid";
                console.error(`${apiName} ${status.error}`);
            }
            else if (err.response?.status === 500) {
                status.error = "Server error";
                console.error(`${apiName} ${status.error}:`, err.response.data);
            }
            else {
                status.error = err.message;
            }
            return ""; // Return empty string to ensure fallback
        }
    }
    function extractStackTrace(t) {
        const m = t.match(/\b(at\s+.*\s+\(.*\))\b/i);
        return m ? m[1] : undefined;
    }
    function extractErrorCode(t) {
        const m = t.match(/\bError\s+Code:\s+(\d+)\b/i);
        return m ? m[1] : undefined;
    }
    function extractStatus(t) {
        const m = t.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2})\b/);
        return m ? Number(m[1]) : undefined;
    }
    // Extract rich context for better AI analysis
    const context = {
        stack: extractStackTrace(logs),
        error: extractErrorCode(logs),
        browser: (logs.match(/\b(chromium|firefox|webkit)\b/i) || [])[1]?.toLowerCase(),
        device: (logs.match(/device:\s*['"](\w+)['"]|iPhone|iPad|Pixel|Galaxy/i) || [])[1],
        viewport: (() => {
            const m = logs.match(/viewport:\s*(\d+)\s*x\s*(\d+)/i);
            return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
        })(),
        network: {
            status: extractStatus(logs),
            method: (logs.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/) || [])[1],
            contentType: (logs.match(/Content-Type:\s*([^\s;]+)/) || [])[1],
            responseTime: Number((logs.match(/response\s+time:\s*(\d+)ms/) || [])[1])
        },
        performance: {
            loadTime: Number((logs.match(/load\s+time:\s*(\d+)ms/) || [])[1]),
            cpuUsage: Number((logs.match(/cpu\s+usage:\s*(\d+)%/) || [])[1]),
            memoryUsage: Number((logs.match(/memory\s+usage:\s*(\d+)MB/) || [])[1])
        }
    };
    try {
        console.log("Starting AI analysis...");
        const enhancedPrompt = `Analyze the following Playwright test failure logs and context.
Return your answer in this format:
Reason: <concise explanation>
Category: <timeout|assertion|network|visual|state|performance|other>
Resolution: <specific steps to fix>
Prevention: <how to prevent this in future>

Context:
${JSON.stringify(context, null, 2)}

Logs:
${logs}`;
        // ---------- 1. Try OpenAI ----------
        if (openaiKey) {
            await rate_limiter_1.openAIRateLimiter.waitForSlot();
            aiText = await tryAIAnalysis(async () => (await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are an expert QA engineer helping debug Playwright tests." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 500,
                temperature: 0.7
            }, { headers: { Authorization: `Bearer ${openaiKey}` } })).data.choices[0].message?.content ?? "", "OpenAI");
            if (aiText && !aiText.includes("No reason returned."))
                provider = "OpenAI";
        }
        // ---------- 2. Try TogetherAI ----------
        if ((!aiText || aiText.includes("No reason returned.")) && togetherKey) {
            await rate_limiter_1.togetherAIRateLimiter.waitForSlot();
            aiText = await tryAIAnalysis(async () => (await axios_1.default.post("https://api.together.xyz/v1/chat/completions", {
                model: "togethercomputer/llama-2-70b-chat",
                messages: [
                    { role: "system", content: "You are an expert QA engineer helping debug Playwright tests." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }, { headers: { Authorization: `Bearer ${togetherKey}` } })).data.choices[0].message?.content ?? "", "TogetherAI");
            if (aiText && !aiText.includes("No reason returned."))
                provider = "TogetherAI";
        }
        console.log(`AI response received from ${provider}:`, aiText);
        const reasonMatch = aiText.match(/Reason:\s*([^\n]+)/i);
        const categoryMatch = aiText.match(/Category:\s*([^\n]+)/i);
        const resolutionMatch = aiText.match(/Resolution:\s*([^\n]+)/i);
        const preventionMatch = aiText.match(/Prevention:\s*([^\n]+)/i);
        const reason = reasonMatch ? reasonMatch[1] : "AI: No reason returned.";
        const resolution = resolutionMatch ? resolutionMatch[1] : "AI: No resolution returned.";
        const category = categoryMatch ? categoryMatch[1].trim() : "other";
        const prevention = preventionMatch ? preventionMatch[1].trim() : "";
        if (reason.includes("No reason returned.")) {
            console.warn("AI analysis returned no reason. Falling back to rule-based analysis.");
            const rb = analyzeFailure(logs);
            provider = "Rule-based";
            return {
                ...rb,
                provider,
                category: "other",
                prevention: "",
                context
            };
        }
        return {
            reason,
            resolution,
            provider,
            category,
            prevention,
            context,
            aiStatus
        };
    }
    catch (err) {
        console.error("AI analysis failed. Falling back to rule-based analysis.", err);
        const rb = analyzeFailure(logs);
        return { ...rb, provider: "Rule-based", aiStatus };
    }
}
