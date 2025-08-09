'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  EyeIcon,
  HeartIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

export type Auction = {
  id: string;
  title: string;
  status: string;
  startDate?: string;
  startsAt?: string;
  endDate?: string;
  endsAt?: string;
  description?: string;
  image?: string;
  auctionImage?: string;
  depositRequired?: boolean;
  depositAmount?: number;
  location?: string;
  lots?: any[];
  totalLots?: number;
  currentHighestBid?: number;
  viewCount?: number;
  category?: string;
};

interface AuctionCardProps {
  auction: Auction;
  index?: number;
}

export default function ModernAuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isWatched, setIsWatched] = useState(false);
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  // Use the correct date fields
  const startDate = auction.startDate || auction.startsAt;
  const endDate = auction.endDate || auction.endsAt;

  // Calculate auction status and time
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const calculateStatus = () => {
      const now = new Date().getTime();
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();

      if (now < startTime) {
        // Auction hasn't started yet
        setStatus('upcoming');
        const timeDiff = startTime - now;
        setTimeLeft(formatTimeDiff(timeDiff, 'Starts in'));
      } else if (now >= startTime && now < endTime) {
        // Auction is live
        setStatus('live');
        const timeDiff = endTime - now;
        setTimeLeft(formatTimeDiff(timeDiff, 'Ends in'));
      } else {
        // Auction has ended
        setStatus('ended');
        setTimeLeft('Ended');
      }
    };

    const formatTimeDiff = (timeDiff: number, prefix: string) => {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${prefix} ${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${prefix} ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${prefix} ${minutes}m`;
      } else {
        return `${prefix} <1m`;
      }
    };

    calculateStatus();
    const timer = setInterval(calculateStatus, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  const handleWatchToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWatched(!isWatched);
    // TODO: Add to watchlist API call
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
            UPCOMING
          </span>
        );
      case 'live':
        return (
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
            LIVE
          </span>
        );
      case 'ended':
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">
            ENDED
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const auctionImage = auction.auctionImage || auction.image || '';
  const lotCount = auction.totalLots || auction.lots?.length || 0;

  return (
    <Link href={`/auctions/${auction.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
      >
        
        {/* Image Section */}
        <div className="relative h-56 overflow-hidden">
          {auctionImage && auctionImage.trim() !== "" ? (
            <Image
              src={auctionImage}
              alt={auction.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '';
              }}
            />
          ) : null}
          
          {/* Overlay Elements */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            {getStatusBadge()}
          </div>

          {/* Watch Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWatchToggle}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200"
          >
            {isWatched ? (
              <HeartSolidIcon className="w-5 h-5 text-red-500" />
            ) : (
              <HeartIcon className="w-5 h-5 text-white" />
            )}
          </motion.button>

          {/* Deposit Required Badge */}
          {auction.depositRequired && (
            <div className="absolute bottom-3 left-3">
              <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                DEPOSIT REQUIRED
              </span>
            </div>
          )}

          {/* Category Badge */}
          {auction.category && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                <TagIcon className="w-3 h-3" />
                {auction.category}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
            {auction.title}
          </h3>

          {/* Description */}
          {auction.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {auction.description}
            </p>
          )}

          {/* Auction Details */}
          <div className="space-y-3">
            {/* Start Date */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4 text-green-500" />
              <span className="font-medium">Starts:</span>
              <span>{formatDate(startDate)}</span>
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 text-red-500" />
              <span className="font-medium">Ends:</span>
              <span>{formatDate(endDate)}</span>
            </div>

            {/* Deposit Information */}
            {auction.depositRequired && auction.depositAmount && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="font-medium">Deposit:</span>
                <span>R{(auction.depositAmount || 0).toLocaleString()}</span>
              </div>
            )}

            {/* Location */}
            {auction.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">📍</span>
                <span>{auction.location}</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            {/* Lot Count */}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <TagIcon className="w-4 h-4" />
              <span>{lotCount} lot{lotCount !== 1 ? 's' : ''}</span>
            </div>

            {/* Views */}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <EyeIcon className="w-4 h-4" />
              <span>{auction.viewCount || 0} views</span>
            </div>

            {/* Time Left */}
            <div className={`text-sm font-medium ${
              status === 'ended' ? 'text-gray-500' : status === 'live' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {timeLeft}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                status === 'ended'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : status === 'live'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25'
              }`}
              disabled={status === 'ended'}
            >
              {status === 'ended' ? 'Auction Ended' : status === 'live' ? 'View & Bid Now' : 'View Details'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
