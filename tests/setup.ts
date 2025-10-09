// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.AI_DEMO = 'true';

// Mock external dependencies
jest.mock('openai');

// Global test utilities
declare global {
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    mockApiResponse: (data: any, status?: number) => any;
  };
}

global.testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockApiResponse: (data: any, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })
};