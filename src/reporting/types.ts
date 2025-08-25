export interface AnalysisResult {
  reason: string;
  resolution: string;
  provider: string;
  category?: string;
  prevention?: string;
  context?: TestContext;
  aiStatus?: {
    openai: {
      available: boolean;
      error: string | null;
    };
    together: {
      available: boolean;
      error: string | null;
    };
  };
  confidence?: number;
}

export interface TestContext {
  selector?: string;
  timeoutMs?: number;
  statusCode?: number;
  url?: string;
  stack?: string;
  error?: string;
  browser?: string;
  device?: string;
  viewport?: { width?: number; height?: number };
  network?: {
    status?: number;
    method?: string;
    contentType?: string;
    responseTime?: number;
  };
  performance?: {
    loadTime?: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
}

export interface ProviderStats {
  attempts: number;
  successes: number;
  html: string;
  status: string;
  error: string | null;
  model?: string;
}

export interface StatsTracking {
  openai: ProviderStats;
  together: ProviderStats;
  ruleBased: ProviderStats;
}

export interface HistoryEntry {
  date: string;
  total: number;
  failed: number;
  passed: number;
}

export interface ClusteredFailures {
  [key: string]: any[];
}