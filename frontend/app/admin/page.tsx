'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  TrophyIcon,
  TagIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  GiftIcon,
  UserGroupIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { getToken } from '../../utils/auth';

type DashboardStats = {
  totalUsers: number;
  totalAuctions: number;
  totalLots: number;
  totalOffers: number;
  activeAuctions: number;
  pendingApprovals: number;
  totalRevenue: number;
  monthlyGrowth: number;
};

type RecentActivity = {
  id: string;
  type: 'user_registration' | 'auction_created' | 'item_sold' | 'offer_submitted';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
};

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
};

export default function ModernAdminDashboard() {
  const router = useRouter();
  // Secure: Only show admin dashboard if valid admin_jwt is present
  useEffect(() => {
    const token = localStorage.getItem('admin_jwt');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin' || !payload.email || !payload.exp || Date.now() / 1000 > payload.exp) {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    }
  }, [router]);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAuctions: 0,
    totalLots: 0,
    totalOffers: 0,
    activeAuctions: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Only fetch dashboard data after authentication check passes
  // (The authentication check useEffect above will redirect if not authenticated)
  useEffect(() => {
    const token = localStorage.getItem('admin_jwt');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'admin' && payload.email && payload.exp && Date.now() / 1000 < payload.exp) {
        fetchDashboardData();
      }
    } catch {
      // Do nothing, already redirected
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('admin_jwt');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      let users: any[] = [];
      let auctions: any[] = [];
      let offers: any[] = [];

      // Fetch real data from API endpoints
      try {
        const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          users = Array.isArray(usersData) ? usersData : [];
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }

      try {
        const auctionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`, { headers });
        if (auctionsRes.ok) {
          const auctionsData = await auctionsRes.json();
          auctions = Array.isArray(auctionsData) ? auctionsData : [];
        }
      } catch (error) {
        console.error('Error fetching auctions:', error);
      }

      try {
        const offersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sell-item/admin/all`, { headers });
        if (offersRes.ok) {
          const offersData = await offersRes.json();
          offers = Array.isArray(offersData) ? offersData : [];
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      }

      // Calculate real statistics
      const lots = auctions.reduce((acc: number, auction: any) => acc + (auction.lots?.length || 0), 0);
      const activeAuctions = auctions.filter((auction: any) => auction.status === 'active').length;
      const pendingOffers = offers.filter((offer: any) => offer.status === 'pending').length;
      
      // Calculate total revenue from completed lots
      const totalRevenue = auctions.reduce((total: number, auction: any) => {
        if (auction.lots) {
          return total + auction.lots.reduce((auctionTotal: number, lot: any) => {
            return auctionTotal + (lot.currentBid || 0);
          }, 0);
        }
        return total;
      }, 0);

      setStats({
        totalUsers: users.length,
        totalAuctions: auctions.length,
        totalLots: lots,
        totalOffers: offers.length,
        activeAuctions: activeAuctions,
        pendingApprovals: pendingOffers,
        totalRevenue: totalRevenue,
        monthlyGrowth: 0 // TODO: Calculate based on historical data
      });

      // Get real recent activity
      const recentActivities = [];
      
      // Recent user registrations
      const recentUsers = users.filter((user: any) => {
        const createdAt = new Date(user.createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > oneDayAgo;
      }).slice(0, 3);

      recentUsers.forEach((user: any) => {
        recentActivities.push({
          id: `user-${user.id}`,
          type: 'user_registration',
          message: `New user registered: ${user.email}`,
          timestamp: user.createdAt,
          status: 'success'
        });
      });

      // Recent auctions
      const recentAuctions = auctions.filter((auction: any) => {
        const createdAt = new Date(auction.createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > oneDayAgo;
      }).slice(0, 2);

      recentAuctions.forEach((auction: any) => {
        recentActivities.push({
          id: `auction-${auction.id}`,
          type: 'auction_created',
          message: `New auction created: ${auction.title}`,
          timestamp: auction.createdAt,
          status: 'success'
        });
      });

      // Recent offers
      const recentOffers = offers.filter((offer: any) => {
        const createdAt = new Date(offer.createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > oneDayAgo;
      }).slice(0, 2);

      recentOffers.forEach((offer: any) => {
        recentActivities.push({
          id: `offer-${offer.id}`,
          type: 'offer_submitted',
          message: `New sell offer: ${offer.title}`,
          timestamp: offer.createdAt,
          status: 'warning'
        });
      });

      // Sort by timestamp (newest first)
      recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(recentActivities.slice(0, 10));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values if API fails
      setStats({
        totalUsers: 0,
        totalAuctions: 0,
        totalLots: 0,
        totalOffers: 0,
        activeAuctions: 0,
        pendingApprovals: 0,
        totalRevenue: 0,
        monthlyGrowth: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon, href: '/admin' },
    { id: 'users', label: 'Users', icon: UsersIcon, href: '/admin/users' },
    { id: 'auctions', label: 'Auctions', icon: TrophyIcon, href: '/admin/auctions' },
    { id: 'offers', label: 'Offers', icon: TagIcon, href: '/admin/offers' },
    { id: 'invoices', label: 'Invoices', icon: DocumentDuplicateIcon, href: '/admin/payments' },
    { id: 'settings', label: 'Settings', icon: CogIcon, href: '/admin/settings' }
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'manage-users',
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: UserGroupIcon,
      href: '/admin/users',
      color: 'blue'
    },
    {
      id: 'review-offers',
      title: 'Review Offers',
      description: 'Approve pending sell offers',
      icon: ExclamationTriangleIcon,
      href: '/admin/offers',
      color: 'yellow'
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Generate financial reports',
      icon: ChartBarIcon,
      href: '/admin/reports',
      color: 'purple'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <UsersIcon className="w-5 h-5" />;
      case 'auction_created': return <TrophyIcon className="w-5 h-5" />;
      case 'item_sold': return <ShoppingBagIcon className="w-5 h-5" />;
      case 'offer_submitted': return <TagIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20';
      case 'error': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Manage your auction platform</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                {stats.pendingApprovals} Pending Approvals
              </div>
              {/* Removed Create Auction button */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (tab.id === 'overview') {
                          setActiveTab(tab.id);
                        } else {
                          router.push(tab.href);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === tab.id
                          ? 'bg-green-400/20 text-green-400 border border-green-400/30'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Users</p>
                          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                        </div>
                        <UsersIcon className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="mt-3 flex items-center text-sm">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400">+12%</span>
                        <span className="text-gray-400 ml-1">this month</span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Active Auctions</p>
                          <p className="text-2xl font-bold text-white">{stats.activeAuctions}</p>
                        </div>
                        <TrophyIcon className="w-8 h-8 text-green-400" />
                      </div>
                      <div className="mt-3 flex items-center text-sm">
                        <span className="text-yellow-400">+{stats.totalAuctions - stats.activeAuctions}</span>
                        <span className="text-gray-400 ml-1">completed</span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Revenue</p>
                          <p className="text-2xl font-bold text-white">R{(stats.totalRevenue || 0).toLocaleString()}</p>
                        </div>
                        <BanknotesIcon className="w-8 h-8 text-purple-400" />
                      </div>
                      <div className="mt-3 flex items-center text-sm">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400">+{stats.monthlyGrowth}%</span>
                        <span className="text-gray-400 ml-1">this month</span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Pending Offers</p>
                          <p className="text-2xl font-bold text-white">{stats.totalOffers}</p>
                        </div>
                        <GiftIcon className="w-8 h-8 text-yellow-400" />
                      </div>
                      <div className="mt-3 flex items-center text-sm">
                        <span className="text-red-400">{stats.pendingApprovals}</span>
                        <span className="text-gray-400 ml-1">need approval</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <motion.div
                            key={action.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(action.href)}
                            className="p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
                          >
                            <Icon className={`w-8 h-8 mb-3 text-${action.color}-400`} />
                            <h4 className="text-white font-medium mb-1">{action.title}</h4>
                            <p className="text-gray-400 text-sm">{action.description}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white">{activity.message}</p>
                            <p className="text-gray-400 text-sm">{new Date(activity.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Other tabs would be implemented similarly */}
              {activeTab !== 'overview' && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6 capitalize">{activeTab}</h3>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CogIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">This section is under development</p>
                    <p className="text-gray-500 text-sm">Advanced {activeTab} management coming soon</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
