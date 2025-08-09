
// ALL4YOU Auctioneers - Production Build

import "../styles/globals.css";
import Layout from "../components/Layout";
import type { Metadata } from "next";
import { Inter, Sora } from 'next/font/google';
import { NotificationProvider } from '../components/NotificationSystem';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { OfflineIndicator } from '../components/OfflineIndicator';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: "ALL4YOU Auctioneers - South Africa's Premier Auction Platform",
  description: "Buy, Sell, Win on South Africa's trusted online auction platform. Real-time bidding, secure transactions, and verified sellers.",
  keywords: ["auction", "south africa", "bidding", "online auction", "buy", "sell"],
  authors: [{ name: "ALL4YOU Auctioneers" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "ALL4YOU Auctioneers",
    description: "South Africa's trusted online auction platform",
    type: "website",
    locale: "en_ZA",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ALL4YOU Auctions",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#39FF14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#39FF14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ALL4YOU Auctions" />
        {/* Removed logo reference */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-inter bg-white text-secondary-800 antialiased">
        <NotificationProvider>
          <OfflineIndicator />
          {children}
          <PWAInstallPrompt />
        </NotificationProvider>
      </body>
    </html>
  );
}
