'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  TrophyIcon,
  TagIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import AdminAuthWrapper from '../../../components/AdminAuthWrapper';
import ModernAdminLayout from '../../../components/ModernAdminLayout';

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function AdminDashboardPage() {
  console.log('🚀 MODERN ADMIN DASHBOARD LOADING');

  const dashboardCards = [
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: UsersIcon,
      href: '/admin/users',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      title: 'Manage Auctions',
      description: 'Create and manage auctions',
      icon: TrophyIcon,
      href: '/admin/auctions',
      color: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      hoverColor: 'hover:from-yellow-600 hover:to-yellow-700'
    },
    {
      title: 'Manage Lots',
      description: 'Add and edit auction items',
      icon: TagIcon,
      href: '/admin/lots',
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      title: 'Invoices',
      description: 'Generate and manage invoices',
      icon: DocumentDuplicateIcon,
      href: '/admin/invoices',
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      title: 'Item Offers',
      description: 'Review direct offers',
      icon: CurrencyDollarIcon,
      href: '/admin/offers',
      color: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700'
    },
    {
      title: 'System Status',
      description: 'Monitor system health',
      icon: ChartBarIcon,
      href: '/admin/system',
      color: 'bg-gradient-to-r from-teal-500 to-teal-600',
      hoverColor: 'hover:from-teal-600 hover:to-teal-700'
    }
  ];

  return (
    <AdminAuthWrapper>
      <ModernAdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Welcome to your comprehensive auction management system. 
              Access all administrative functions from here.
            </p>
          </motion.div>

          {/* Status Banner */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-semibold">
                  System Status: Operational
                </span>
              </div>
            </div>
          </motion.div>

          {/* Dashboard Cards Grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {dashboardCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${card.color} ${card.hoverColor} rounded-xl shadow-lg cursor-pointer transition-all duration-300`}
                  onClick={() => window.location.href = card.href}
                >
                  <div className="p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="h-8 w-8" />
                      <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                    <p className="text-white/80 text-sm">{card.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-white rounded-xl shadow-lg border border-gray-200"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => window.location.href = '/admin/create-auction'}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <TrophyIcon className="h-6 w-6 text-yellow-600 mb-1" />
                  <span className="text-sm text-gray-700">New Auction</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/pending-users'}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <UsersIcon className="h-6 w-6 text-blue-600 mb-1" />
                  <span className="text-sm text-gray-700">Pending Users</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/refunds'}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600 mb-1" />
                  <span className="text-sm text-gray-700">Refunds</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/assign-seller'}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <ClipboardDocumentListIcon className="h-6 w-6 text-purple-600 mb-1" />
                  <span className="text-sm text-gray-700">Assign Seller</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </ModernAdminLayout>
    </AdminAuthWrapper>
  );
}