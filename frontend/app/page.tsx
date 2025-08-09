"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ModernHeader from '@/components/ModernHeader';
import HeroSection from '@/components/HeroSection';
import ModernAuctionCard from '@/components/ModernAuctionCard';
import ModernFooter from '@/components/ModernFooter';
import type { Auction } from '@/components/ModernAuctionCard';

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [featuredAuctions, setFeaturedAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for logged-in user from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('userEmail');
      const storedToken = localStorage.getItem('token');
      
      if (storedEmail) {
        setIsLoggedIn(true);
        setUserEmail(storedEmail);
        // Extract name from email (part before @)
        setUserName(storedEmail.split('@')[0]);
      }

      // Verify with session API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      // Fetch session data
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`, { 
        headers,
        credentials: 'include' 
      })
        .then(res => res.json())
        .then(data => {
          if (data.email) {
            setIsLoggedIn(true);
            setUserEmail(data.email);
            setUserName(data.email.split('@')[0]);
          } else if (!storedEmail) {
            setIsLoggedIn(false);
            setUserEmail('');
            setUserName('');
          }
        })
        .catch(() => {
          // If session check fails but we have stored email, assume logged in
          if (storedEmail) {
            setIsLoggedIn(true);
            setUserEmail(storedEmail);
            setUserName(storedEmail.split('@')[0]);
          }
        });
    }

    // Fetch featured auctions
    fetchFeaturedAuctions();
  }, []);

  const fetchFeaturedAuctions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`);
      if (response.ok) {
        const auctions = await response.json();
        // Take first 4 auctions as featured
        setFeaturedAuctions(auctions.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements - ensure they don't block clicks */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Modern Header */}
      <div className="relative z-50">
        <ModernHeader 
          isLoggedIn={isLoggedIn}
          userEmail={userEmail}
          notificationCount={3}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <HeroSection 
          backgroundImage="/images/auction-hero.jpg"
        />
      </div>

      {/* Featured Auctions Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-sora font-bold text-secondary-800 mb-4">
              Featured Auctions
            </h2>
            <p className="text-lg text-secondary-600 font-inter max-w-2xl mx-auto">
              Don't miss out on these incredible opportunities. Bid now on our most popular items.
            </p>
          </motion.div>

          {/* Auction Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeleton
              [...Array(4)].map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
              ))
            ) : featuredAuctions.length > 0 ? (
              featuredAuctions.map((auction, index) => (
                <ModernAuctionCard 
                  key={auction.id} 
                  auction={auction} 
                  index={index}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🏛️</div>
                <h3 className="text-xl font-sora font-bold text-secondary-800 mb-2">
                  No auctions available
                </h3>
                <p className="text-secondary-600 font-inter">
                  Check back soon for exciting new auctions!
                </p>
              </div>
            )}
          </div>

          {/* View All Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link href="/auctions">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold text-lg hover:bg-primary-400 transition-all duration-200 hover:shadow-glow"
              >
                View All Auctions
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-sora font-bold text-secondary-800 mb-4">
              Why Choose ALL4YOU?
            </h2>
            <p className="text-lg text-secondary-600 font-inter max-w-2xl mx-auto">
              We provide a secure, transparent, and exciting auction experience for both buyers and sellers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "Real-Time Bidding",
                description: "Experience the thrill of live auctions with instant bid updates and real-time notifications.",
                color: "bg-yellow-100"
              },
              {
                icon: "🛡️", 
                title: "Secure & Trusted",
                description: "FICA verified users, secure payments, and comprehensive buyer protection for peace of mind.",
                color: "bg-blue-100"
              },
              {
                icon: "💎",
                title: "Premium Selection",
                description: "Curated items from trusted sellers, ensuring quality and authenticity in every auction.",
                color: "bg-purple-100"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`w-16 h-16 ${feature.color} rounded-full flex items-center justify-center mb-6 mx-auto`}>
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-sora font-bold text-secondary-800 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-secondary-600 font-inter text-center leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-800/90 to-indigo-900/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-sora font-bold text-white mb-6">
              Ready to Start Your Auction Journey?
            </h2>
            <p className="text-xl text-gray-300 font-inter mb-8 leading-relaxed">
              Join thousands of satisfied buyers and sellers. Whether you're looking for unique items or want to sell your treasures, we've got you covered.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isLoggedIn ? (
                <>
                  <Link href="/register">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)' }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold text-lg hover:bg-primary-400 transition-all duration-200"
                    >
                      Get Started Today
                    </motion.button>
                  </Link>
                  <Link href="/auctions">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-inter font-bold text-lg hover:border-primary-500 hover:text-primary-500 transition-all duration-200"
                    >
                      Browse Auctions
                    </motion.button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sell">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)' }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold text-lg hover:bg-primary-400 transition-all duration-200"
                    >
                      List Your Items
                    </motion.button>
                  </Link>
                  <Link href="/my-auctions">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-inter font-bold text-lg hover:border-primary-500 hover:text-primary-500 transition-all duration-200"
                    >
                      My Auctions
                    </motion.button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Modern Footer */}
      <ModernFooter />
    </div>
  );
}