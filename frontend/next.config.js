/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production build optimizations - swcMinify is now default in Next.js 15
  output: 'standalone', // For static hosting deployment
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.all4youauctions.co.za',
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL || 'wss://all4youauctioneers-1.onrender.com',
  },
  
  async rewrites() {
    // Proxy API calls to the API server in both development and production (force rebuild)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.all4youauctions.co.za';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'all4youauctions.co.za',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.all4youauctions.co.za',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
