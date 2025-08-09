'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function ModernFooter() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Quick Links',
      links: [
        { name: 'Browse Auctions', href: '/auctions' },
        { name: 'How to Bid', href: '/how-to-bid' },
        { name: 'Sell with Us', href: '/sell' },
        { name: 'Contact Support', href: '/contact' }
      ]
    },
    {
      title: 'Account',
      links: [
        { name: 'My Account', href: '/account' },
        { name: 'My Bids', href: '/my-auctions' },
        { name: 'Watchlist', href: '/watchlist' },
        { name: 'Transaction History', href: '/account/transactions' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Auction Rules', href: '/auction-rules' },
        { name: 'FICA Compliance', href: '/fica' }
      ]
    }
  ];

  const contactInfo = [
    {
      icon: EnvelopeIcon,
      label: 'Email',
      value: 'info@all4youauctions.co.za',
      href: 'mailto:info@all4youauctions.co.za'
    },
    {
      icon: PhoneIcon,
      label: 'Phone',
      value: '+27 11 123 4567',
      href: 'tel:+27111234567'
    },
    {
      icon: MapPinIcon,
      label: 'Address',
      value: 'Johannesburg, South Africa',
      href: '#'
    }
  ];

  const trustFeatures = [
    {
      icon: ShieldCheckIcon,
      title: 'FICA Verified',
      description: 'All users are FICA verified for security'
    },
    {
      icon: CreditCardIcon,
      title: 'Secure Payments',
      description: 'SSL encrypted payment processing'
    },
    {
      icon: ClockIcon,
      title: '24/7 Support',
      description: 'Round-the-clock customer assistance'
    },
    {
      icon: UserGroupIcon,
      title: 'Trusted Community',
      description: 'Join thousands of satisfied users'
    }
  ];

  return (
    <footer className="bg-secondary-900 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-blue-500/5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative">
        {/* Trust Features Section */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {trustFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <h4 className="font-sora font-bold text-white mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-white/60 font-inter text-sm">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            
            {/* Brand Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-tr from-primary-400 to-primary-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">🏛️</span>
                </div>
                <h3 className="text-2xl font-sora font-bold text-white">
                  ALL4YOU
                </h3>
              </div>
              <p className="text-white/70 font-inter leading-relaxed mb-6">
                South Africa's premier online auction platform. Connecting buyers and sellers in a secure, transparent marketplace since 2024.
              </p>
              
              {/* Contact Information */}
              <div className="space-y-3">
                {contactInfo.map((contact, index) => {
                  const Icon = contact.icon;
                  return (
                    <Link
                      key={index}
                      href={contact.href}
                      className="flex items-center text-white/70 hover:text-primary-400 transition-colors group"
                    >
                      <Icon className="w-5 h-5 mr-3 group-hover:text-primary-400 transition-colors" />
                      <span className="font-inter text-sm">{contact.value}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* Footer Links */}
            {footerSections.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (sectionIndex + 1) * 0.1 }}
              >
                <h4 className="text-lg font-sora font-bold text-white mb-6">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-white/70 hover:text-primary-400 font-inter text-sm transition-colors hover:translate-x-1 transform duration-200 block"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h4 className="text-2xl font-sora font-bold text-white mb-4">
                Stay Updated
              </h4>
              <p className="text-white/70 font-inter mb-8">
                Get notified about upcoming auctions, special deals, and platform updates.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold hover:bg-primary-400 transition-all duration-200 shadow-glow"
                >
                  Subscribe
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="text-white/60 font-inter text-sm mb-4 md:mb-0"
              >
                © {currentYear} ALL4YOU Auctioneers. All rights reserved.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex items-center space-x-6"
              >
                <div className="flex items-center text-white/60 text-sm font-inter">
                  <GlobeAltIcon className="w-4 h-4 mr-2" />
                  Made in South Africa
                </div>
                
                {/* Social Links (if needed in future) */}
                <div className="flex space-x-4">
                  {/* Social media icons can be added here */}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
