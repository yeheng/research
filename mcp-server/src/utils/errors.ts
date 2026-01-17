/**
 * Custom Error Classes for MCP Tools
 *
 * Provides structured error handling with context
 */

/**
 * Base error class for all MCP tool errors
 */
export class MCPToolError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Processing errors during tool execution
 */
export class ProcessingError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROCESSING_ERROR', context);
  }
}

/**
 * External resource errors (network, API, etc.)
 */
export class ResourceError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RESOURCE_ERROR', context);
  }
}

/**
 * Data format or parsing errors
 */
export class DataFormatError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATA_FORMAT_ERROR', context);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}
