'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // Hide "back online" message after 3 seconds
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    // Set initial state
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`px-6 py-3 rounded-full backdrop-blur-sm border shadow-lg flex items-center gap-3 ${
            isOnline 
              ? 'bg-green-400/20 border-green-400/30 text-green-400' 
              : 'bg-red-400/20 border-red-400/30 text-red-400'
          }`}>
            {isOnline ? (
              <>
                <WifiIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Back online</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">You're offline</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetry}
                  className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  title="Retry connection"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateConnectionType = () => {
      // Connection API is experimental and not fully typed
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || '');
      }
    };

    // Initial state
    updateOnlineStatus();
    updateConnectionType();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // @ts-ignore
    if ('connection' in navigator) {
      // @ts-ignore
      navigator.connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      // @ts-ignore
      if ('connection' in navigator) {
        // @ts-ignore
        navigator.connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-red-400/20 border-b border-red-400/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-red-400">
        <ExclamationTriangleIcon className="w-5 h-5" />
        <span className="text-sm font-medium">
          You're offline. Some features may not be available.
        </span>
      </div>
    </div>
  );
};
