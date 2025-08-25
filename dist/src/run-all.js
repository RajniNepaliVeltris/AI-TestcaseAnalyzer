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
const child_process_1 = require("child_process");
const perf_hooks_1 = require("perf_hooks");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Optimized Playwright test execution and report generation
function buildPlaywrightCommand(options = {}) {
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
function parseTestResults(output) {
    const stats = {
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
            if (line.includes('failed'))
                stats.failed++;
            if (line.includes('passed'))
                stats.passed++;
            if (line.includes('skipped'))
                stats.skipped++;
            if (line.includes('retried'))
                stats.retried++;
        }
        stats.total = stats.passed + stats.failed;
    }
    catch (error) {
        console.warn('Could not parse test results:', error);
    }
    return stats;
}
async function runPlaywrightTests(options = {}) {
    return new Promise((resolve, reject) => {
        const startTime = perf_hooks_1.performance.now();
        const command = buildPlaywrightCommand(options);
        console.log(`\nExecuting command: ${command}\n`);
        let output = '';
        const proc = (0, child_process_1.exec)(command, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
            output += stdout + stderr;
            const stats = parseTestResults(output);
            stats.duration = (perf_hooks_1.performance.now() - startTime) / 1000;
            if (error) {
                if (stderr.includes('Test failed')) {
                    resolve(stats);
                }
                else {
                    console.error('Playwright test execution error:', stderr);
                    reject(error);
                }
            }
            else {
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
function runReportGenerator() {
    return new Promise((resolve, reject) => {
        console.log('Running report generator...');
        const reportProcess = (0, child_process_1.exec)('npx ts-node src/report-generator.ts', {
            env: process.env,
            maxBuffer: 20 * 1024 * 1024 // Increased buffer size for large reports
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
                console.log('Report generation completed successfully');
                resolve();
            }
            else {
                console.error(`Report generation failed with code ${code}`);
                console.error('Error output:', errorOutput);
                reject(new Error(`Report generation failed with code ${code}`));
            }
        });
    });
}
async function validateTestEnvironment() {
    try {
        // Check if tests directory exists and contains spec files
        const testsDir = path.join(process.cwd(), 'tests');
        if (!fs.existsSync(testsDir)) {
            console.error('\u2717 Tests directory not found:', testsDir);
            return false;
        }
        const specFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith('.spec.ts'));
        if (specFiles.length === 0) {
            console.error('\u2717 No .spec.ts files found in tests directory');
            return false;
        }
        console.log('\u2713 Found', specFiles.length, 'test files:');
        specFiles.forEach((file) => console.log(` - ${file}`));
        return true;
    }
    catch (error) {
        console.error('\u2717 Error validating test environment:', error);
        return false;
    }
}
async function runAll(options = {}) {
    console.log('=== Starting Test Execution ===');
    // Validate test environment first
    console.log('\nValidating test environment...');
    if (!await validateTestEnvironment()) {
        console.error('\u2717 Test environment validation failed');
        process.exit(1);
    }
    console.log('\u2713 Test environment validation passed\n');
    // Print run configuration
    console.log('Configuration:');
    console.log(` - Workers: ${options.workers || 'default'}`);
    console.log(` - Retries: ${options.retries !== undefined ? options.retries : 'from config'}`);
    console.log(` - Mode: ${options.headed ? 'headed' : 'headless'}`);
    if (options.tags?.length)
        console.log(` - Tags: ${options.tags.join(', ')}`);
    if (options.grep)
        console.log(` - Filter: ${options.grep}`);
    let testStats = null;
    try {
        console.log('\nExecuting Playwright tests...');
        console.log('Test Directory: ./tests');
        console.log('Test Pattern: *.spec.ts');
        testStats = await runPlaywrightTests(options);
        console.log('✓ Playwright tests execution completed');
    }
    catch (err) {
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
        await runReportGenerator();
        console.log('✓ AI Failure Analysis Report generated successfully');
        // Open the HTML report if it exists
        if (fs.existsSync('artifacts/html-report/ai-analysis-report.html')) {
            const proc = (0, child_process_1.exec)('npx playwright show-report artifacts/html-report');
            proc.stdout?.pipe(process.stdout);
            proc.stderr?.pipe(process.stderr);
        }
        else {
            console.warn('⚠️ Report file not found at expected location');
        }
    }
    catch (reportErr) {
        console.error('✗ Error generating AI report:');
        if (reportErr instanceof Error) {
            console.error('  Message:', reportErr.message);
            if (reportErr.stack)
                console.error('  Stack:', reportErr.stack);
        }
        else {
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
        if (testStats.retried > 0)
            console.log(`⚠️ Retried: ${testStats.retried}`);
        if (testStats.skipped > 0)
            console.log(`⏭️ Skipped: ${testStats.skipped}`);
        if (testStats.failed > 0) {
            console.log('\n❌ Some tests failed - check the reports for details:');
        }
        else {
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
// Parse command line arguments
const args = process.argv.slice(2);
const options = {
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
