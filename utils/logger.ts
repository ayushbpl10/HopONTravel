/**
 * Centralized Application Logger
 * - Writes logs to Firestore `error_logs` collection (errors & warns)
 * - Maintains an in-memory circular buffer for bundle/export
 * - Supports emailing the full log bundle to support
 */

import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  timestamp: number;
  platform: string;
}

const MAX_BUFFER = 200; // Keep last 200 log entries in memory

class LoggerService {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private buffer: LogEntry[] = [];
  private userId: string | null = null;
  private userEmail: string | null = null;

  /** Set current user context for log attribution */
  setUserContext(id: string | null, email: string | null) {
    this.userId = id;
    this.userEmail = email;
  }

  private pushToBuffer(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.shift(); // Remove oldest
    }
  }

  /** Persist a log entry to Firestore error_logs collection (best-effort, non-blocking) */
  private async persistToFirestore(entry: LogEntry & { userEmail?: string | null; userId?: string | null }) {
    try {
      await addDoc(collection(db, 'error_logs'), {
        ...entry,
        userId: this.userId,
        userEmail: this.userEmail,
        data: entry.data ? JSON.stringify(entry.data).substring(0, 2000) : null,
      });
    } catch (_e) {
      // Silently fail — do NOT log inside logger to avoid infinite loop
    }
  }

  /** Build a formatted log bundle string for sharing/emailing */
  buildBundle(userDescription?: string): string {
    const header = [
      '=== HopON Travel Error Report ===',
      `Date: ${new Date().toISOString()}`,
      `Platform: ${Platform.OS}`,
      `User: ${this.userEmail || 'Not logged in'} (${this.userId || 'anonymous'})`,
      userDescription ? `\nUser Description:\n${userDescription}` : '',
      '\n=== Recent Logs ===',
    ].join('\n');

    const logs = this.buffer
      .map(e => `[${new Date(e.timestamp).toISOString()}] [${e.level.toUpperCase()}] ${e.message}${e.data ? ` | ${JSON.stringify(e.data).substring(0, 300)}` : ''}`)
      .join('\n');

    return `${header}\n${logs}\n\n=== End of Report ===`;
  }

  /** Get the raw log buffer */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /** Clear the in-memory buffer */
  clearBuffer() {
    this.buffer = [];
  }

  info(message: string, data?: any) {
    const entry: LogEntry = { level: 'info', message, data, timestamp: Date.now(), platform: Platform.OS };
    this.pushToBuffer(entry);
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    const entry: LogEntry = { level: 'warn', message, data, timestamp: Date.now(), platform: Platform.OS };
    this.pushToBuffer(entry);
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    // Persist warnings to Firestore
    this.persistToFirestore(entry);
  }

  error(message: string, error?: any) {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.substring(0, 1000) } : error,
      timestamp: Date.now(),
      platform: Platform.OS,
    };
    this.pushToBuffer(entry);
    console.error(`[ERROR] ${message}`, error || '');
    // Always persist errors to Firestore
    this.persistToFirestore(entry);
  }

  debug(message: string, data?: any) {
    const entry: LogEntry = { level: 'debug', message, data, timestamp: Date.now(), platform: Platform.OS };
    this.pushToBuffer(entry);
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
}

export const Logger = new LoggerService();
