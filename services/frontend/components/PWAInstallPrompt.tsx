'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  XMarkIcon, 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      // Check if app is already installed
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
      
      // Check if iOS
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

      // Listen for the beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        
        // Show prompt after a delay if not already installed
        setTimeout(() => {
          if (!isStandalone) {
            setShowPrompt(true);
          }
        }, 3000);
      };

      // Listen for app installed event
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setShowPrompt(false);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed, dismissed, or no prompt available
  if (isStandalone || isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  // iOS Safari install instructions
  if (isIOS && !isStandalone) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
        >
          <div className="bg-black/90 backdrop-blur-sm border border-green-400/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <DevicePhoneMobileIcon className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Install App</h3>
                  <p className="text-gray-400 text-sm">Add to Home Screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-4">
              Install ALL4YOU Auctions for quick access and offline browsing.
            </p>
            
            <div className="space-y-2 text-sm text-gray-400">
              <p>To install:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Standard PWA install prompt
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
      >
        <div className="bg-black/90 backdrop-blur-sm border border-green-400/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <ComputerDesktopIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Install App</h3>
                <p className="text-gray-400 text-sm">Get the full experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            Install ALL4YOU Auctions for faster access, offline browsing, and push notifications.
          </p>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 text-black px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Install
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Later
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for PWA functionality
export const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      // Check installation status
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

      // Monitor online status
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnline(navigator.onLine);

      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              setUpdateAvailable(true);
            });
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const updateApp = () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  return {
    isInstalled,
    isOnline,
    updateAvailable,
    updateApp
  };
};
