import * as path from 'path';
import type { FailureArtifact } from '../types/shared';
import { StatsTracker } from './StatsTracker';
import { ProviderManager } from './ProviderManager';
import { HTMLRenderer } from './HTMLRenderer';
import { FileManager } from './FileManager';
import { AnalysisResult, HistoryEntry } from './types';
import { parsePlaywrightTestResults } from '../utils/result-parser';
import { clusterFailures } from '../failure-clustering';
import { getFixedTestTitle } from '../utils/test-title-fixer';

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

    // Fix the test title
    const fixedTestName = getFixedTestTitle(failure.testName);
    failure.testName = fixedTestName;

    try {
      console.log(`🧠 Analyzing test: ${fixedTestName}`);
      return await this.providerManager.analyzeWithProviders(failure.error, failure.stack || '', fixedTestName);
    } catch (error) {
      console.error(`❌ Analysis failed for test: ${fixedTestName}`);
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
      console.log("🔍 Validating test results file...");
      this.fileManager.validateResultsFile();

      console.log("📑 Reading test results data...");
      const rawResults = this.fileManager.readResultsFile<{failed: FailureArtifact[]; passed: any[]; total: number}>();

      if (!rawResults || typeof rawResults !== 'object') {
        throw new Error('Test results file is empty or invalid');
      }

      const startTime = Date.now();

      const failures = rawResults.failed || [];
      console.log(`Found ${failures.length} failed tests in results`);
      const allResults = failures; // For now, we only have access to failures
      console.log(`[DEBUG] Found ${failures.length} failed test results`);
      console.log("=== TEST CASE NAMES (Failed Results) ===");
      failures.forEach((failure, index) => {
        console.log(`[DEBUG] Failed Test #${index + 1}: ${failure.testName || '[No test name]'}`);
        console.log(`[DEBUG] - Error: ${failure.error ? failure.error.substring(0, 100) + (failure.error.length > 100 ? '...' : '') : 'No error message'}`);
      });
      console.log("========================================");
      
      const clusters = clusterFailures(failures);
      console.log(`[DEBUG] Clustered failures into ${Object.keys(clusters).length} groups`);

      // Group failures by test name to identify unique tests vs retry attempts
      const failuresByTest = failures.reduce((acc: Record<string, FailureArtifact[]>, failure) => {
        if (!acc[failure.testName]) acc[failure.testName] = [];
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

      const perFailureResults: { failure: FailureArtifact; analysis: AnalysisResult }[] = [];

      // Analyze failures using batch processing for better performance
      if (failures.length > 0) {
        console.log(`🧠 Batch analyzing ${failures.length} test failures...`);

        // Fix test titles for all failures
        const failuresWithFixedTitles = failures.map(failure => ({
          ...failure,
          testName: getFixedTestTitle(failure.testName)
        }));

        try {
          // Use batch analysis for better performance
          const batchResults = await this.providerManager.analyzeBatchWithProviders(failuresWithFixedTitles);

          // Map results back to perFailureResults format
          perFailureResults.push(...batchResults.map((result, index) => ({
            failure: failuresWithFixedTitles[index],
            analysis: {
              reason: result.reason,
              resolution: result.resolution,
              provider: result.provider,
              category: result.category,
              prevention: result.prevention,
              confidence: result.confidence
            }
          })));

          // Update stats for batch results
          batchResults.forEach(result => {
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
              // rule-based or batch processing
              this.statsTracker.incrementAttempts('ruleBased');
              this.statsTracker.incrementSuccesses('ruleBased');
              this.statsTracker.setSuccess('ruleBased');
            }

            this.updateStats(result);
          });

        } catch (error) {
          console.error('❌ Batch analysis failed, falling back to individual analysis...');

          // Fallback to individual analysis if batch fails
          for (const failure of failuresWithFixedTitles) {
            try {
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
                this.statsTracker.incrementAttempts('ruleBased');
                this.statsTracker.incrementSuccesses('ruleBased');
                this.statsTracker.setSuccess('ruleBased');
              }

              this.updateStats(result);
            } catch (individualError) {
              console.error(`❌ Analysis failed for test: ${failure.testName}`);
              perFailureResults.push({
                failure,
                analysis: {
                  reason: 'Analysis failed',
                  resolution: 'Check system logs for details',
                  provider: 'Error',
                  category: 'System Error'
                }
              });
            }
          }
        }
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

      const html = this.htmlRenderer.generateFullReport(
        this.statsTracker.getStats(),
        clusters,
        history,
        allResults.length,  // Total tests
        failures.length,     // Total failures including retries
        passedCount,        // Passed tests
        perFailureResults
      );
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