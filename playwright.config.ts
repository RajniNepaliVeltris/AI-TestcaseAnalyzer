import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ai-analysis-demo.spec.ts',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['json', { outputFile: 'artifacts/playwright-results.json' }],
    ['html', { outputFolder: 'artifacts/html-report', open: 'never' }],
    ['junit', { outputFile: 'artifacts/junit-results.xml' }]
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false,
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: process.env.CI ? true : false,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: process.env.CI ? true : false,
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        headless: process.env.CI ? true : false,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        headless: process.env.CI ? true : false,
      },
    },
  ],
  outputDir: 'test-results/',
  globalSetup: require.resolve('./tests/setup.ts'),
  globalTeardown: require.resolve('./tests/setup.ts'),
});
