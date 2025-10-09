export interface RateLimitOptions {
    requestsPerMinute: number;
    requestsPerHour: number;
}

export class RateLimiter {
    private requests: number[] = [];
    private options: RateLimitOptions;

    constructor(options: RateLimitOptions = { requestsPerMinute: 60, requestsPerHour: 1000 }) {
        this.options = options;
    }

    async waitForSlot(): Promise<void> {
        const now = Date.now();

        // Clean up old requests
        this.requests = this.requests.filter(time => now - time < 3600000); // Keep last hour

        // Check rate limits
        const requestsInLastMinute = this.requests.filter(time => now - time < 60000).length;
        const requestsInLastHour = this.requests.length;

        if (requestsInLastMinute >= this.options.requestsPerMinute) {
            const oldestInMinute = Math.min(...this.requests.filter(time => now - time < 60000));
            const waitTime = 60000 - (now - oldestInMinute);
            await this.delay(waitTime);
            return this.waitForSlot(); // Recheck after waiting
        }

        if (requestsInLastHour >= this.options.requestsPerHour) {
            const oldestInHour = Math.min(...this.requests);
            const waitTime = 3600000 - (now - oldestInHour);
            await this.delay(waitTime);
            return this.waitForSlot(); // Recheck after waiting
        }

        // Add current request
        this.requests.push(now);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getRemainingRequests(): { perMinute: number; perHour: number } {
        const now = Date.now();
        const requestsInLastMinute = this.requests.filter(time => now - time < 60000).length;
        const requestsInLastHour = this.requests.length;

        return {
            perMinute: Math.max(0, this.options.requestsPerMinute - requestsInLastMinute),
            perHour: Math.max(0, this.options.requestsPerHour - requestsInLastHour)
        };
    }
}

// Global rate limiters for different providers
export const rateLimiters = {
    openai: new RateLimiter({ requestsPerMinute: 50, requestsPerHour: 200 }),
    together: new RateLimiter({ requestsPerMinute: 60, requestsPerHour: 1000 })
};