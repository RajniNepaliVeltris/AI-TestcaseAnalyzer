import { exec } from 'child_process';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock AI responses for demo mode
const mockAIResponses = {
  openai: {
    authFailure: "Authentication failure detected. The system attempted to log in with invalid credentials. Recommended actions: 1) Verify input validation, 2) Check credential handling, 3) Implement rate limiting.",
    timingIssue: "Timing issue detected. The system failed to handle async operations correctly. Recommended actions: 1) Increase wait time, 2) Implement retry mechanism, 3) Add proper error handling.",
    domMutation: "DOM mutation error detected. Elements were not found in expected state. Recommended actions: 1) Implement mutation observer, 2) Add dynamic element handling, 3) Use more robust selectors."
  },
  togetherai: {
    authFailure: "Authentication pattern analysis shows credential validation issues. Suggested fixes: 1) Enhanced input validation, 2) Improved error messages, 3) Security hardening.",
    timingIssue: "Async operation analysis indicates race condition. Solutions: 1) Implement proper waits, 2) Add synchronization mechanisms, 3) Enhance error recovery.",
    domMutation: "DOM structure analysis reveals unstable element states. Fixes: 1) Better element targeting, 2) Improved state management, 3) Enhanced selector strategies."
  }
};

interface TestRunOptions {
  tags?: string[];
  grep?: string;
  workers?: number;
  retries?: number;
  headed?: boolean;
  mode?: 'production' | 'demo'; // Added mode option for production/demo runs
}

interface TestRunStats {
  duration: number;
  total: number;
  passed: number;
  failed: number;
  retried: number;
  skipped: number;
}

