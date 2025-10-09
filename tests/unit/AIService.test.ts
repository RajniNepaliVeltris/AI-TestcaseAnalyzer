import { AIService, TestFailure } from '../../src/services/ai/AIService';
import { InputValidator } from '../../src/utils/inputValidator';
import { rateLimiters } from '../../src/utils/rateLimiter';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
    // Reset rate limiters for each test
    Object.values(rateLimiters).forEach((limiter: any) => {
      limiter.requests = [];
    });
  });

  describe('analyzeFailure', () => {
    it('should validate input before analysis', async () => {
      const invalidFailure: TestFailure = {
        testName: '',
        error: '',
        stackTrace: '',
        timestamp: new Date()
      };

      await expect(aiService.analyzeFailure(invalidFailure))
        .rejects.toThrow('Invalid test failure input');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const validFailure: TestFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      // Mock OpenAI failure
      const mockOpenAI = jest.spyOn(aiService as any, 'analyzeWithOpenAI');
      mockOpenAI.mockRejectedValue(new Error('API Error'));

      // Should fallback to TogetherAI
      const result = await aiService.analyzeFailure(validFailure);
      expect(result).toBeDefined();
      expect(typeof result.rootCause).toBe('string');
    });

    it('should respect rate limits', async () => {
      const validFailure: TestFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      // Fill up rate limit by simulating many requests
      const limiter = rateLimiters.openai;
      for (let i = 0; i < 60; i++) {
        (limiter as any).requests.push(Date.now());
      }

      // Mock TogetherAI to succeed
      const mockTogetherAI = jest.spyOn(aiService as any, 'analyzeWithTogetherAI');
      mockTogetherAI.mockResolvedValue({
        rootCause: 'Fallback analysis due to rate limiting',
        category: 'timeout',
        suggestedFix: 'Wait and retry',
        confidence: 0.8
      });

      const result = await aiService.analyzeFailure(validFailure);
      expect(result).toBeDefined();
      expect(typeof result.rootCause).toBe('string');
    });
  });

  describe('analyzeWithOpenAI', () => {
    it('should format prompt correctly', async () => {
      const failure: TestFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'AI analysis result' } }]
      });

      // Mock OpenAI client
      (aiService as any).openai = { chat: { completions: { create: mockCreate } } };

      await aiService['analyzeWithOpenAI'](failure);

      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.any(String),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('expert test failure analyzer')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Test error')
          })
        ]),
        temperature: 0.3,
        max_tokens: 1000
      }, expect.any(Object));
    });
  });

  describe('analyzeWithTogetherAI', () => {
    it('should handle API response correctly', async () => {
      const failure: TestFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'TogetherAI analysis' } }]
        })
      });

      const result = await aiService['analyzeWithTogetherAI'](failure);

      expect(result.rootCause).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.suggestedFix).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle API errors', async () => {
      const failure: TestFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(aiService['analyzeWithTogetherAI'](failure))
        .rejects.toThrow('Network error');
    });
  });
});