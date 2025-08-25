import { ProviderStats, StatsTracking } from './types';

export class StatsTracker {
  private stats: StatsTracking;

  constructor() {
    this.stats = {
      openai: this.createDefaultStats(),
      together: this.createDefaultStats(),
      ruleBased: this.createDefaultStats()
    };
  }

  private createDefaultStats(): ProviderStats {
    return {
      attempts: 0,
      successes: 0,
      html: '',
      status: '⏳',
      error: null
    };
  }

  public updateProviderStats(
    provider: keyof StatsTracking,
    stats: Partial<ProviderStats>
  ): void {
    this.stats[provider] = {
      ...this.stats[provider],
      ...stats
    };
  }

  public incrementAttempts(provider: keyof StatsTracking): void {
    this.stats[provider].attempts++;
  }

  public incrementSuccesses(provider: keyof StatsTracking): void {
    this.stats[provider].successes++;
  }

  public setError(provider: keyof StatsTracking, error: string): void {
    this.stats[provider].error = error;
    this.stats[provider].status = '❌';
  }

  public setSuccess(provider: keyof StatsTracking): void {
    this.stats[provider].status = '✅';
    this.stats[provider].error = null;
  }

  public getStats(): StatsTracking {
    return this.stats;
  }

  public getSuccessRate(provider: keyof StatsTracking): number {
    const { attempts, successes } = this.stats[provider];
    return attempts > 0 ? Math.round((successes / attempts) * 100) : 0;
  }
}