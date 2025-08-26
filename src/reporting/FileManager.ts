import * as fs from 'fs';
import * as path from 'path';

export class FileManager {
  constructor(
    private resultsPath: string,
    private outputHtml: string,
    private historyPath: string
  ) {}

  private processTestResults(testResultsDir: string): any {
    const results = {
      failed: [] as any[],
      passed: [] as any[],
      total: 0,
      failurePatterns: {} as Record<string, string[]>
    };
    
    if (fs.existsSync(testResultsDir) && fs.statSync(testResultsDir).isDirectory()) {
      // Filter out retry attempts and the last-run.json file
      const dirs = fs.readdirSync(testResultsDir)
        .filter(dir => !dir.includes('retry') && !dir.endsWith('.json'));
      console.log(`Processing ${dirs.length} test result directories...`);
      
      dirs.forEach(dir => {
        const fullPath = path.join(testResultsDir, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          const contextPath = path.join(fullPath, 'error-context.md');
          const testName = dir
            .replace(/-/g, ' ')
            .replace(/^ai analysis demo /, '')
            .replace(/^auth Tes.*authentication analysis/, '@auth Test Authentication')
            .trim();

          if (fs.existsSync(contextPath)) {
            const context = fs.readFileSync(contextPath, 'utf8');
            const screenshotPath = path.join(fullPath, 'test-failed-1.png');
            
            results.failed.push({
              testName,
              context,
              error: {
                message: this.extractErrorMessage(context),
                stack: context
              },
              screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null
            });

            // Analyze failure pattern
            const pattern = this.analyzeFailurePattern(context);
            if (pattern) {
              if (!results.failurePatterns[pattern]) {
                results.failurePatterns[pattern] = [];
              }
              results.failurePatterns[pattern].push(testName);
            }
          } else {
            results.passed.push({
              testName,
              context: 'Test passed successfully'
            });
          }
        }
      });
      results.total = results.failed.length + results.passed.length;
      console.log(`Found ${results.failed.length} failed tests and ${results.passed.length} passed tests`);

      // Save results to artifacts directory for debugging
      const artifactsPath = path.join(process.cwd(), 'artifacts');
      if (!fs.existsSync(artifactsPath)) {
        fs.mkdirSync(artifactsPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(artifactsPath, 'test-results-processed.json'),
        JSON.stringify(results, null, 2)
      );
    }
    return results;
  }

  private extractErrorMessage(context: string): string {
    const lines = context.split('\n');
    
    // First look for the Error: line
    const errorIndex = lines.findIndex(line => line.includes('Error:'));
    if (errorIndex >= 0) {
      const errorLine = lines[errorIndex].trim();
      const errorMatch = errorLine.match(/Error:\s*(.+)/);
      if (errorMatch) {
        return errorMatch[1];
      }
    }
    
    // Look for the test expectation message
    const expectIndex = lines.findIndex(line => line.includes('expect('));
    if (expectIndex >= 0) {
      const expectLine = lines[expectIndex].trim();
      return `Test expectation failed: ${expectLine}`;
    }

    return context.split('\n')[0] || 'Unknown error';
  }

  private analyzeFailurePattern(context: string): string {
    // Extract key information from context
    const isVisibilityIssue = context.includes('toBeVisible') || context.includes('visible');
    const isTimeoutIssue = context.includes('timeout') || context.includes('exceeded');
    const isElementIssue = context.includes('locator') || context.includes('element');
    const isAuthIssue = context.includes('authentication') || context.includes('login');
    const isNetworkIssue = context.includes('network') || context.includes('fetch');

    if (isTimeoutIssue && isVisibilityIssue) return 'Element Visibility Timeout';
    if (isTimeoutIssue) return 'Timeout';
    if (isVisibilityIssue || isElementIssue) return 'Element Visibility';
    if (isAuthIssue) return 'Authentication';
    if (isNetworkIssue) return 'Network';

    return 'Other';
  }

  public validateResultsFile(): void {
    if (!fs.existsSync(this.resultsPath)) {
      console.warn(`Results path not found: ${this.resultsPath}`);
      return;
    }

    const stats = fs.statSync(this.resultsPath);
    if (stats.isDirectory()) {
      // For directory-based results, we'll process them when reading
      return;
    }

    try {
      const resultsContent = fs.readFileSync(this.resultsPath, 'utf-8');
      if (!resultsContent.trim()) {
        console.warn('Results file is empty. Proceeding with empty results.');
        return;
      }
      JSON.parse(resultsContent);
    } catch (e) {
      console.error('Results file contains invalid JSON or could not be read. Proceeding with empty results.');
    }
  }

  public readResultsFile<T>(): T {
    if (!fs.existsSync(this.resultsPath)) {
      console.debug(`[DEBUG] Results path not found: ${this.resultsPath}`);
      return [] as unknown as T;
    }

    try {
      const stats = fs.statSync(this.resultsPath);
      
      if (stats.isDirectory()) {
        console.log(`📁 Processing test results from directory: ${this.resultsPath}`);
        
        // Process only non-retry test results
        const dirs = fs.readdirSync(this.resultsPath)
          .filter(dir => !dir.endsWith('.json') && !dir.includes('retry'));
        
        const results = {
          failed: [] as any[],
          passed: [] as any[],
          total: 0,
          failurePatterns: {} as Record<string, string[]>
        };

        dirs.forEach(dir => {
          const fullPath = path.join(this.resultsPath, dir);
          if (fs.statSync(fullPath).isDirectory()) {
            const contextPath = path.join(fullPath, 'error-context.md');
            const testName = dir
              .replace(/-/g, ' ')
              .replace(/^ai analysis demo /, '')
              .replace(/^auth Tes.*authentication analysis/, '@auth Test Authentication')
              .trim();

            if (fs.existsSync(contextPath)) {
              const context = fs.readFileSync(contextPath, 'utf8');
              const screenshotPath = path.join(fullPath, 'test-failed-1.png');
              
              const errorMessage = this.extractErrorMessage(context);
              const tracePath = path.join(fullPath, 'trace.zip');
              
              results.failed.push({
                testName,
                error: errorMessage,
                stack: context,
                screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : undefined,
                tracePath: fs.existsSync(tracePath) ? tracePath : undefined,
                pattern: this.analyzeFailurePattern(context)
              });
            } else {
              results.passed.push({
                testName,
                context: 'Test passed successfully'
              });
            }
          }
        });

        results.total = results.failed.length + results.passed.length;
        console.log(`Found ${results.failed.length} failed tests and ${results.passed.length} passed tests`);
        
        // Write results to file for persistence
        const outputPath = path.join(path.dirname(this.resultsPath), 'results.json');
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        
        return results as unknown as T;
      }

      console.log(`📄 Reading results from file: ${this.resultsPath}`);
      const content = fs.readFileSync(this.resultsPath, 'utf-8');
      return content.trim() ? JSON.parse(content) : [] as unknown as T;
    } catch (e: any) {
      console.error(`[ERROR] Failed to read results: ${e.message}`);
      return [] as unknown as T;
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