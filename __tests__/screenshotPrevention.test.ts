/**
 * Screenshot Prevention Tests
 * Tests for the screenshot/screen capture prevention utility
 */

import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

const mockSubscription = { remove: jest.fn() };
let mockScreenshotListenerCallback: (() => void) | null = null;
const mockPreventScreenCaptureAsync = jest.fn(() => Promise.resolve());
const mockAllowScreenCaptureAsync = jest.fn(() => Promise.resolve());
const mockAddScreenshotListener = jest.fn((callback) => {
  mockScreenshotListenerCallback = callback;
  return mockSubscription;
});

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: (...args: any[]) => mockPreventScreenCaptureAsync(...args),
  allowScreenCaptureAsync: (...args: any[]) => mockAllowScreenCaptureAsync(...args),
  addScreenshotListener: (cb: any) => mockAddScreenshotListener(cb),
}));

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

import {
  enableScreenshotPrevention,
  disableScreenshotPrevention,
  useScreenshotPrevention,
  ScreenshotBlockerOverlay,
} from '../utils/screenshotPrevention';

describe('Screenshot Prevention Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
    mockScreenshotListenerCallback = null;
  });

  describe('enableScreenshotPrevention', () => {
    describe('Mobile (iOS/Android)', () => {
      it('should call preventScreenCaptureAsync on iOS', async () => {
        (Platform as any).OS = 'ios';
        await enableScreenshotPrevention();
        expect(mockPreventScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should call preventScreenCaptureAsync on Android', async () => {
        (Platform as any).OS = 'android';
        await enableScreenshotPrevention();
        expect(mockPreventScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should handle errors gracefully when module throws', async () => {
        (Platform as any).OS = 'android';
        mockPreventScreenCaptureAsync.mockRejectedValueOnce(new Error('Not supported'));
        await expect(enableScreenshotPrevention()).resolves.not.toThrow();
      });
    });

    describe('Web Platform', () => {
      let registeredHandlers: Record<string, any> = {};

      beforeEach(() => {
        (Platform as any).OS = 'web';
        registeredHandlers = {};
        (global as any).document = {
          body: {
            style: {} as CSSStyleDeclaration,
          },
          addEventListener: jest.fn((evt, handler) => {
            registeredHandlers[evt] = handler;
          }),
          removeEventListener: jest.fn((evt) => {
            delete registeredHandlers[evt];
          }),
        };
      });

      afterEach(() => {
        (Platform as any).OS = 'ios';
        delete (global as any).document;
      });

      it('should disable text selection and attach security listeners', async () => {
        await enableScreenshotPrevention();

        expect((global as any).document.body.style.userSelect).toBe('none');
        expect((global as any).document.body.style.webkitUserSelect).toBe('none');
        expect(registeredHandlers['contextmenu']).toBeDefined();
        expect(registeredHandlers['keydown']).toBeDefined();

        // Test context menu prevention handler
        const mockContextMenuEvent = { preventDefault: jest.fn() };
        registeredHandlers['contextmenu'](mockContextMenuEvent);
        expect(mockContextMenuEvent.preventDefault).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Action Blocked', expect.stringContaining('Right-click is disabled'));

        // Test PrintScreen key prevention
        const mockPrintScreenEvent = { key: 'PrintScreen', preventDefault: jest.fn() };
        registeredHandlers['keydown'](mockPrintScreenEvent);
        expect(mockPrintScreenEvent.preventDefault).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Action Blocked', expect.stringContaining('Screen capture and printing are not permitted'));

        // Test Ctrl+P prevention
        const mockCtrlPEvent = { key: 'p', ctrlKey: true, preventDefault: jest.fn() };
        registeredHandlers['keydown'](mockCtrlPEvent);
        expect(mockCtrlPEvent.preventDefault).toHaveBeenCalled();

        // Test standard non-blocked key press
        const mockNormalKeyEvent = { key: 'a', ctrlKey: false, preventDefault: jest.fn() };
        registeredHandlers['keydown'](mockNormalKeyEvent);
        expect(mockNormalKeyEvent.preventDefault).not.toHaveBeenCalled();
      });
    });
  });

  describe('disableScreenshotPrevention', () => {
    describe('Mobile (iOS/Android)', () => {
      it('should call allowScreenCaptureAsync on mobile', async () => {
        (Platform as any).OS = 'android';
        await disableScreenshotPrevention();
        expect(mockAllowScreenCaptureAsync).toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        (Platform as any).OS = 'ios';
        mockAllowScreenCaptureAsync.mockRejectedValueOnce(new Error('Failed'));
        await expect(disableScreenshotPrevention()).resolves.not.toThrow();
      });
    });

    describe('Web Platform', () => {
      beforeEach(() => {
        (Platform as any).OS = 'web';
        (global as any).document = {
          body: {
            style: { userSelect: 'none', webkitUserSelect: 'none' } as CSSStyleDeclaration,
          },
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      });

      afterEach(() => {
        (Platform as any).OS = 'ios';
        delete (global as any).document;
      });

      it('should re-enable text selection on web and remove listeners', async () => {
        await disableScreenshotPrevention();

        expect((global as any).document.body.style.userSelect).toBe('auto');
        expect((global as any).document.body.style.webkitUserSelect).toBe('auto');
        expect((global as any).document.removeEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
        expect((global as any).document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      });
    });
  });

  describe('useScreenshotPrevention Hook in Component', () => {
    let toggleEnabled: (val: boolean) => void;

    const TestComponent: React.FC<{ initialEnabled?: boolean }> = ({ initialEnabled = true }) => {
      const [enabled, setEnabled] = React.useState(initialEnabled);
      toggleEnabled = setEnabled;
      useScreenshotPrevention(enabled);
      return null;
    };

    it('enables prevention on mount and listens for screenshots on iOS', async () => {
      render(React.createElement(TestComponent, { initialEnabled: true }));

      await waitFor(() => {
        expect(mockPreventScreenCaptureAsync).toHaveBeenCalled();
        expect(mockAddScreenshotListener).toHaveBeenCalled();
      });

      // Trigger listener callback
      expect(mockScreenshotListenerCallback).toBeDefined();
      mockScreenshotListenerCallback!();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Screen Capture Blocked',
        expect.stringContaining('Screen capture is not permitted'),
        [{ text: 'OK' }]
      );

      // Trigger disable to test effect cleanup
      await act(async () => {
        toggleEnabled(false);
      });

      await waitFor(() => {
        expect(mockAllowScreenCaptureAsync).toHaveBeenCalled();
        expect(mockSubscription.remove).toHaveBeenCalled();
      });
    });

    it('does nothing when disabled', () => {
      render(React.createElement(TestComponent, { initialEnabled: false }));
      expect(mockPreventScreenCaptureAsync).not.toHaveBeenCalled();
      expect(mockAddScreenshotListener).not.toHaveBeenCalled();
    });
  });

  describe('ScreenshotBlockerOverlay Component', () => {
    it('renders null whether visible is true or false', () => {
      expect(ScreenshotBlockerOverlay({ visible: false })).toBeNull();
      expect(ScreenshotBlockerOverlay({ visible: true })).toBeNull();
    });
  });

  describe('Missing Module Fallback', () => {
    it('handles require failure gracefully when expo-screen-capture is unavailable', () => {
      jest.isolateModules(() => {
        jest.resetModules();
        jest.doMock('expo-screen-capture', () => {
          throw new Error('Cannot find module');
        });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        require('../utils/screenshotPrevention');
        expect(consoleSpy).toHaveBeenCalledWith('expo-screen-capture not available');
        consoleSpy.mockRestore();
      });
    });
  });
});
