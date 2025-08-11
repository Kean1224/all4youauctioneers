// API configuration utility
// This handles environment variable access properly for client-side code

export const API_CONFIG = {
  // Use window object to access Next.js injected env vars, fallback to build-time values
  API_URL: typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_API_URL 
    : process.env.NEXT_PUBLIC_API_URL || 'https://api-d7nd.onrender.com',
    
  REALTIME_URL: typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_REALTIME_URL
    : process.env.NEXT_PUBLIC_REALTIME_URL || 'wss://all4youauctioneers-1.onrender.com'
};

// Utility function to get API URL
export const getApiUrl = (): string => {
  // In production, use the production API URL directly
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://api-d7nd.onrender.com';
  }
  
  // In development or SSR, use environment variables
  return process.env.NEXT_PUBLIC_API_URL || 'https://api-d7nd.onrender.com';
};

// Utility function to get realtime URL
export const getRealtimeUrl = (): string => {
  // In production, use the production Realtime URL directly
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'wss://all4youauctioneers-1.onrender.com';
  }
  
  // In development or SSR, use environment variables
  return process.env.NEXT_PUBLIC_REALTIME_URL || 'wss://all4youauctioneers-1.onrender.com';
};