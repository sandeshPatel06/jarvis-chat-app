/**
 * logger.ts
 * Captures console.log, console.warn, and console.error calls
 * and maintains a buffer of logs for the Developer Menu.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
}

const MAX_LOGS = 1000;
const LOG_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

class LoggerService {
    private logs: LogEntry[] = [];
    private originalLog = console.log;
    private originalWarn = console.warn;
    private originalError = console.error;

    init() {
        if ((global as any).__logger_initialized) return;
        (global as any).__logger_initialized = true;

        console.log = (...args: any[]) => {
            this.addLog('info', args);
            this.originalLog(...args);
        };

        console.warn = (...args: any[]) => {
            this.addLog('warn', args);
            this.originalWarn(...args);
        };

        console.error = (...args: any[]) => {
            this.addLog('error', args);
            this.originalError(...args);
        };
    }

    private addLog(level: LogLevel, args: any[]) {
        const message = args
            .map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return '[Object]';
                    }
                }
                return String(arg);
            })
            .join(' ');

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
        };

        this.logs.unshift(entry);

        // Keep logs within limit
        if (this.logs.length > MAX_LOGS) {
            this.logs.pop();
        }
    }

    getRecentLogs(): LogEntry[] {
        const now = Date.now();
        return this.logs.filter(log => now - log.timestamp <= LOG_WINDOW_MS);
    }

    clearLogs() {
        this.logs = [];
    }
}

export const logger = new LoggerService();
