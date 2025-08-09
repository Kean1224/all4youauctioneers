'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { notificationSlide } from '../utils/animations';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, message, duration: 7000 });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string) => {
    addNotification({ type: 'warning', title, message, duration: 6000 });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ 
      addNotification, 
      removeNotification, 
      success, 
      error, 
      warning, 
      info 
    }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC<{
  notifications: Notification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationCard: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success': return 'border-green-400/30';
      case 'error': return 'border-red-400/30';
      case 'warning': return 'border-yellow-400/30';
      case 'info': return 'border-blue-400/30';
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-400/10';
      case 'error': return 'bg-red-400/10';
      case 'warning': return 'bg-yellow-400/10';
      case 'info': return 'bg-blue-400/10';
    }
  };

  return (
    <motion.div
      variants={notificationSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`bg-black/80 backdrop-blur-sm border ${getBorderColor()} ${getBackgroundColor()} rounded-xl p-4 shadow-lg min-w-[320px]`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm">{notification.title}</h4>
          {notification.message && (
            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(notification.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// Hook for using notifications with common patterns
export const useNotificationHelpers = () => {
  const { success, error, warning, info } = useNotifications();

  const notifySuccess = {
    login: () => success('Welcome back!', 'You have successfully logged in.'),
    logout: () => success('Logged out', 'See you next time!'),
    bid: (amount: number) => success('Bid placed!', `Your bid of $${amount} has been submitted.`),
    save: () => success('Saved', 'Your changes have been saved successfully.'),
    upload: () => success('Upload complete', 'Your files have been uploaded.'),
    delete: () => success('Deleted', 'Item has been removed successfully.'),
    register: () => success('Welcome!', 'Your account has been created. Please check your email for verification.'),
    emailSent: () => success('Email sent', 'Verification email has been sent to your inbox.'),
  };

  const notifyError = {
    network: () => error('Connection error', 'Please check your internet connection and try again.'),
    auth: () => error('Authentication failed', 'Invalid email or password.'),
    validation: (field: string) => error('Validation error', `Please check your ${field}.`),
    generic: () => error('Something went wrong', 'Please try again later.'),
    upload: () => error('Upload failed', 'There was an error uploading your files.'),
    payment: () => error('Payment failed', 'Your payment could not be processed.'),
    bidTooLow: () => error('Bid too low', 'Your bid must be higher than the current bid.'),
  };

  const notifyWarning = {
    sessionExpiring: () => warning('Session expiring', 'Your session will expire in 5 minutes.'),
    unsavedChanges: () => warning('Unsaved changes', 'You have unsaved changes that will be lost.'),
    bidEnding: () => warning('Auction ending soon', 'This auction ends in less than 5 minutes.'),
    fileSize: () => warning('File size too large', 'Please select files smaller than 10MB.'),
  };

  const notifyInfo = {
    loading: () => info('Loading...', 'Please wait while we process your request.'),
    maintenance: () => info('Scheduled maintenance', 'System will be down for maintenance tonight.'),
    newFeature: () => info('New feature available', 'Check out our new bidding interface!'),
    emailVerification: () => info('Email verification required', 'Please verify your email to continue.'),
  };

  return {
    success: notifySuccess,
    error: notifyError,
    warning: notifyWarning,
    info: notifyInfo,
  };
};
