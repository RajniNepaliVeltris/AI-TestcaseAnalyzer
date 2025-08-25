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
      console.warn(`Results file not found: ${this.resultsPath}`);
      return;
    }

    const resultsContent = fs.readFileSync(this.resultsPath, 'utf-8');
    if (!resultsContent.trim()) {
      console.warn('Results file is empty. Proceeding with empty results.');
      return;
    }

    try {
      JSON.parse(resultsContent);
    } catch (e) {
      console.error('Results file contains invalid JSON. Proceeding with empty results.');
    }
  }

  public readResultsFile<T>(): T {
    if (!fs.existsSync(this.resultsPath)) {
      console.debug(`[DEBUG] Results file not found: ${this.resultsPath}`);
      return [] as unknown as T;
    }

    try {
      const content = fs.readFileSync(this.resultsPath, 'utf-8');
      return content.trim() ? JSON.parse(content) : [] as unknown as T;
    } catch (e: any) {
      console.error(`[ERROR] Failed to read results file: ${e.message}`);
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