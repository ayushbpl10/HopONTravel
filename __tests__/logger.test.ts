import { Logger } from '../utils/logger';
import { addDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ type: 'collection', path })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-log-id' })),
}));

describe('Logger Utility', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Logger.clearBuffer();
    Logger.setUserContext(null, null);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('sets user context for log attribution', () => {
    Logger.setUserContext('user_123', 'traveler@example.com');
    Logger.info('User action');
    const bundle = Logger.buildBundle();
    expect(bundle).toContain('traveler@example.com (user_123)');
  });

  it('handles anonymous / logged out user context in buildBundle', () => {
    Logger.setUserContext(null, null);
    Logger.info('Anonymous action');
    const bundle = Logger.buildBundle('Custom issue description');
    expect(bundle).toContain('User: Not logged in (anonymous)');
    expect(bundle).toContain('User Description:\nCustom issue description');
  });

  it('stores entries in buffer and retrieves with getBuffer', () => {
    Logger.info('Step 1', { detail: 'data1' });
    Logger.debug('Step 2');
    const buffer = Logger.getBuffer();
    expect(buffer.length).toBe(2);
    expect(buffer[0].message).toBe('Step 1');
    expect(buffer[0].data).toEqual({ detail: 'data1' });
    expect(buffer[1].message).toBe('Step 2');
  });

  it('clears buffer properly', () => {
    Logger.info('Msg to clear');
    expect(Logger.getBuffer().length).toBe(1);
    Logger.clearBuffer();
    expect(Logger.getBuffer().length).toBe(0);
  });

  it('shifts oldest entry when buffer exceeds MAX_BUFFER (200)', () => {
    for (let i = 0; i < 205; i++) {
      Logger.info(`Log message ${i}`);
    }
    const buffer = Logger.getBuffer();
    expect(buffer.length).toBe(200);
    expect(buffer[0].message).toBe('Log message 5');
    expect(buffer[buffer.length - 1].message).toBe('Log message 204');
  });

  it('logs info in development and production environments', () => {
    (Logger as any).isDevelopment = true;
    Logger.info('Dev info test', { a: 1 });
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Dev info test', { a: 1 });

    (Logger as any).isDevelopment = false;
    Logger.info('Prod info test');
    expect(Logger.getBuffer().some(e => e.message === 'Prod info test')).toBe(true);
  });

  it('logs debug in development and production environments', () => {
    (Logger as any).isDevelopment = true;
    Logger.debug('Dev debug message', { debugKey: 'v' });
    expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Dev debug message', { debugKey: 'v' });

    (Logger as any).isDevelopment = false;
    Logger.debug('Prod debug message');
    expect(Logger.getBuffer().some(e => e.message === 'Prod debug message')).toBe(true);
  });

  it('logs warn and persists to Firestore', async () => {
    (Logger as any).isDevelopment = true;
    Logger.setUserContext('vendor_456', 'vendor@example.com');
    Logger.warn('Warning triggered', { warnDetail: true });

    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning triggered', { warnDetail: true });
    expect(addDoc).toHaveBeenCalled();

    (Logger as any).isDevelopment = false;
    Logger.warn('Prod warning without data');
    expect(addDoc).toHaveBeenCalled();
  });

  it('logs error with Error instance and persists formatted stack', () => {
    const errorObj = new Error('Database connection failed');
    errorObj.stack = 'Error: Database connection failed\n    at Object.test';
    Logger.error('Critical failure', errorObj);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Critical failure', errorObj);
    expect(addDoc).toHaveBeenCalled();
    const buffer = Logger.getBuffer();
    const lastEntry = buffer[buffer.length - 1];
    expect(lastEntry.level).toBe('error');
    expect(lastEntry.data.name).toBe('Error');
    expect(lastEntry.data.message).toBe('Database connection failed');
    expect(lastEntry.data.stack).toContain('Database connection failed');
  });

  it('logs error with non-Error data or empty error', () => {
    Logger.error('String error', 'Simple error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] String error', 'Simple error message');

    Logger.error('Empty error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Empty error', '');
  });

  it('silently handles Firestore persistence failures without throwing', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('Network offline'));
    expect(() => {
      Logger.error('Failed network write', new Error('Original error'));
    }).not.toThrow();
  });
});
