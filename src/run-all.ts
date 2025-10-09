import { exec } from 'child_process';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestRunOptions {
  tags?: string[];
  grep?: string;
  workers?: number;
  retries?: number;
  headed?: boolean;
}

interface TestRunStats {
  duration: number;
  total: number;
  passed: number;
  failed: number;
  retried: number;
  skipped: number;
}

interface TestResult {
  testFile: string;
  testName: string;
  error?: string;
  errorMessage?: string;
  stack?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  failureDetails?: any;
}

interface TestResultsData {
  stats: TestRunStats;
  failures: number;
  tests: TestResult[];
  metadata: {
    timestamp: string;
    environment: string;
    browser: string;
    mode: string;
  };
}

// Optimized Playwright test execution
function buildPlaywrightCommand(options: TestRunOptions = {}): string {
  const parts = ['npx playwright test'];

  if (options.tags?.length) {
    parts.push(`--grep "@(${options.tags.join('|')})"`);
  }
  if (options.grep) {
    parts.push(`--grep "${options.grep}"`);
  }
  if (options.workers) {
    parts.push(`--workers ${options.workers}`);
  }
  if (options.retries !== undefined) {
    parts.push(`--retries ${options.retries}`);
  }
  if (options.headed) {
    parts.push('--headed');
  }

  return parts.join(' ');
}

function parseTestResults(output: string): TestRunStats {
  const stats: TestRunStats = {
    duration: 0,
    total: 0,
    passed: 0,
    failed: 0,
    retried: 0,
    skipped: 0
  };

  try {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('failed')) stats.failed++;
      if (line.includes('passed')) stats.passed++;
      if (line.includes('skipped')) stats.skipped++;
      if (line.includes('retried')) stats.retried++;
    }
    stats.total = stats.passed + stats.failed + stats.skipped;
  } catch (error) {
    console.warn('Could not parse test results:', error);
  }

  return stats;
}

async function runPlaywrightTests(options: TestRunOptions = {}): Promise<TestRunStats> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const command = buildPlaywrightCommand(options);
    console.log(`\nExecuting command: ${command}\n`);

    let output = '';
    const proc = exec(command, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      output += stdout + stderr;
      const stats = parseTestResults(output);
      stats.duration = (performance.now() - startTime) / 1000;

      if (error && !stderr.includes('Test failed')) {
        console.error('Playwright test execution error:', stderr);
        reject(error);
      } else {
        resolve(stats);
      }
    });

    proc.stdout?.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });
    proc.stderr?.on('data', (data) => {
      output += data;
      process.stderr.write(data);
    });
  });
}

function runReportGenerator(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Running report generator...');

    const reportProcess = exec('npx ts-node src/report-generator.ts --ai-analysis', {
      env: process.env,
      maxBuffer: 20 * 1024 * 1024
    });

    let output = '';
    let errorOutput = '';

    reportProcess.stdout?.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });

    reportProcess.stderr?.on('data', (data) => {
      errorOutput += data;
      process.stderr.write(data);
    });

    reportProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Report generation failed with code:', code);
        reject(new Error(errorOutput));
      }
    });
  });
}

// Environment validation functions
function validateAIConfig(): boolean {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasTogether = !!process.env.TOGETHER_API_KEY;

  if (!hasOpenAI) {
    console.warn('⚠️ OpenAI API key not found. AI analysis will fall back to Together AI.');
  }
  if (!hasTogether) {
    console.warn('⚠️ Together AI API key not found. AI analysis will fall back to rule-based analysis.');
  }

  return hasOpenAI || hasTogether;
}

async function validateTestEnvironment(): Promise<boolean> {
  try {
    const testsDir = path.join(process.cwd(), 'tests');
    if (!fs.existsSync(testsDir)) {
      console.error('\u2717 Tests directory not found:', testsDir);
      return false;
    }

    const specFiles = fs.readdirSync(testsDir).filter((f: string) => f.endsWith('.spec.ts'));
    if (specFiles.length === 0) {
      console.error('\u2717 No .spec.ts files found in tests directory');
      return false;
    }

    console.log('\u2713 Found', specFiles.length, 'test files:');
    specFiles.forEach((file: string) => console.log(` - ${file}`));

    return true;
  } catch (error) {
    console.error('\u2717 Error validating test environment:', error);
    return false;
  }
}

function createTestResults(stats: TestRunStats): TestResultsData {
  return {
    stats,
    failures: stats.failed,
    tests: [], // Will be populated by actual test results parsing
    metadata: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      browser: 'chromium',
      mode: 'automated'
    }
  };
}

function saveTestResults(results: TestResultsData): void {
  try {
    console.log('\nSaving test results...');

    // Clean up existing results
    const htmlReportDir = 'artifacts/html-report';
    const resultsFile = 'artifacts/results.json';

    if (fs.existsSync(htmlReportDir)) {
      fs.rmSync(htmlReportDir, { recursive: true, force: true });
    }
    if (fs.existsSync(resultsFile)) {
      fs.rmSync(resultsFile, { force: true });
    }

    if (!fs.existsSync('artifacts')) {
      fs.mkdirSync('artifacts');
    }

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log('✓ Test results saved successfully');
  } catch (error) {
    console.error('✗ Error saving test results:', error);
  }
}

