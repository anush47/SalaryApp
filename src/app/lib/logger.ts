import { LOG_LEVELS } from './constants';

// Define the log level type
type LogLevel = keyof typeof LOG_LEVELS;

// Define the log entry interface
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  error?: Error | string;
}

// Centralized logging system
class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // Set default log level to INFO, but can be overriden by environment variable
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error | string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (metadata) {
      logEntry.metadata = metadata;
    }

    if (error) {
      logEntry.error = error instanceof Error ? error.message : error;
    }

    // Output to console - in production, you might want to send to a logging service
    const logOutput = JSON.stringify(logEntry, null, 2);
    
    switch (level) {
      case 'ERROR':
        console.error(logOutput);
        break;
      case 'WARN':
        console.warn(logOutput);
        break;
      case 'DEBUG':
        console.debug(logOutput);
        break;
      default:
        console.log(logOutput);
        break;
    }
  }

  public error(message: string, metadata?: Record<string, any>, error?: Error | string): void {
    this.log('ERROR', message, metadata, error);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    this.log('DEBUG', message, metadata);
  }
}

// Create and export a singleton logger instance
export const logger = Logger.getInstance();