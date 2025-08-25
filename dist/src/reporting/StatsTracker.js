"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsTracker = void 0;
class StatsTracker {
    constructor() {
        this.stats = {
            openai: this.createDefaultStats(),
            together: this.createDefaultStats(),
            ruleBased: this.createDefaultStats()
        };
    }
    createDefaultStats() {
        return {
            attempts: 0,
            successes: 0,
            html: '',
            status: '⏳',
            error: null
        };
    }
    updateProviderStats(provider, stats) {
        this.stats[provider] = {
            ...this.stats[provider],
            ...stats
        };
    }
    incrementAttempts(provider) {
        this.stats[provider].attempts++;
    }
    incrementSuccesses(provider) {
        this.stats[provider].successes++;
    }
    setError(provider, error) {
        this.stats[provider].error = error;
        this.stats[provider].status = '❌';
    }
    setSuccess(provider) {
        this.stats[provider].status = '✅';
        this.stats[provider].error = null;
    }
    getStats() {
        return this.stats;
    }
    getSuccessRate(provider) {
        const { attempts, successes } = this.stats[provider];
        return attempts > 0 ? Math.round((successes / attempts) * 100) : 0;
    }
}
exports.StatsTracker = StatsTracker;
