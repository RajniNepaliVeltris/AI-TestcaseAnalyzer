export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class InputValidator {
    static validateApiKey(key: string | undefined, provider: string): ValidationResult {
        const errors: string[] = [];

        if (key === undefined || key === null) {
            errors.push(`${provider} API key is missing`);
            return { isValid: false, errors };
        }

        if (typeof key !== 'string') {
            errors.push(`${provider} API key must be a string`);
            return { isValid: false, errors };
        }

        if (key.trim().length === 0) {
            errors.push(`${provider} API key cannot be empty`);
            return { isValid: false, errors };
        }

        // Basic format validation for common API key patterns
        if (provider === 'OpenAI' && !key.startsWith('sk-')) {
            errors.push('OpenAI API key should start with "sk-"');
        }

        if (key.includes('your-') || key.includes('placeholder') || key.includes('example')) {
            errors.push(`${provider} API key appears to be a placeholder`);
        }

        return { isValid: errors.length === 0, errors };
    }

    static validateTestFailure(failure: any): ValidationResult {
        const errors: string[] = [];

        if (!failure) {
            errors.push('Test failure object is required');
            return { isValid: false, errors };
        }

        if (!failure.testName || typeof failure.testName !== 'string') {
            errors.push('Test name must be a non-empty string');
        }

        if (!failure.error || typeof failure.error !== 'string') {
            errors.push('Error message must be a non-empty string');
        }

        if (failure.error && failure.error.length > 10000) {
            errors.push('Error message is too long (max 10000 characters)');
        }

        if (failure.stackTrace && typeof failure.stackTrace !== 'string') {
            errors.push('Stack trace must be a string if provided');
        }

        if (failure.stackTrace && failure.stackTrace.length > 50000) {
            errors.push('Stack trace is too long (max 50000 characters)');
        }

        return { isValid: errors.length === 0, errors };
    }

    static sanitizeInput(input: string): string {
        if (typeof input !== 'string') {
            return '';
        }

        // Remove null bytes and other control characters
        return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    static validateEnvironment(): ValidationResult {
        const errors: string[] = [];

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        if (majorVersion < 16) {
            errors.push(`Node.js version ${nodeVersion} is not supported. Minimum required: v16`);
        }

        // Check for required environment variables
        const requiredEnvVars = ['NODE_ENV'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Required environment variable ${envVar} is not set`);
            }
        }

        return { isValid: errors.length === 0, errors };
    }
}