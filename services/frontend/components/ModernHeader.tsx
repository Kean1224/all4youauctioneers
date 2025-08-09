'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface HeaderProps {
  isLoggedIn?: boolean;
  userEmail?: string;
  notificationCount?: number;
}

export default function ModernHeader({ 
  isLoggedIn = false, 
  userEmail = '',
  notificationCount = 0 
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Auctions', href: '/auctions' },
    { name: 'Sell', href: '/sell' },
    { name: 'My Account', href: '/account' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.href = '/';
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-secondary-800/80 backdrop-blur-md border-b border-white/10' 
          : 'bg-secondary-800/60 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0"
          >
            <Link href="/" className="flex items-center">
              <div className="w-[120px] h-[40px] bg-primary-500 rounded-lg flex items-center justify-center font-sora font-bold text-secondary-800 text-lg">
                ALL4YOU
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`font-inter font-medium transition-all duration-200 relative group ${
                    pathname === item.href
                      ? 'text-primary-500'
                      : 'text-white hover:text-primary-500'
                  }`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-200 group-hover:w-full ${
                    pathname === item.href ? 'w-full' : ''
                  }`} />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* User Account */}
            {isLoggedIn ? (
              <div className="relative group">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2 p-2 text-white hover:text-primary-500 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-secondary-800 font-bold text-sm">
                      {userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-inter text-sm">{userEmail.split('@')[0]}</span>
                </motion.button>
                
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      My Account
                    </Link>
                    <Link href="/my-auctions" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      My Auctions
                    </Link>
                    <Link href="/watchlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Watchlist
                    </Link>
                    <hr className="my-1" />
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-white border border-white/30 rounded-lg hover:border-primary-500 hover:text-primary-500 transition-all duration-200 font-inter font-medium"
                  >
                    Login
                  </motion.button>
                </Link>
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-primary-500 text-secondary-800 rounded-lg font-inter font-bold hover:bg-primary-400 transition-all duration-200"
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:text-primary-500 transition-colors duration-200"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            
            {/* Menu */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden"
            >
              <div className="flex flex-col h-full p-6 bg-white">
                {/* Mobile Logo */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-[120px] h-[40px] bg-primary-500 rounded-lg flex items-center justify-center font-sora font-bold text-secondary-800 text-lg">
                    ALL4YOU
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-3 text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  >
                    <XMarkIcon className="w-8 h-8" />
                  </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="space-y-3 mb-6 flex-shrink-0">
                  {navigation.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block py-4 px-4 rounded-lg font-inter font-bold text-xl transition-all duration-200 ${
                          pathname === item.href
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'text-gray-800 hover:bg-gray-100 hover:text-blue-600'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile Actions */}
                <div className="space-y-3 mb-6 flex-shrink-0">
                  <button className="w-full flex items-center space-x-3 py-4 px-4 text-gray-800 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all duration-200 font-bold text-lg">
                    <MagnifyingGlassIcon className="w-6 h-6" />
                    <span className="font-inter">Search</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 py-4 px-4 text-gray-800 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-all duration-200 font-bold text-lg">
                    <BellIcon className="w-6 h-6" />
                    <span className="font-inter">Notifications</span>
                    {notificationCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Mobile Auth */}
                <div className="mt-auto pt-6 border-t-2 border-gray-300 flex-shrink-0">
                  {isLoggedIn ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 py-2 px-4">
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-secondary-800 font-bold text-sm">
                            {userEmail.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-800 font-inter font-bold text-lg">{userEmail.split('@')[0]}</p>
                          <p className="text-gray-600 text-base">{userEmail}</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="w-full py-4 px-4 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all duration-200 font-inter font-bold text-lg shadow-md"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <button className="w-full py-4 px-4 text-gray-800 border-2 border-gray-800 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 font-inter font-bold text-xl shadow-md">
                          Login
                        </button>
                      </Link>
                      <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                        <button className="w-full py-4 px-4 bg-blue-500 text-white rounded-lg font-inter font-bold hover:bg-blue-600 hover:shadow-xl transition-all duration-200 text-xl shadow-md">
                          Sign Up
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
