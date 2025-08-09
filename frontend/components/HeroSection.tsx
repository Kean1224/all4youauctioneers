'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';

interface HeroSectionProps {
  backgroundImage?: string;
  backgroundVideo?: string;
}

export default function HeroSection({ 
  backgroundImage = '/images/hero-bg.jpg',
  backgroundVideo 
}: HeroSectionProps) {
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {backgroundVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={backgroundVideo} type="video/mp4" />
            {/* Fallback image */}
            <img 
              src={backgroundImage} 
              alt="ALL4YOU Auctioneers Hero" 
              className="w-full h-full object-cover"
            />
          </video>
        ) : (
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backgroundImage})`,
            }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        
        {/* Animated particles effect */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary-500/30 rounded-full"
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.7,
              }}
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + i * 10}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center lg:text-left">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-500 font-inter text-sm font-medium mb-6 backdrop-blur-sm"
          >
            <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse" />
            South Africa's #1 Auction Platform
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-7xl font-sora font-bold text-white mb-6 leading-tight"
          >
            <span className="block">Buy.</span>
            <span className="block text-primary-500">Sell.</span>
            <span className="block">Win.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-inter mb-8 max-w-2xl leading-relaxed"
          >
            South Africa's trusted auction platform where buyers find incredible deals 
            and sellers reach thousands of motivated bidders.
          </motion.p>

          {/* Statistics section removed */}

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            
            {/* Primary CTA */}
            <Link href="/auctions">
              <motion.button
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: '0 0 30px rgba(57, 255, 20, 0.4)' 
                }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold text-lg transition-all duration-300 hover:bg-primary-400 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Browse Auctions
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </motion.button>
            </Link>

            {/* Secondary CTA */}
            <Link href="/sell">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group px-8 py-4 border-2 border-white/30 text-white rounded-xl font-inter font-bold text-lg backdrop-blur-sm hover:border-primary-500 hover:text-primary-500 hover:bg-white/5 transition-all duration-300"
              >
                <span className="flex items-center justify-center">
                  List Your Item
                  <PlayIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            variants={itemVariants}
            className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-gray-400"
          >
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-inter">FICA Verified</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-inter">Secure Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-inter">Real-time Bidding</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-3 bg-white/70 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
