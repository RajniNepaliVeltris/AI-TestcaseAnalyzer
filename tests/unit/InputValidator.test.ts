import { InputValidator } from '../../src/utils/inputValidator';

describe('InputValidator', () => {
  describe('validateApiKey', () => {
    it('should validate OpenAI API key format', () => {
      const result = InputValidator.validateApiKey('sk-test123', 'OpenAI');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid OpenAI API key format', () => {
      const result = InputValidator.validateApiKey('invalid-key', 'OpenAI');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key should start with "sk-"');
    });

    it('should reject placeholder API keys', () => {
      const result = InputValidator.validateApiKey('your-openai-key', 'OpenAI');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key appears to be a placeholder');
    });

    it('should reject empty API keys', () => {
      const result = InputValidator.validateApiKey('', 'OpenAI');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key cannot be empty');
    });

    it('should reject undefined API keys', () => {
      const result = InputValidator.validateApiKey(undefined, 'OpenAI');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is missing');
    });
  });

  describe('validateTestFailure', () => {
    it('should validate complete test failure object', () => {
      const validFailure = {
        testName: 'Test Case',
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      const result = InputValidator.validateTestFailure(validFailure);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing test name', () => {
      const invalidFailure = {
        error: 'Test error',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      const result = InputValidator.validateTestFailure(invalidFailure);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test name must be a non-empty string');
    });

    it('should reject empty error message', () => {
      const invalidFailure = {
        testName: 'Test Case',
        error: '',
        stackTrace: 'Error stack',
        timestamp: new Date()
      };

      const result = InputValidator.validateTestFailure(invalidFailure);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Error message must be a non-empty string');
    });

    it('should reject null test failure object', () => {
      const result = InputValidator.validateTestFailure(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Test failure object is required');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove control characters', () => {
      const inputWithControlChars = 'Hello\x00World\x01Test';
      const result = InputValidator.sanitizeInput(inputWithControlChars);
      expect(result).toBe('HelloWorldTest');
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
    });

    it('should handle null input', () => {
      const result = InputValidator.sanitizeInput(null as any);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = InputValidator.sanitizeInput(undefined as any);
      expect(result).toBe('');
    });

    it('should preserve normal text', () => {
      const normalInput = 'Normal test message';
      const result = InputValidator.sanitizeInput(normalInput);
      expect(result).toBe(normalInput);
    });
  });
});