import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import "dotenv/config";
import { openAIRateLimiter, togetherAIRateLimiter } from "./utils/rate-limiter";
import { TestContext } from "./reporting/types";

export type FailureArtifact = {
  testName: string;
  error: string;
  stack: string;
  screenshotPath?: string;
  tracePath?: string;
  retry?: number;
};

/**
 * Parse Playwright JSON results to extract failed test artifacts.
 */
export function parsePlaywrightResults(resultsPath: string): FailureArtifact[] {
  const raw = fs.readFileSync(resultsPath, "utf-8");
  const data = JSON.parse(raw);
  const failures: FailureArtifact[] = [];

  for (const suite of data.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status === "failed") {
            const errorObj =
              result.error || (result.errors && result.errors[0]) || {};
            const error = errorObj.message || "Unknown error";
            const stack = errorObj.stack || "";

            let screenshotPath, tracePath;
            if (result.attachments) {
              for (const att of result.attachments) {
                if (att.contentType === "image/png") screenshotPath = att.path;
                if (att.contentType === "application/zip") tracePath = att.path;
              }
            }

            // Correct screenshot path if malformed
            const correctedScreenshotPath = screenshotPath?.replace(
              /file:\/\/C:\/C:\//g,
              "file:///"
            );

            // Extract retry info
            const retry =
              result.retry !== undefined
                ? result.retry
                : result.retries?.length ?? 0;

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
function findArtifactPath(test: any, ext: string): string | undefined {
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

// ---------- Rule-based Analyzer ----------
export interface AnalysisResult {
  reason: string;
  resolution: string;
  provider: string;
  category?: string;
  prevention?: string;
  context?: TestContext;
  confidence?: number;
  aiStatus?: {
    openai: { available: boolean; error: string | null };
    together: { available: boolean; error: string | null };
  };
}

/**
 * Rule-based fallback analyzer for Playwright failures.
 */
export function analyzeFailure(logs: string): AnalysisResult {
  const text = normalize(logs);
  const ctx = {
    selector: extractSelector(text),
    timeoutMs: extractTimeout(text),
    statusCode: extractStatus(text),
    url: extractUrl(text),
  };

  type Rule = {
    id: string;
    pattern: RegExp;
    priority: number;
    reason: (t: string, c: typeof ctx, m: RegExpMatchArray | null) => string;
    resolution: (t: string, c: typeof ctx, m: RegExpMatchArray | null) => string;
    confidence: number;
  };

  const RULES: Rule[] = [
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
      resolution: () =>
        bullets([
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
      resolution: () =>
        bullets([
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
      resolution: () =>
        bullets([
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
      resolution: () =>
        bullets([
          "Use stable locators (role/testid).",
          "Narrow locator with role, name, or filter.",
          "Ensure locator targets unique element.",
        ]),
      confidence: 0.8,
    },
    // Visual/layout
    {
      id: "visual-layout",
      pattern:
        /element.*not.*visible|element.*hidden|covered|overlapped|layout.*changed/i,
      priority: 85,
      reason: () => "Visual or layout-related issue detected.",
      resolution: () =>
        bullets([
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
  }).filter(Boolean) as { rule: Rule; match: RegExpMatchArray; score: number }[];

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
  function normalize(s: string): string {
    return (s || "")
      .replace(/\u001b\[[0-9;]*m/g, "")
      .replace(/\r/g, "")
      .replace(/\t/g, "  ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }
  function bullets(lines: string[]): string {
    return lines.map((l) => `• ${l}`).join("\n");
  }
  function extractSelector(t: string): string | undefined {
    const patterns = [
      /locator\((?:'|")([^"'`]+)(?:'|")\)/i,
      /waiting for selector "?([^"\n]+)"?/i,
      /getBy(Role|TestId|Text)\((?:'|")([^"'`]+)(?:'|")\)/i,
      /querySelector\((?:'|")([^"'`]+)(?:'|")\)/i,
    ];
    for (const p of patterns) {
      const m = t.match(p);
      if (m) return m[2] ?? m[1];
    }
    return undefined;
  }
  function extractTimeout(t: string): number | undefined {
    const m = t.match(/(?:timeout|Exceeded timeout of)\s*(\d{2,})\s*ms/i);
    return m ? Number(m[1]) : undefined;
  }
  function extractStatus(t: string): number | undefined {
    const m = t.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2})\b/);
    return m ? Number(m[1]) : undefined;
  }
  function extractUrl(t: string): string | undefined {
    const m =
      t.match(/(https?:\/\/[^\s'"]+)/i) ||
      t.match(/Navigating to (https?:\/\/[^\s'"]+)/i);
    return m ? m[1] : undefined;
  }
  function extractBetween(t: string, regex: RegExp): string | undefined {
    const m = t.match(regex);
    return m ? m[1].trim() : undefined;
  }
}

// ---------- AI-powered Analyzer with Fallback ----------
export async function analyzeFailureAI(
  logs: string
): Promise<AnalysisResult> {
  const aiStatus: AnalysisResult["aiStatus"] = {
    openai: { available: false, error: null },
    together: { available: false, error: null },
  };

  const prompt = `Analyze the following Playwright test failure logs and stack trace.
Return ONLY in this format:
Reason: <10 word explanation>
Resolution: <15 word fix>
Confidence: <confidence score>

Logs:
${logs}`;

  let aiText = "";
  let provider = "Fallback";
  let confidence = 0;

  async function tryAIAnalysis(
    apiCall: () => Promise<string>,
    apiName: string
  ): Promise<string> {
    try {
      const result = await apiCall();
      if (!result) throw new Error(`${apiName} returned empty response`);
      if (!aiStatus) {
        throw new Error("aiStatus is undefined");
      }
      if (apiName === "OpenAI") aiStatus.openai.available = true;
      if (apiName === "TogetherAI") aiStatus.together.available = true;
      return result;
    } catch (err: any) {
      if (!aiStatus) {
        throw new Error("aiStatus is undefined");
      }
      const status = apiName === "OpenAI" ? aiStatus.openai : aiStatus.together;
      status.error =
        err.response?.status === 429 || err.response?.status === 402
          ? "API quota exhausted or payment required"
          : err.response?.status === 401
          ? "Invalid API key"
          : err.response?.status === 500
          ? "Server error"
          : err.message;
      return "";
    }
  }

  try {
    // 1. Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      await openAIRateLimiter.waitForSlot();
      aiText = await tryAIAnalysis(
        async () =>
          (
            await axios.post(
              "https://api.openai.com/v1/chat/completions",
              {
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are an expert QA engineer helping debug Playwright tests.",
                  },
                  { role: "user", content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
              },
              { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
            )
          ).data.choices[0].message?.content ?? "",
        "OpenAI"
      );
      if (aiText) provider = "OpenAI";
    }

    // 2. Try TogetherAI if OpenAI failed
    if (!aiText && process.env.TOGETHER_API_KEY) {
      await togetherAIRateLimiter.waitForSlot();
      aiText = await tryAIAnalysis(
        async () =>
          (
            await axios.post(
              "https://api.together.xyz/v1/chat/completions",
              {
                model: "togethercomputer/llama-2-70b-chat",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are an expert QA engineer helping debug Playwright tests.",
                  },
                  { role: "user", content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
              },
              { headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}` } }
            )
          ).data.choices[0].message?.content ?? "",
        "TogetherAI"
      );
      if (aiText) provider = "TogetherAI";
    }

    // Parse AI response
    const reasonMatch = aiText.match(/Reason:\s*([^\n]+)/i);
    const resolutionMatch = aiText.match(/Resolution:\s*([^\n]+)/i);
    const confidenceMatch = aiText.match(/Confidence:\s*(\d+(\.\d+)?)/i);

    const reason = reasonMatch ? reasonMatch[1] : "AI returned no reason.";
    const resolution = resolutionMatch
      ? resolutionMatch[1]
      : "AI returned no resolution.";
    confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0;

    if (!reasonMatch) {
      const rb = analyzeFailure(logs);
      return { ...rb, provider: "Rule-based", aiStatus };
    }

    return {
      reason,
      resolution,
      provider,
      confidence,
      context: undefined, // could extend with extractTestContext(logs) later
      aiStatus,
    };
  } catch {
    const rb = analyzeFailure(logs);
    return { ...rb, provider: "Rule-based", aiStatus };
  }
}
