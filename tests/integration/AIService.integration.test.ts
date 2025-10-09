import { AIService, TestFailure } from '../../src/services/ai/AIService';
import { BatchAIService } from '../../src/services/ai/BatchAIService';
import { InputValidator } from '../../src/utils/inputValidator';
import { rateLimiters } from '../../src/utils/rateLimiter';

describe('Integration Tests', () => {
  beforeEach(() => {
    // Reset rate limiters
    Object.values(rateLimiters).forEach((limiter: any) => {
      limiter.requests = [];
    });

    // Set demo mode for testing
    process.env.AI_DEMO = 'true';
  });

  describe('AI Service Integration', () => {
    it('should handle complete failure analysis workflow', async () => {
      const aiService = new AIService();

      const testFailure: TestFailure = {
        testName: 'Login Form Validation',
        error: 'page.click: Timeout 5000ms exceeded',
        stackTrace: 'Error: page.click: Timeout 5000ms exceeded\n    at loginTest',
        timestamp: new Date()
      };

      // Validate input first
      const validation = InputValidator.validateTestFailure(testFailure);
      expect(validation.isValid).toBe(true);

      // Analyze failure
      const result = await aiService.analyzeFailure(testFailure);

      // Verify result structure
      expect(result).toHaveProperty('rootCause');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('suggestedFix');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    });

    it('should fallback gracefully when APIs are unavailable', async () => {
      // Mock API failures
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const aiService = new AIService();
      const testFailure: TestFailure = {
        testName: 'Network Test',
        error: 'Connection timeout',
        stackTrace: 'Error: Connection timeout',
        timestamp: new Date()
      };

      const result = await aiService.analyzeFailure(testFailure);

      // Should still return a result using local analysis
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();

      mockFetch.mockRestore();
    });

    it('should handle batch processing', async () => {
      const batchService = new BatchAIService();

      const failures: TestFailure[] = [
        {
          testName: 'Test 1',
          error: 'Element not found',
          stackTrace: 'Error: Element not found',
          timestamp: new Date()
        },
        {
          testName: 'Test 2',
          error: 'Timeout exceeded',
          stackTrace: 'Error: Timeout exceeded',
          timestamp: new Date()
        }
      ];

      const results = await batchService.analyzeBatch(failures);

      expect(results.results).toHaveLength(2);
      results.results.forEach((result: any) => {
        expect(result).toHaveProperty('rootCause');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('suggestedFix');
        expect(result).toHaveProperty('confidence');
      });
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should prevent API abuse across services', async () => {
      const aiService = new AIService();

      const testFailure: TestFailure = {
        testName: 'Rate Limit Test',
        error: 'Test error',
        stackTrace: 'Test stack',
        timestamp: new Date()
      };

      // Fill up rate limit
      const limiter = rateLimiters.openai;
      for (let i = 0; i < 50; i++) {
        (limiter as any).requests.push(Date.now());
      }

      // Mock TogetherAI to succeed
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Fallback analysis result' } }]
        })
      } as any);

      const result = await aiService.analyzeFailure(testFailure);

      // Should use fallback due to rate limiting
      expect(result).toBeDefined();

      mockFetch.mockRestore();
    });
  });

  describe('Input Validation Integration', () => {
    it('should sanitize inputs before processing', async () => {
      const aiService = new AIService();

      const maliciousFailure: TestFailure = {
        testName: 'XSS Test <script>alert("xss")</script>',
        error: 'Error with <img src=x onerror=alert(1)>',
        stackTrace: 'Stack trace',
        timestamp: new Date()
      };

      // Should not throw due to sanitization
      const result = await aiService.analyzeFailure(maliciousFailure);
      expect(result).toBeDefined();

      // The result should not contain malicious content
      expect(result.rootCause).not.toContain('<script>');
      expect(result.rootCause).not.toContain('<img');
    });
  });

  describe('Error Recovery', () => {
    it('should handle circuit breaker patterns', async () => {
      // Set up environment for OpenAI testing
      process.env.OPENAI_API_KEY = 'test-key';

      const aiService = new AIService();

      // Disable caching for this test
      (aiService as any).cacheTTL = 0;

      // Simulate multiple failures to trigger circuit breaker
      const mockOpenAI = jest.spyOn(aiService as any, 'analyzeWithOpenAI')
        .mockRejectedValue(new Error('Persistent API error'));

      const baseFailure: TestFailure = {
        testName: 'Circuit Breaker Test',
        error: 'Test error',
        stackTrace: 'Test stack',
        timestamp: new Date()
      };

      // Make multiple requests with different data to avoid caching
      for (let i = 0; i < 6; i++) {
        const failure = {
          ...baseFailure,
          testName: `Circuit Breaker Test ${i}`,
          timestamp: new Date(Date.now() + i * 1000) // Different timestamps
        };
        try {
          await aiService.analyzeFailure(failure);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should be open now
      const breaker = (aiService as any).circuitBreakers.get('openai');
      expect(breaker.state).toBe('OPEN');

      // Clean up
      delete process.env.OPENAI_API_KEY;
      mockOpenAI.mockRestore();
    });
  });
});