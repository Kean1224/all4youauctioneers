// API configuration utility
// This handles environment variable access properly for client-side code

export const API_CONFIG = {
  // Use window object to access Next.js injected env vars, fallback to build-time values
  API_URL: typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_API_URL 
    : process.env.NEXT_PUBLIC_API_URL || 'https://api.all4youauctions.co.za',
    
  REALTIME_URL: typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_REALTIME_URL
    : process.env.NEXT_PUBLIC_REALTIME_URL || 'wss://api.all4youauctions.co.za'
};

// Utility function to get API URL
export const getApiUrl = (): string => {
  // In development, use localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }
  
  // In production, use the production API URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://api.all4youauctions.co.za';
  }
  
  // SSR fallback - use environment variable
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

// Utility function to get WebSocket URL (same server as API)
export const getRealtimeUrl = (): string => {
  // In development, use localhost WebSocket
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return process.env.NEXT_PUBLIC_REALTIME_URL || 'ws://localhost:5000';
  }
  
  // In production, use the production WebSocket URL (same as API server)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'wss://api.all4youauctions.co.za';
  }
  
  // SSR fallback - use environment variable
  return process.env.NEXT_PUBLIC_REALTIME_URL || 'ws://localhost:5000';
};

