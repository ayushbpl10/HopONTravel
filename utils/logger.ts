/**
 * Centralized Application Logger
 * Uses standard console logging for free local analytics.
 * In a production environment, this can be easily connected to Firebase Analytics/Crashlytics
 * or any other free-tier tracking service without changing the app's components.
 */

class LoggerService {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log informational messages (e.g., successful user actions)
   */
  info(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
    // TODO: Add Firebase Analytics logEvent here for production
  }

  /**
   * Log non-critical warnings
   */
  warn(message: string, data?: any) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    // TODO: Add to free-tier crashlytics non-fatal records here
  }

  /**
   * Log critical errors and exceptions
   */
  error(message: string, error?: any) {
    // We always want to capture errors, even in prod, but maybe suppress redboxes
    console.error(`[ERROR] ${message}`, error || '');
    
    // In production, send this to Firebase Crashlytics:
    // if (!this.isDevelopment) {
    //   crashlytics().recordError(error);
    // }
  }

  /**
   * Debug messages only visible in development
   */
  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
}

export const Logger = new LoggerService();
