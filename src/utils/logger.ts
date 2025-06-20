// Debug logger utility
interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDev = import.meta.env.DEV || import.meta.env.NODE_ENV !== 'production';

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
    if (!this.isDev && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `${prefix} ${message}`,
        context
      );
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `${prefix} ${message}`
      );
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  // Specialized auth logging
  auth(message: string, context?: LogContext) {
    this.log('info', `[Auth] ${message}`, context);
  }

  // Specialized API logging
  api(message: string, context?: LogContext) {
    this.log('info', `[API] ${message}`, context);
  }

  // Specialized Email logging
  email(message: string, context?: LogContext) {
    this.log('info', `[Email] ${message}`, context);
  }
}

export const logger = new Logger(); 