// Optimized Playwright test execution and report generation
function buildPlaywrightCommand(options: TestRunOptions = {}): string {
  const parts = ['npx playwright test --config=playwright.config.ts'];

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
    stats.total = stats.passed + stats.failed;
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

      if (error) {
        if (stderr.includes('Test failed')) {
          resolve(stats);
        } else {
          console.error('Playwright test execution error:', stderr);
          reject(error);
        }
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

function runReportGenerator(mode: 'production' | 'demo' = 'production'): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running report generator in ${mode} mode...`);

    const env = {
      ...process.env,
      AI_ANALYSIS_MODE: mode,
      MOCK_AI_RESPONSES: mode === 'demo' ? JSON.stringify(mockAIResponses) : ''
    };

    const reportProcess = exec('npx ts-node src/report-generator.ts', {
      env,
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

// Check AI configuration
function validateAIConfig(mode: 'production' | 'demo'): boolean {
  if (mode === 'production') {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not found. AI analysis will fall back to Together AI.');
    }
    if (!process.env.TOGETHER_API_KEY) {
      console.warn('⚠️ Together AI API key not found. AI analysis will fall back to rule-based analysis.');
    }
    return true;
  }
  return true; // Demo mode doesn't require API keys
}

async function validateTestEnvironment(): Promise<boolean> {
  try {
    // Check if tests directory exists and contains spec files
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

async function runAll(options: TestRunOptions = {}) {
  const mode = options.mode || 'production';
  console.log(`=== Starting Test Execution in ${mode.toUpperCase()} mode ===`);
  
  // Validate test environment and AI configuration
  console.log('\nValidating environment...');
  if (!await validateTestEnvironment()) {
    console.error('\u2717 Test environment validation failed');
    process.exit(1);
  }
  
  if (!validateAIConfig(mode)) {
    console.error('\u2717 AI configuration validation failed');
    process.exit(1);
  }
  
  console.log('\u2713 Environment validation passed\n');
  
  // Print run configuration
  console.log('Configuration:');
  console.log(` - Mode: ${mode.toUpperCase()}`);
  console.log(` - Workers: ${options.workers || 'default'}`);
  console.log(` - Retries: ${options.retries !== undefined ? options.retries : 'from config'}`);
  console.log(` - Browser: ${options.headed ? 'headed' : 'headless'}`);
  if (options.tags?.length) console.log(` - Tags: ${options.tags.join(', ')}`);
  if (options.grep) console.log(` - Filter: ${options.grep}`);
  
  if (mode === 'demo') {
    console.log('\n📢 DEMO MODE ENABLED');
    console.log('- Using mock AI responses for analysis');
    console.log('- No API calls will be made');
    console.log('- Demonstrating AI analysis capabilities\n');
  }
  
  let testStats: TestRunStats | null = null;
  try {
    console.log('\nExecuting Playwright tests...');
    console.log('Test Directory: ./tests');
    console.log('Test Pattern: *.spec.ts');
    
    testStats = await runPlaywrightTests(options);
    console.log('✓ Playwright tests execution completed');
  } catch (err) {
    console.error('✗ Playwright tests failed');
    if (err instanceof Error) {
      console.error('Error details:', err.message);
    }
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if all test files exist in ./tests directory');
    console.log('2. Verify test file names end with .spec.ts');
    console.log('3. Ensure playwright.config.ts is properly configured');
    process.exit(1);
  }

  // Generate report regardless of test outcome
  try {
    console.log('\nGenerating AI Failure Analysis Report...');
    // Ensure required directories exist
    
    
    if (!fs.existsSync('artifacts')) {
      console.log('Creating artifacts directory...');
      fs.mkdirSync('artifacts');
    }
    
    if (!fs.existsSync('artifacts/html-report')) {
      console.log('Creating html-report directory...');
      fs.mkdirSync('artifacts/html-report', { recursive: true });
    }
    
    if (!fs.existsSync('artifacts/results.json')) {
      throw new Error('No test results found at artifacts/results.json');
    }
    await runReportGenerator(mode);
    console.log('✓ AI Failure Analysis Report generated successfully');
    
    // Open the HTML report if it exists
    if (fs.existsSync('artifacts/html-report/ai-analysis-report.html')) {
      const proc = exec('npx playwright show-report artifacts/html-report');
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    } else {
      console.warn('⚠️ Report file not found at expected location');
    }
  } catch (reportErr) {
    console.error('✗ Error generating AI report:');
    if (reportErr instanceof Error) {
      console.error('  Message:', reportErr.message);
      if (reportErr.stack) console.error('  Stack:', reportErr.stack);
    } else {
      console.error('  Error details:', reportErr);
    }
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify test results exist in artifacts/results.json');
    console.log('2. Check OpenAI/TogetherAI API keys in .env file');
    console.log('3. Ensure artifacts/html-report directory exists and is writable');
  }

  if (testStats) {
    console.log('\n=== Test Execution Summary ===');
    console.log(`Duration: ${testStats.duration.toFixed(2)}s`);
    console.log(`Total Tests: ${testStats.total}`);
    console.log(`✅ Passed: ${testStats.passed}`);
    console.log(`❌ Failed: ${testStats.failed}`);
    if (testStats.retried > 0) console.log(`⚠️ Retried: ${testStats.retried}`);
    if (testStats.skipped > 0) console.log(`⏭️ Skipped: ${testStats.skipped}`);
    
    if (testStats.failed > 0) {
      console.log('\n❌ Some tests failed - check the reports for details:');
    } else {
      console.log('\n✅ All tests completed successfully!');
    }
    
    console.log('\nReports:');
    console.log(' - HTML Report: artifacts/html-report/index.html');
    console.log(' - JSON Results: artifacts/results.json');
    
    if (testStats.failed > 0) {
      process.exit(1);
    }
  }
}

// Parse command line arguments with mode support
const args = process.argv.slice(2);
const options: TestRunOptions = {
  mode: args.includes('--demo') ? 'demo' : 'production',
  workers: args.includes('--parallel') ? 4 : undefined,
  headed: args.includes('--headed'),
  tags: args.includes('--tags') ? args[args.indexOf('--tags') + 1]?.split(',') : undefined,
  grep: args.includes('--grep') ? args[args.indexOf('--grep') + 1] : undefined,
  retries: args.includes('--retries') ? parseInt(args[args.indexOf('--retries') + 1]) : undefined
};

runAll(options).catch(err => {
  console.error('Failed to run tests:', err);
  process.exit(1);
});
