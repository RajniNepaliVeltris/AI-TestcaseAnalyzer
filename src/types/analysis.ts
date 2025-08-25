export interface TestContext {
    selector?: string;
    timeoutMs?: number;
    statusCode?: number;
    url?: string;
}

export interface AnalysisResult {
    reason: string;
    resolution: string;
    provider: string;
    category?: string;
    prevention?: string;
    context?: TestContext;
    confidence?: number;
    aiStatus?: {
        openai: { available: boolean; error: string | null };
        together: { available: boolean; error: string | null };
    };
    error?: string;
    stack?: string;
}