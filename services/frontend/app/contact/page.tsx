"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('✅ Message sent! We will get back to you soon.');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('❌ Failed to send message. Please try again later.');
      }
    } catch (err) {
      setStatus('❌ Network error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements - ensure they don't block clicks */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">
          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center text-white/80 hover:text-white font-inter font-medium transition-colors group"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:pr-8"
            >
              <h1 className="text-4xl font-bold text-white mb-6 font-sora">
                Get in Touch
              </h1>
              <p className="text-white/80 text-lg mb-8 font-inter leading-relaxed">
                Have questions about our auctions? Need assistance with bidding? We're here to help you every step of the way.
              </p>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                >
                  <div className="flex-shrink-0">
                    <PhoneIcon className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-inter">Phone</h3>
                    <p className="text-white/80">083 258 4755</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                >
                  <div className="flex-shrink-0">
                    <EnvelopeIcon className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-inter">Email</h3>
                    <a
                      href="mailto:admin@all4youauctions.co.za"
                      className="text-primary-300 hover:text-primary-200 transition-colors"
                    >
                      admin@all4youauctions.co.za
                    </a>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                >
                  <div className="flex-shrink-0">
                    <MapPinIcon className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold font-inter">Location</h3>
                    <p className="text-white/80">Pretoria, South Africa</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 font-sora">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-white font-medium mb-2 font-inter">
                      Your Name
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 focus:outline-none transition-all backdrop-blur-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 font-inter">
                      Your Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 focus:outline-none transition-all backdrop-blur-sm"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2 font-inter">
                      Your Message
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 focus:outline-none transition-all backdrop-blur-sm resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Send Message
                  </motion.button>

                  {status && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl"
                    >
                      <p className="text-green-300 text-center font-inter">{status}</p>
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
