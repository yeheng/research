/**
 * Simple Logger for MCP Tools
 *
 * Provides structured logging without external dependencies
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: Record<string, any>) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level: levelName,
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    const output = JSON.stringify(entry);

    // Always log to stderr to avoid interfering with stdout JSON responses
    console.error(output);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
  }
}

export const logger = new Logger();
