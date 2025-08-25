"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.togetherAIRateLimiter = exports.openAIRateLimiter = void 0;
const promises_1 = require("timers/promises");
class RateLimiter {
    constructor(requestsPerMinute = 3, requestWindow = 60000) {
        this.requestTimes = [];
        this.requestsPerMinute = requestsPerMinute;
        this.requestWindow = requestWindow;
    }
    async waitForSlot() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);
        if (this.requestTimes.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const waitTime = this.requestWindow - (now - oldestRequest);
            if (waitTime > 0) {
                await (0, promises_1.setTimeout)(waitTime);
            }
            this.requestTimes.shift();
        }
        this.requestTimes.push(Date.now());
    }
}
exports.openAIRateLimiter = new RateLimiter(3, 60000); // 3 requests per minute
exports.togetherAIRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
