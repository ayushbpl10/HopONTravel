/**
 * Screenshot Prevention Utility
 * Prevents screenshots and screen recording in the vendor dashboard
 * 
 * Android: Uses FLAG_SECURE via native module
 * iOS: Uses screen capture notification to show warning
 * Web: Uses CSS to prevent right-click and selection
 */

import { Platform, AppState, Alert } from 'react-native';
import { useEffect, useRef } from 'react';

// For Expo, we'll use expo-screen-capture for detection
// and a config plugin for actual prevention

let preventScreenCaptureModule: any = null;

try {
  // Try to import expo-screen-capture if available
  preventScreenCaptureModule = require('expo-screen-capture');
} catch (e) {
  console.log('expo-screen-capture not available');
}

/**
 * Enable screenshot prevention
 * Call this when entering sensitive screens (vendor dashboard)
 */
export const enableScreenshotPrevention = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    // Web: Add CSS to prevent selection and right-click
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.addEventListener('contextmenu', preventContextMenu);
      document.addEventListener('keydown', preventPrintScreen);
    }
    return;
  }

  if (preventScreenCaptureModule) {
    try {
      // Prevent screen capture (works on Android with FLAG_SECURE)
      await preventScreenCaptureModule.preventScreenCaptureAsync();
    } catch (e) {
      console.log('Could not enable screenshot prevention:', e);
    }
  }
};

/**
 * Disable screenshot prevention
 * Call this when leaving sensitive screens
 */
export const disableScreenshotPrevention = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventPrintScreen);
    }
    return;
  }

  if (preventScreenCaptureModule) {
    try {
      await preventScreenCaptureModule.allowScreenCaptureAsync();
    } catch (e) {
      console.log('Could not disable screenshot prevention:', e);
    }
  }
};

/**
 * Hook to use screenshot prevention in a component
 * Automatically enables on mount and disables on unmount
 */
export const useScreenshotPrevention = (enabled: boolean = true) => {
  const isListening = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    enableScreenshotPrevention();
    isListening.current = true;

    // Listen for screenshot attempts on iOS
    let subscription: any = null;
    if (preventScreenCaptureModule?.addScreenshotListener) {
      subscription = preventScreenCaptureModule.addScreenshotListener(() => {
        Alert.alert(
          'Screenshot Detected',
          'Screenshots are not allowed in the Vendor Dashboard. Please pay the export fee to download data.',
          [{ text: 'OK' }]
        );
      });
    }

    return () => {
      if (isListening.current) {
        disableScreenshotPrevention();
        isListening.current = false;
      }
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enabled]);
};

// Helper functions for web
const preventContextMenu = (e: Event) => {
  e.preventDefault();
  Alert.alert('Action Blocked', 'Right-click is disabled. Pay export fee to download data.');
};

const preventPrintScreen = (e: KeyboardEvent) => {
  if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
    e.preventDefault();
    Alert.alert('Action Blocked', 'Screenshots and printing are disabled. Pay export fee to download data.');
  }
};

/**
 * Overlay component to show when screenshot is detected
 * Can be used to blur/hide sensitive content
 */
export const ScreenshotBlockerOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  // This would render a full-screen overlay
  // Implementation depends on your UI library
  return null;
};
