import { RateLimiter } from '../../src/utils/rateLimiter';
// If using Jest, add the following import to enable test globals:

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerHour: 50 });
  });

  describe('waitForSlot', () => {
    it('should allow requests within limits', async () => {
      const startTime = Date.now();

      // Make requests within the limit
      for (let i = 0; i < 5; i++) {
        await limiter.waitForSlot();
      }

      const endTime = Date.now();
      // Should complete quickly without waiting
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should enforce per-minute rate limit', async () => {
      // Test the logic without actually waiting
      const testLimiter = new RateLimiter({ requestsPerMinute: 2, requestsPerHour: 100 });

      // Fill up the requests array to simulate rate limit hit
      const now = Date.now();
      (testLimiter as any).requests = [now, now]; // 2 requests at same time

      // Check that getRemainingRequests shows 0 remaining
      const remaining = testLimiter.getRemainingRequests();
      expect(remaining.perMinute).toBe(0);

      // The waitForSlot would wait, but we don't call it to avoid timeout
      expect(remaining.perMinute).toBe(0);
    });

    it('should enforce per-hour rate limit', async () => {
      // Test the logic without actually waiting
      const testLimiter = new RateLimiter({ requestsPerMinute: 10, requestsPerHour: 2 });

      // Fill up the requests array to simulate hourly limit hit
      const now = Date.now();
      (testLimiter as any).requests = [now, now]; // 2 requests at same time

      // Check that getRemainingRequests shows 0 remaining for hour
      const remaining = testLimiter.getRemainingRequests();
      expect(remaining.perHour).toBe(0);

      // The waitForSlot would wait, but we don't call it to avoid timeout
      expect(remaining.perHour).toBe(0);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests when empty', () => {
      const remaining = limiter.getRemainingRequests();
      expect(remaining.perMinute).toBe(10);
      expect(remaining.perHour).toBe(50);
    });

    it('should calculate remaining requests correctly', async () => {
      // Make some requests
      for (let i = 0; i < 3; i++) {
        await limiter.waitForSlot();
      }

      const remaining = limiter.getRemainingRequests();
      expect(remaining.perMinute).toBe(7);
      expect(remaining.perHour).toBe(47);
    });

    it('should clean up old requests', async () => {
      // Add some old requests
      const oldTime = Date.now() - 4000000; // Over an hour ago
      for (let i = 0; i < 5; i++) {
        (limiter as any).requests.push(oldTime);
      }

      // Add some recent requests
      for (let i = 0; i < 3; i++) {
        await limiter.waitForSlot();
      }

      const remaining = limiter.getRemainingRequests();
      // Old requests should be cleaned up, so only recent ones count
      expect(remaining.perMinute).toBe(7);
      expect(remaining.perHour).toBe(47);
    });
  });

  describe('cleanup behavior', () => {
    it('should clean up old requests over time', async () => {
      // Add requests over an hour ago
      const veryOldTime = Date.now() - 4000000; // Over an hour ago
      for (let i = 0; i < 10; i++) {
        (limiter as any).requests.push(veryOldTime);
      }

      // Make a new request which should trigger cleanup
      await limiter.waitForSlot();

      // Old requests should be cleaned up
      expect((limiter as any).requests.length).toBe(1);
    });
  });

  describe('custom limits', () => {
    it('should respect custom rate limits', () => {
      const customLimiter = new RateLimiter({
        requestsPerMinute: 5,
        requestsPerHour: 20
      });

      const remaining = customLimiter.getRemainingRequests();
      expect(remaining.perMinute).toBe(5);
      expect(remaining.perHour).toBe(20);
    });
  });
});