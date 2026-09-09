/**
 * HopON Travel Security Utility Module
 * Provides input sanitization, rate-limiting, and validation helpers for app and web security.
 */

// 1. Sanitize text against XSS & script injection
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove < and > tags
    .replace(/javascript:/gi, '') // Remove inline javascript protocols
    .trim();
}

// 2. Validate phone number format (10 digits)
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

// 3. Validate email address format
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// 4. Rate Limiter class for throttling API requests and login attempts
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const timestamps = this.attempts.get(key) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxAttempts) {
      return false;
    }

    validTimestamps.push(now);
    this.attempts.set(key, validTimestamps);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const appRateLimiter = new RateLimiter();
