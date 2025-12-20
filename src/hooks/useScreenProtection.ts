'use client';

import { useEffect, useState, useCallback } from 'react';

interface ScreenProtectionOptions {
  onScreenshotAttempt?: () => void;
  onVisibilityChange?: (isHidden: boolean) => void;
  blurOnHidden?: boolean;
}

export function useScreenProtection(options: ScreenProtectionOptions = {}) {
  const [isProtected, setIsProtected] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);

  const handleScreenshotAttempt = useCallback(() => {
    setScreenshotAttempted(true);
    options.onScreenshotAttempt?.();

    // Reset after 3 seconds
    setTimeout(() => setScreenshotAttempted(false), 3000);
  }, [options]);

  useEffect(() => {
    // Detect PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleScreenshotAttempt();
      }

      // Cmd+Shift+3 or Cmd+Shift+4 (macOS screenshots)
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        handleScreenshotAttempt();
      }

      // Ctrl+Shift+S (some screenshot tools)
      if (e.ctrlKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleScreenshotAttempt();
      }

      // Windows Snipping Tool (Win+Shift+S)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        handleScreenshotAttempt();
      }
    };

    // Detect visibility change (user switching apps/tabs)
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      if (options.blurOnHidden !== false) {
        setIsProtected(isHidden);
      }
      options.onVisibilityChange?.(isHidden);
    };

    // Detect window blur (user clicked outside)
    const handleWindowBlur = () => {
      if (options.blurOnHidden !== false) {
        setIsProtected(true);
      }
    };

    const handleWindowFocus = () => {
      setIsProtected(false);
    };

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect screen capture API (if browser supports it)
    const detectScreenCapture = async () => {
      if ('getDisplayMedia' in navigator.mediaDevices) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async (constraints) => {
          handleScreenshotAttempt();
          return originalGetDisplayMedia(constraints);
        };
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    detectScreenCapture();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [handleScreenshotAttempt, options]);

  return {
    isProtected,
    screenshotAttempted,
  };
}
