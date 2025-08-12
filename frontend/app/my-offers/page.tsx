'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentDuplicateIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowLeftIcon,
  PhotoIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getToken } from '../../utils/auth';

interface SellItem {
  id: string;
  itemTitle: string;
  itemDescription: string;
  category: string;
  condition: string;
  askingPrice: number;
  location: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  adminNotes?: string;
  adminOffer?: {
    amount: number;
    type: string;
    notes: string;
    offeredAt: string;
  };
  images: any[];
}

export default function MyOffersPage() {
  const [offers, setOffers] = useState<SellItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      fetchUserOffers(payload.email);
    } catch (error) {
      console.error('Error parsing token:', error);
      window.location.href = '/login';
    }
  }, []);

  const fetchUserOffers = async (email: string) => {
    try {
      setLoading(true);
      const { getApiUrl } = await import('../../lib/api');
      const token = getToken();
      
      const response = await fetch(`${getApiUrl()}/api/sell-item/user/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data);
      } else if (response.status === 404) {
        setOffers([]);
      } else {
        setError('Failed to load your offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Network error loading offers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'approved': return 'text-green-400 bg-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      case 'admin_purchased': return 'text-blue-400 bg-blue-400/20';
      case 'counter_offered': return 'text-purple-400 bg-purple-400/20';
      case 'sold': return 'text-emerald-400 bg-emerald-400/20';
      case 'in_auction': return 'text-cyan-400 bg-cyan-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'sold':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'pending':
      case 'counter_offered':
        return <ClockIcon className="w-5 h-5" />;
      default:
        return <DocumentDuplicateIcon className="w-5 h-5" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white">Loading your offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative min-h-screen">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Back Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Link
                href="/account"
                className="inline-flex items-center text-white/80 hover:text-white font-inter font-medium transition-colors group"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Account
              </Link>
            </motion.div>

            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-sora font-bold text-white mb-4">
                My Offers
              </h1>
              <p className="text-xl text-white/80 font-inter max-w-2xl mx-auto">
                Track the status of your submitted offers and direct sale requests
              </p>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-8">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {offers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/90 backdrop-blur-md rounded-2xl p-12 shadow-card border border-white/20 text-center"
              >
                <DocumentDuplicateIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h2 className="text-2xl font-sora font-bold text-secondary-800 mb-4">
                  No Offers Yet
                </h2>
                <p className="text-secondary-600 font-inter mb-8">
                  You haven't submitted any offers yet. Start by submitting an item for direct sale.
                </p>
                <Link href="/sell">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-primary-500 text-secondary-800 px-8 py-3 rounded-xl font-inter font-bold hover:bg-primary-400 transition-all duration-200 shadow-glow"
                  >
                    Submit Your First Offer
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {offers.map((offer, index) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20"
                    >
                      <div className="flex flex-col lg:flex-row gap-8">
                        {/* Image Section */}
                        <div className="lg:w-1/4">
                          {offer.images && offer.images.length > 0 ? (
                            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                              <img
                                src={`/api/sell-item/image/${offer.id}/${offer.images[0].filename}`}
                                alt={offer.itemTitle}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/default-auction.jpg';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="lg:w-3/4 space-y-6">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-2xl font-sora font-bold text-secondary-800 mb-2">
                                {offer.itemTitle}
                              </h3>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-secondary-600">Category: {offer.category}</span>
                                <span className="text-secondary-600">Condition: {offer.condition}</span>
                              </div>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(offer.status)}`}>
                              {getStatusIcon(offer.status)}
                              {formatStatus(offer.status)}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-secondary-800 mb-2">Your Asking Price</h4>
                              <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="w-5 h-5 text-primary-600" />
                                <span className="text-2xl font-bold text-primary-600">
                                  R{offer.askingPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-secondary-800 mb-2">Submitted</h4>
                              <p className="text-secondary-600">
                                {new Date(offer.submittedAt).toLocaleDateString('en-ZA', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Admin Offer */}
                          {offer.adminOffer && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <h4 className="font-semibold text-blue-900 mb-2">
                                {offer.adminOffer.type === 'purchase' ? 'Direct Purchase Offer' : 'Counter Offer'}
                              </h4>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-blue-700">Our Offer:</span>
                                <span className="text-xl font-bold text-blue-900">
                                  R{offer.adminOffer.amount.toLocaleString()}
                                </span>
                              </div>
                              {offer.adminOffer.notes && (
                                <p className="text-sm text-blue-700">{offer.adminOffer.notes}</p>
                              )}
                            </div>
                          )}

                          {/* Admin Notes */}
                          {offer.adminNotes && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                              <h4 className="font-semibold text-gray-800 mb-2">Admin Notes</h4>
                              <p className="text-gray-700">{offer.adminNotes}</p>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <h4 className="font-semibold text-secondary-800 mb-2">Description</h4>
                            <p className="text-secondary-600 leading-relaxed">
                              {offer.itemDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}