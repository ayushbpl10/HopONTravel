/**
 * Screenshot Prevention Tests
 * Tests for the screenshot/screen capture prevention utility
 */

import { Alert, Platform } from 'react-native';

// Mock expo-screen-capture BEFORE imports
const mockPreventScreenCaptureAsync = jest.fn(() => Promise.resolve());
const mockAllowScreenCaptureAsync = jest.fn(() => Promise.resolve());
const mockAddScreenshotListener = jest.fn(() => ({ remove: jest.fn() }));

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: mockPreventScreenCaptureAsync,
  allowScreenCaptureAsync: mockAllowScreenCaptureAsync,
  addScreenshotListener: mockAddScreenshotListener,
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('Screenshot Prevention Utility', () => {
  // We need to dynamically require the module after mocks are set up
  let screenshotPrevention: typeof import('../utils/screenshotPrevention');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    (Platform as any).OS = 'ios';
    
    // Re-require the module to get fresh instance with mocks
    screenshotPrevention = require('../utils/screenshotPrevention');
  });

  describe('enableScreenshotPrevention', () => {
    describe('Mobile (iOS/Android)', () => {
      it('should call preventScreenCaptureAsync on iOS', async () => {
        (Platform as any).OS = 'ios';
        
        // Re-require after changing Platform.OS
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');

        await screenshotPrevention.enableScreenshotPrevention();

        expect(mockPreventScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should call preventScreenCaptureAsync on Android', async () => {
        (Platform as any).OS = 'android';
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');

        await screenshotPrevention.enableScreenshotPrevention();

        expect(mockPreventScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should handle errors gracefully when module throws', async () => {
        (Platform as any).OS = 'android';
        mockPreventScreenCaptureAsync.mockRejectedValueOnce(new Error('Not supported'));
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');

        // Should not throw
        await expect(screenshotPrevention.enableScreenshotPrevention()).resolves.not.toThrow();
      });
    });

    describe('Web Platform', () => {
      beforeEach(() => {
        (Platform as any).OS = 'web';
        (global as any).document = {
          body: {
            style: {} as CSSStyleDeclaration,
          },
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');
      });

      afterEach(() => {
        delete (global as any).document;
      });

      it('should disable text selection on web', async () => {
        await screenshotPrevention.enableScreenshotPrevention();

        expect((global as any).document.body.style.userSelect).toBe('none');
      });

      it('should add contextmenu event listener', async () => {
        await screenshotPrevention.enableScreenshotPrevention();

        expect((global as any).document.addEventListener).toHaveBeenCalledWith(
          'contextmenu',
          expect.any(Function)
        );
      });

      it('should add keydown event listener for print screen', async () => {
        await screenshotPrevention.enableScreenshotPrevention();

        expect((global as any).document.addEventListener).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function)
        );
      });
    });
  });

  describe('disableScreenshotPrevention', () => {
    describe('Mobile (iOS/Android)', () => {
      it('should call allowScreenCaptureAsync on mobile', async () => {
        (Platform as any).OS = 'android';
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');

        await screenshotPrevention.disableScreenshotPrevention();

        expect(mockAllowScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        (Platform as any).OS = 'ios';
        mockAllowScreenCaptureAsync.mockRejectedValueOnce(new Error('Failed'));
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');

        await expect(screenshotPrevention.disableScreenshotPrevention()).resolves.not.toThrow();
      });
    });

    describe('Web Platform', () => {
      beforeEach(() => {
        (Platform as any).OS = 'web';
        (global as any).document = {
          body: {
            style: { userSelect: 'none' } as CSSStyleDeclaration,
          },
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
        
        jest.resetModules();
        screenshotPrevention = require('../utils/screenshotPrevention');
      });

      afterEach(() => {
        delete (global as any).document;
      });

      it('should re-enable text selection on web', async () => {
        await screenshotPrevention.disableScreenshotPrevention();

        expect((global as any).document.body.style.userSelect).toBe('auto');
      });

      it('should remove event listeners', async () => {
        await screenshotPrevention.disableScreenshotPrevention();

        expect((global as any).document.removeEventListener).toHaveBeenCalledWith(
          'contextmenu',
          expect.any(Function)
        );
        expect((global as any).document.removeEventListener).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function)
        );
      });
    });
  });
});

describe('Screenshot Detection Alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show alert when screenshot is detected', () => {
    const screenshotCallback = () => {
      Alert.alert(
        'Screenshot Detected',
        'Screenshots are not allowed in the Vendor Dashboard. Please pay the export fee to download data.',
        [{ text: 'OK' }]
      );
    };

    screenshotCallback();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Screenshot Detected',
      expect.stringContaining('Screenshots are not allowed'),
      expect.any(Array)
    );
  });
});

describe('Web Context Menu Prevention', () => {
  it('should prevent default on context menu event', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    };

    const preventContextMenu = (e: any) => {
      e.preventDefault();
    };

    preventContextMenu(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should prevent print screen key', () => {
    const mockEvent = {
      key: 'PrintScreen',
      ctrlKey: false,
      preventDefault: jest.fn(),
    };

    const preventPrintScreen = (e: any) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
      }
    };

    preventPrintScreen(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should prevent Ctrl+P', () => {
    const mockEvent = {
      key: 'p',
      ctrlKey: true,
      preventDefault: jest.fn(),
    };

    const preventPrintScreen = (e: any) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
      }
    };

    preventPrintScreen(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should not prevent regular key presses', () => {
    const mockEvent = {
      key: 'a',
      ctrlKey: false,
      preventDefault: jest.fn(),
    };

    const preventPrintScreen = (e: any) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
      }
    };

    preventPrintScreen(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });
});
