'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface User {
  email: string;
  name: string;
  ficaApproved?: boolean;
  rejectionReason?: string;
  createdAt: string;
  resubmittedAt?: string;
}

interface FICAStatusBannerProps {
  user: User | null;
  onResubmitClick?: () => void;
  dismissible?: boolean;
}

export default function FICAStatusBanner({ 
  user, 
  onResubmitClick, 
  dismissible = false 
}: FICAStatusBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if user is approved or banner is dismissed
  if (!user || user.ficaApproved || isDismissed) {
    return null;
  }

  const getStatusInfo = () => {
    if (user.rejectionReason) {
      return {
        type: 'rejected',
        icon: ExclamationTriangleIcon,
        title: '📄 FICA Documents Rejected',
        message: 'Your documents need to be resubmitted for verification.',
        details: user.rejectionReason,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
        actionButton: {
          text: 'Resubmit Documents',
          bgColor: 'bg-red-600 hover:bg-red-700',
          onClick: onResubmitClick
        }
      };
    }

    // Calculate days since submission
    const submittedDate = new Date(user.resubmittedAt || user.createdAt);
    const daysSinceSubmission = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      type: 'pending',
      icon: ClockIcon,
      title: '⏳ FICA Verification in Progress',
      message: 'Your documents are being reviewed by our admin team.',
      details: `Submitted ${daysSinceSubmission === 0 ? 'today' : `${daysSinceSubmission} day${daysSinceSubmission === 1 ? '' : 's'} ago`} • Expected review time: 1-3 business days`,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-600',
      restrictions: [
        'Cannot place bids on auction items',
        'Cannot set up automatic bidding',
        'Cannot participate in live auctions',
        'Cannot submit items for auction'
      ]
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-xl p-4 mb-6 shadow-sm`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`flex-shrink-0 ${statusInfo.iconColor}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <h3 className={`font-semibold ${statusInfo.textColor} mb-1`}>
                {statusInfo.title}
              </h3>
              
              <p className={`${statusInfo.textColor} text-sm mb-2`}>
                {statusInfo.message}
              </p>
              
              <p className={`${statusInfo.textColor} text-xs opacity-75 mb-3`}>
                {statusInfo.details}
              </p>

              {/* Restrictions for pending status */}
              {statusInfo.type === 'pending' && statusInfo.restrictions && (
                <div className={`${statusInfo.textColor} text-sm`}>
                  <p className="font-medium mb-2">🔒 Current Restrictions:</p>
                  <ul className="text-xs space-y-1 ml-4">
                    {statusInfo.restrictions.map((restriction, index) => (
                      <li key={index} className="list-disc">
                        {restriction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What user can do while waiting */}
              {statusInfo.type === 'pending' && (
                <div className={`${statusInfo.textColor} text-sm mt-3 pt-3 border-t ${statusInfo.borderColor}`}>
                  <p className="font-medium mb-2">✅ What You Can Do Now:</p>
                  <ul className="text-xs space-y-1 ml-4">
                    <li className="list-disc">Browse current and upcoming auctions</li>
                    <li className="list-disc">View detailed lot information</li>
                    <li className="list-disc">Add items to your watchlist</li>
                    <li className="list-disc">Set up auction notifications</li>
                  </ul>
                </div>
              )}

              {/* Action button for rejected status */}
              {statusInfo.actionButton && (
                <div className="mt-4">
                  <button
                    onClick={statusInfo.actionButton.onClick}
                    className={`${statusInfo.actionButton.bgColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2`}
                  >
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    <span>{statusInfo.actionButton.text}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className={`${statusInfo.textColor} hover:opacity-75 transition-opacity flex-shrink-0 ml-2`}
              title="Dismiss notification"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress indicator for pending status */}
        {statusInfo.type === 'pending' && (
          <div className="mt-4 pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-2">
              <span>Verification Progress</span>
              <span>Under Review</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <motion.div
                className="bg-amber-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '66%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-xs text-amber-600 mt-1">
              <span>Submitted</span>
              <span>Under Review</span>
              <span>Approved</span>
            </div>
          </div>
        )}

        {/* Contact info */}
        <div className={`mt-4 pt-3 border-t ${statusInfo.borderColor} text-xs ${statusInfo.textColor} opacity-75`}>
          <p>
            <strong>Questions?</strong> Contact us at{' '}
            <a 
              href="mailto:admin@all4youauctions.co.za" 
              className="underline hover:no-underline"
            >
              admin@all4youauctions.co.za
            </a>{' '}
            or{' '}
            <a 
              href="tel:+27111234567" 
              className="underline hover:no-underline"
            >
              +27 11 123 4567
            </a>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}