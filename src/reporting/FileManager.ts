import * as fs from 'fs';
import * as path from 'path';

export class FileManager {
  constructor(
    private resultsPath: string,
    private outputHtml: string,
    private historyPath: string
  ) {}

  public validateResultsFile(): void {
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
    } catch (e) {
      console.warn('Results file contains invalid JSON; proceeding with empty results');
      return;
    }
  }

  public readResultsFile<T>(): T {
    if (!fs.existsSync(this.resultsPath)) {
      console.debug(`[DEBUG] Results file not found: ${this.resultsPath}`);
      return ([]) as unknown as T;
    }

    try {
      console.debug(`[DEBUG] Reading results file: ${this.resultsPath}`);
      const content = fs.readFileSync(this.resultsPath, 'utf-8');
      const parsed = content.trim() ? JSON.parse(content) : [];
      console.debug(`[DEBUG] Results file parsed successfully. Format: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
      
      // If Playwright JSON reporter produced an object with `suites`, map it to a flat failures array
      if (parsed && !Array.isArray(parsed) && parsed.suites && Array.isArray(parsed.suites)) {
        console.debug(`[DEBUG] Detected Playwright JSON reporter format with 'suites' structure`);
        const failures: any[] = [];
        for (const suite of parsed.suites) {
          for (const spec of suite.specs || []) {
            for (const testRecord of spec.tests || []) {
              for (const result of testRecord.results || []) {
                const testName = spec.title || testRecord.title || testRecord.id || null;
                console.debug(`[DEBUG] Extracting test: ${testName}, Status: ${result.status}`);
                // Extract screenshot and trace file paths from attachments
                let screenshotPath = null;
                let tracePath = null;
                
                if (result.attachments && result.attachments.length > 0) {
                  for (const attachment of result.attachments) {
                    // Extract screenshot
                    if (attachment.contentType === 'image/png' && attachment.path) {
                      screenshotPath = attachment.path;
                      console.debug(`[DEBUG] Found screenshot: ${screenshotPath}`);
                    }
                    
                    // Extract trace file with more comprehensive matching
                    if (attachment.path && (
                        attachment.contentType === 'application/zip' || 
                        attachment.name === 'trace' || 
                        attachment.path.includes('trace.zip')
                    )) {
                      tracePath = attachment.path;
                      console.debug(`[DEBUG] Found trace file: ${tracePath}`);
                    }
                  }
                }

                failures.push({
                  testFile: spec.file || suite.file || null,
                  testName: testName,
                  status: result.status || null,
                  error: result.error ? (result.error.message || null) : null,
                  stack: result.error ? (result.error.stack || null) : null,
                  duration: result.duration || null,
                  startTime: result.startTime || null,
                  attachments: result.attachments || [],
                  screenshotPath: screenshotPath,
                  tracePath: tracePath,
                  project: result.projectName || result.project || null,
                });
              }
            }
          }
        }
        return failures as unknown as T;
      }

      // Normalize to an array when the results file contains an object with a `results` field
      if (parsed && !Array.isArray(parsed) && parsed.results && Array.isArray(parsed.results)) {
        console.debug(`[DEBUG] Detected results object with 'results' array`);
        const results = parsed.results;
        results.forEach((result: any, index: number) => {
          console.debug(`[DEBUG] Test #${index + 1}: ${result.testName || result.id || '[No test name]'}, Status: ${result.status || 'Unknown'}`);
        });
        return parsed.results as T;
      }
      
      // Handle direct array format
      if (Array.isArray(parsed)) {
        console.debug(`[DEBUG] Detected direct array format with ${parsed.length} test results`);
        parsed.forEach((result: any, index: number) => {
          console.debug(`[DEBUG] Test #${index + 1}: ${result.testName || result.id || '[No test name]'}, Status: ${result.status || 'Unknown'}`);
        });
      } else {
        console.debug(`[DEBUG] Unknown results format, defaulting to empty array`);
      }
      
      return (Array.isArray(parsed) ? parsed : []) as unknown as T;
    } catch (e) {
      console.warn('Failed to read results file; proceeding with empty results', e);
      return ([]) as unknown as T;
    }
  }

  public loadHistory<T>(): T[] {
    if (!fs.existsSync(this.historyPath)) {
      return [];
    }

    try {
      return JSON.parse(fs.readFileSync(this.historyPath, "utf-8"));
    } catch {
      return [];
    }
  }

  public saveHistory<T>(history: T[]): void {
    const outputDir = path.dirname(this.historyPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), "utf-8");
  }

  public writeReport(html: string): void {
    const outputDir = path.dirname(this.outputHtml);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(this.outputHtml, html, "utf-8");
  }

  public writeErrorReport(err: unknown): void {
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
    } catch (writeErr) {
      console.error("Failed to write error log:", writeErr);
    }
  }
}