function printConfiguration(options: TestRunOptions): void {
  console.log('Configuration:');
  console.log(` - Workers: ${options.workers || 'default'}`);
  console.log(` - Retries: ${options.retries !== undefined ? options.retries : 'from config'}`);
  console.log(` - Browser: ${options.headed ? 'headed' : 'headless'}`);
  if (options.tags?.length) console.log(` - Tags: ${options.tags.join(', ')}`);
  if (options.grep) console.log(` - Filter: ${options.grep}`);
}

function printTestSummary(stats: TestRunStats): void {
  console.log('\n=== Test Execution Summary ===');
  console.log(`Duration: ${stats.duration.toFixed(2)}s`);
  console.log(`Total Tests: ${stats.total}`);
  console.log(`✅ Passed: ${stats.passed}`);
  console.log(`❌ Failed: ${stats.failed}`);
  if (stats.retried > 0) console.log(`⚠️ Retried: ${stats.retried}`);
  if (stats.skipped > 0) console.log(`⏭️ Skipped: ${stats.skipped}`);

  if (stats.failed > 0) {
    console.log('\n❌ Some tests failed - check the reports for details:');
  } else {
    console.log('\n✅ All tests completed successfully!');
  }

  console.log('\nReports:');
  console.log(' - HTML Report: artifacts/html-report/index.html');
  console.log(' - JSON Results: artifacts/results.json');
}

async function runAllTests(options: TestRunOptions = {}): Promise<TestRunStats> {
  console.log(`=== Starting Test Execution ===`);

  // Validate environment
  console.log('\nValidating environment...');
  if (!await validateTestEnvironment()) {
    throw new Error('Test environment validation failed');
  }

  if (!validateAIConfig()) {
    console.warn('\u2717 AI configuration incomplete - analysis may be limited');
  }

  console.log('\u2713 Environment validation passed\n');

  printConfiguration(options);

  let testStats: TestRunStats;
  try {
    console.log('\nExecuting Playwright tests...');
    console.log('Test Directory: ./tests');
    console.log('Test Pattern: *.spec.ts');

    testStats = await runPlaywrightTests(options);
    console.log('✓ Playwright tests execution completed');
  } catch (error) {
    console.error('✗ Playwright tests failed');
    throw error;
  }

  // Save test results
  const testResults = createTestResults(testStats);
  saveTestResults(testResults);

  printTestSummary(testStats);

  return testStats;
}

// Command line argument parsing
function parseCommandLineArgs(): { options: TestRunOptions; shouldGenerateReport: boolean } {
  const args = process.argv.slice(2);
  const options: TestRunOptions = {
    workers: args.includes('--parallel') ? 4 : undefined,
    headed: args.includes('--headed'),
    tags: args.includes('--tags') ? args[args.indexOf('--tags') + 1]?.split(',') : undefined,
    grep: args.includes('--grep') ? args[args.indexOf('--grep') + 1] : undefined,
    retries: args.includes('--retries') ? parseInt(args[args.indexOf('--retries') + 1] || '0') : undefined
  };

  const shouldGenerateReport = args.includes('--report');

  return { options, shouldGenerateReport };
}

async function generateAndOpenReport(): Promise<void> {
  console.log('\nStarting AI Analysis Report generation...');

  try {
    await runReportGenerator();
    console.log('✓ AI Analysis Report generated successfully');

    const reportPath = 'artifacts/html-report/ai-analysis-report.html';
    if (fs.existsSync(reportPath)) {
      console.log('\nOpening report in browser...');
      const openCommand = process.platform === 'win32' ? 'start' : 'open';
      exec(`${openCommand} "${reportPath}"`);
    } else {
      throw new Error('Report file not found at expected location');
    }
  } catch (error) {
    const reportError = error instanceof Error ? error : new Error(String(error));
    console.error('✗ Error generating AI report:');
    console.error('  Details:', reportError.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify test results exist in artifacts/results.json');
    console.log('2. Check report-generator.ts for errors');
    console.log('3. Try running npm run prod:report separately');
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    // Ensure required directories exist
    const dirs = ['artifacts', 'artifacts/html-report'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const { options, shouldGenerateReport } = parseCommandLineArgs();

    // Run tests
    const stats = await runAllTests(options);

    // Generate report if requested
    if (shouldGenerateReport) {
      await generateAndOpenReport();
    }

    // Exit with appropriate code
    if (stats.failed > 0 && !shouldGenerateReport) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Export functions for external use
export { runAllTests, TestRunOptions, TestRunStats };

// Run main if this file is executed directly
if (require.main === module) {
  main();
}