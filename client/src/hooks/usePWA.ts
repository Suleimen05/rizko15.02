import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook for PWA functionality
 */
export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    updateAvailable: false,
    registration: null,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          setState((prev) => ({ ...prev, registration }));

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Update available');
                  setState((prev) => ({ ...prev, updateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }
      });
    }

    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setState((prev) => ({ ...prev, isInstalled: isStandalone || isIOSStandalone }));
    };

    checkInstalled();

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled);

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkInstalled);
    };
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event fired (Android/Desktop)');
      setDeferredPrompt(e);
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Detection - Safari doesn't support beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    console.log('[PWA] Device Detection:', {
      userAgent: navigator.userAgent,
      isIOS,
      isStandalone,
      isInStandaloneMode,
      shouldShowIOSBanner: isIOS && !isStandalone && !isInStandaloneMode
    });

    // Show install prompt for iOS if not already installed
    if (isIOS && !isStandalone && !isInStandaloneMode) {
      console.log('[PWA] ✅ Showing iOS install banner');
      setState((prev) => ({ ...prev, isInstallable: true }));
    } else if (isIOS) {
      console.log('[PWA] ❌ iOS banner hidden - already installed or in standalone mode');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for offline/online events
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install PWA
  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
      setState((prev) => ({ ...prev, isInstallable: false }));
    } else {
      console.log('[PWA] User dismissed install');
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Skip waiting and activate new service worker
  const updateServiceWorker = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage('skipWaiting');
      window.location.reload();
    }
  }, [state.registration]);

  return {
    ...state,
    install,
    updateServiceWorker,
  };
}

/**
 * Hook for haptic feedback
 */
export function useHaptic() {
  const isSupported = 'vibrate' in navigator;

  const light = useCallback(() => {
    if (!isSupported) return;

    // Use Vibration API
    navigator.vibrate(10);

    // Try to use Haptic Feedback API if available (iOS 13+)
    if ((window as any).HapticFeedback) {
      (window as any).HapticFeedback.light();
    }
  }, [isSupported]);

  const medium = useCallback(() => {
    if (!isSupported) return;

    navigator.vibrate(20);

    if ((window as any).HapticFeedback) {
      (window as any).HapticFeedback.medium();
    }
  }, [isSupported]);

  const heavy = useCallback(() => {
    if (!isSupported) return;

    navigator.vibrate(30);

    if ((window as any).HapticFeedback) {
      (window as any).HapticFeedback.heavy();
    }
  }, [isSupported]);

  const success = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate([10, 50, 10]);
  }, [isSupported]);

  const error = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate([30, 50, 30]);
  }, [isSupported]);

  return {
    isSupported,
    light,
    medium,
    heavy,
    success,
    error,
  };
}

/**
 * Hook for network status with detailed information
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    type: (navigator as any).connection?.effectiveType || 'unknown',
    downlink: (navigator as any).connection?.downlink || 0,
    rtt: (navigator as any).connection?.rtt || 0,
    saveData: (navigator as any).connection?.saveData || false,
  });

  useEffect(() => {
    const connection = (navigator as any).connection;

    const updateStatus = () => {
      setStatus({
        online: navigator.onLine,
        type: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false,
      });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}
