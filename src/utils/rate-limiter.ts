import { setTimeout } from 'timers/promises';

class RateLimiter {
    private requestTimes: number[] = [];
    private requestsPerMinute: number;
    private requestWindow: number;

    constructor(requestsPerMinute: number = 3, requestWindow: number = 60000) {
        this.requestsPerMinute = requestsPerMinute;
        this.requestWindow = requestWindow;
    }

    async waitForSlot(): Promise<void> {
        const now = Date.now();
        // Remove old requests outside the window
        this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);
        
        if (this.requestTimes.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const waitTime = this.requestWindow - (now - oldestRequest);
            if (waitTime > 0) {
                await setTimeout(waitTime);
            }
            this.requestTimes.shift();
        }
        
        this.requestTimes.push(Date.now());
    }
}

export const openAIRateLimiter = new RateLimiter(3, 60000); // 3 requests per minute
export const togetherAIRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute