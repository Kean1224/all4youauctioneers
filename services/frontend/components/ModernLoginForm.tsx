'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function ModernLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`;
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      setLoading(false);
      
      if (res.ok) {
        // Store the token in localStorage
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userEmail', data.email);
          localStorage.setItem('userRole', data.role);
        }
        
        // Redirect based on role
        if (data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setLoading(false);
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-3xl font-sora font-bold text-secondary-800 mb-2">
          Welcome Back
        </h1>
        <p className="text-secondary-600 font-inter">
          Sign in to your ALL4YOU account
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        variants={itemVariants}
        className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-inter font-medium text-secondary-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-secondary-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-inter font-medium text-secondary-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-secondary-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm transition-all duration-200"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600 transition-colors" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3"
            >
              <p className="text-red-600 text-sm font-inter">{error}</p>
            </motion.div>
          )}

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-700 font-inter">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 font-inter font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-secondary-800 font-inter font-bold rounded-xl hover:from-primary-400 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-secondary-800 border-t-transparent mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="mt-6 mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-secondary-500 font-inter">Don't have an account?</span>
            </div>
          </div>
        </div>

        {/* Register Link */}
        <Link href="/register">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 border-2 border-secondary-300 text-secondary-700 font-inter font-bold rounded-xl hover:border-primary-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200"
          >
            Create New Account
          </motion.button>
        </Link>
      </motion.div>

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center mt-8">
        <p className="text-sm text-secondary-500 font-inter">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
