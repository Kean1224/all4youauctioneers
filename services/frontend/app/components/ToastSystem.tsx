"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration (default 5 seconds)
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-green-600',
          icon: '✅',
          border: 'border-green-300'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          icon: '❌',
          border: 'border-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
          icon: '⚠️',
          border: 'border-yellow-300'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          icon: 'ℹ️',
          border: 'border-blue-300'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          icon: '📝',
          border: 'border-gray-300'
        };
    }
  };

  const styles = getToastStyles(toast.type);

  return (
    <div
      className={`
        ${styles.bg} text-white p-4 rounded-lg shadow-lg border-l-4 ${styles.border}
        transform transition-all duration-500 ease-in-out
        animate-slide-in-right hover:scale-105
        max-w-sm break-words
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-xl flex-shrink-0 mt-0.5">{styles.icon}</span>
          <div className="min-w-0 flex-1">
            {toast.title && (
              <h4 className="font-bold text-sm mb-1 leading-tight">{toast.title}</h4>
            )}
            <p className="text-sm leading-tight opacity-95">{toast.message}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="ml-2 text-white hover:text-gray-200 font-bold text-lg leading-none flex-shrink-0 p-1"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      
      {/* Progress bar showing time remaining */}
      <div className={`mt-2 h-1 bg-white/20 rounded-full overflow-hidden`}>
        <div 
          className="h-full bg-white/40 animate-shrink-width"
          style={{
            animationDuration: `${toast.duration || 5000}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards'
          }}
        />
      </div>
    </div>
  );
}

// CSS animations - you can add this to your global styles
const toastStyles = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes shrinkWidth {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.5s ease-out;
  }
  
  .animate-shrink-width {
    animation: shrinkWidth linear;
  }
`;

// Export styles to be added to global CSS
export { toastStyles };
