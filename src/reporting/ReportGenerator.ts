import * as path from 'path';
import type { FailureArtifact } from '../ai-failure-analyzer';
import { StatsTracker } from './StatsTracker';
import { ProviderManager } from './ProviderManager';
import { HTMLRenderer } from './HTMLRenderer';
import { FileManager } from './FileManager';
import { AnalysisResult, HistoryEntry } from './types';
import { clusterFailures } from '../failure-clustering';

export class ReportGenerator {
  private readonly fileManager: FileManager;

  constructor(
    private providerManager: ProviderManager,
    private statsTracker: StatsTracker,
    private htmlRenderer: HTMLRenderer,
    options: { resultsPath?: string; outputHtml?: string; historyPath?: string } = {}
  ) {
    const defaultResultsPath = path.resolve(process.cwd(), 'artifacts/results.json');
    const defaultOutputHtml = path.resolve(
      process.cwd(),
      process.env.PLAYWRIGHT_AI_REPORT_PATH || 'artifacts/html-report/ai-analysis-report.html'
    );
    const defaultHistoryPath = path.resolve(process.cwd(), 'artifacts/analytics-history.json');

    this.fileManager = new FileManager(
      options.resultsPath || defaultResultsPath,
      options.outputHtml || defaultOutputHtml,
      options.historyPath || defaultHistoryPath
    );
  }

  private async analyzeFailure(failure: FailureArtifact): Promise<AnalysisResult> {
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
    } catch (error) {
      return {
        reason: 'Analysis failed',
        resolution: 'Check system logs for details',
        provider: 'Error',
        category: 'System Error'
      };
    }
  }

  private updateStats(result: AnalysisResult): void {
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

  public async generateReport(): Promise<void> {
    try {
      this.fileManager.validateResultsFile();
      const allResults = this.fileManager.readResultsFile<FailureArtifact[]>();

      // Only analyze failed results
      const failures = allResults.filter((r) => (r as any).status === 'failed' || (r as any).error) as FailureArtifact[];
      const clusters = clusterFailures(failures);

      const uniqueFailures = new Set(failures.filter((f) => f.error).map((f) => f.testName));
      const uniquePasses = new Set(allResults.filter((f) => !f.error).map((f) => f.testName));
      const failedCount = uniqueFailures.size;
      const passedCount = uniquePasses.size;

      const perFailureResults: { failure: FailureArtifact; analysis: AnalysisResult }[] = [];

      // Analyze failures and collect per-failure results
      for (const failure of failures) {
        const result = await this.analyzeFailure(failure);
        perFailureResults.push({ failure, analysis: result });

        const aiStatus = (result as any).aiStatus;
        if (aiStatus) {
          if (aiStatus.openai) {
            this.statsTracker.incrementAttempts('openai');
            if (aiStatus.openai.available) {
              this.statsTracker.incrementSuccesses('openai');
              this.statsTracker.setSuccess('openai');
            } else {
              this.statsTracker.setError('openai', aiStatus.openai.error || 'OpenAI unavailable');
            }
          }
          if (aiStatus.together) {
            this.statsTracker.incrementAttempts('together');
            if (aiStatus.together.available) {
              this.statsTracker.incrementSuccesses('together');
              this.statsTracker.setSuccess('together');
            } else {
              this.statsTracker.setError('together', aiStatus.together.error || 'TogetherAI unavailable');
            }
          }
        } else {
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

      const history = this.fileManager.loadHistory<HistoryEntry>();
      history.push({ date: new Date().toISOString(), total: failures.length, failed: failedCount, passed: passedCount });
      this.fileManager.saveHistory(history);

      const html = this.htmlRenderer.generateFullReport(this.statsTracker.getStats(), clusters, history, failures.length, failedCount, passedCount, perFailureResults);
      this.fileManager.writeReport(html);

      console.log('✅ AI Failure Analysis Report generated successfully');
    } catch (err) {
      this.fileManager.writeErrorReport(err);
      console.error('\n❌ Error in report generator:');
      if (err instanceof Error) {
        console.error('Message:', err.message);
        if (err.stack) console.error('\nStack trace:', err.stack);
      } else {
        console.error(err);
      }
      throw err;
    }
  }
}