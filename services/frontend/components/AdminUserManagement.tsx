'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface User {
  email: string;
  name: string;
  cell?: string;
  ficaApproved: boolean;
  suspended: boolean;
  registeredAt: string;
  idDocument?: string;
  proofOfAddress?: string;
  bankStatement?: string;
  rejectionReason?: string;
  idNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

interface RejectionModal {
  isOpen: boolean;
  user: User | null;
  reason: string;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectionModal, setRejectionModal] = useState<RejectionModal>({
    isOpen: false,
    user: null,
    reason: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (email: string) => {
    try {
      setActionLoading(email);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/fica/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectUser = async () => {
    if (!rejectionModal.user || !rejectionModal.reason.trim()) return;
    
    try {
      setActionLoading(rejectionModal.user.email);
      
      // Reject user with reason using dedicated endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/reject/${encodeURIComponent(rejectionModal.user.email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reason: rejectionModal.reason
        })
      });

      if (response.ok) {
        await fetchUsers();
        setRejectionModal({ isOpen: false, user: null, reason: '' });
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const viewDocuments = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const getFilteredUsers = () => {
    switch (filter) {
      case 'pending':
        return users.filter(user => !user.ficaApproved && !user.rejectionReason);
      case 'approved':
        return users.filter(user => user.ficaApproved);
      case 'rejected':
        return users.filter(user => !user.ficaApproved && user.rejectionReason);
      default:
        return users;
    }
  };

  const getStatusColor = (user: User) => {
    if (user.suspended) return 'text-gray-500 bg-gray-100';
    if (user.ficaApproved) return 'text-green-600 bg-green-100';
    if (user.rejectionReason) return 'text-red-600 bg-red-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getStatusText = (user: User) => {
    if (user.suspended) return 'Suspended';
    if (user.ficaApproved) return 'Approved';
    if (user.rejectionReason) return 'Rejected';
    return 'Pending';
  };

  const filteredUsers = getFilteredUsers();
  const pendingCount = users.filter(user => !user.ficaApproved && !user.rejectionReason).length;
  const approvedCount = users.filter(user => user.ficaApproved).length;
  const rejectedCount = users.filter(user => !user.ficaApproved && user.rejectionReason).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400">Review and manage user registrations</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-400">{approvedCount}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/10">
        {[
          { key: 'all', label: 'All Users', count: users.length },
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'approved', label: 'Approved', count: approvedCount },
          { key: 'rejected', label: 'Rejected', count: rejectedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.email} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{user.cell || 'N/A'}</div>
                    <div className="text-sm text-gray-400">{user.city || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
                      {getStatusText(user)}
                    </span>
                    {user.rejectionReason && (
                      <div className="text-xs text-red-400 mt-1 max-w-xs truncate">
                        {user.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewDocuments(user)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
                      
                      {!user.ficaApproved && !user.rejectionReason && (
                        <>
                          <button
                            onClick={() => approveUser(user.email)}
                            disabled={actionLoading === user.email}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.email ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                            ) : (
                              <CheckCircleIcon className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectionModal({ isOpen: true, user, reason: '' })}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      
                      {user.rejectionReason && (
                        <span className="text-xs text-gray-400 italic">Can re-upload documents</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserDetails && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUserDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">User Details</h3>
                  <button
                    onClick={() => setShowUserDetails(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedUser.name}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedUser.email}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedUser.cell || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">ID Number</label>
                      <div className="flex items-center gap-2">
                        <IdentificationIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedUser.idNumber || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                      <div className="flex items-center gap-2">
                        <HomeIcon className="w-4 h-4 text-gray-400" />
                        <div className="text-white">
                          {selectedUser.address ? (
                            <>
                              <div>{selectedUser.address}</div>
                              <div className="text-sm text-gray-400">{selectedUser.city}, {selectedUser.postalCode}</div>
                            </>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Registration Date</label>
                      <span className="text-white">{new Date(selectedUser.registeredAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border-t border-white/10 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">FICA Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'ID Document', file: selectedUser.idDocument },
                      { label: 'Proof of Address', file: selectedUser.proofOfAddress },
                      { label: 'Bank Statement', file: selectedUser.bankStatement }
                    ].map((doc) => (
                      <div
                        key={doc.label}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <DocumentIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-white">{doc.label}</span>
                        </div>
                        {doc.file ? (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">{doc.file}</p>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}/uploads/fica/${doc.file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm underline"
                            >
                              View Document
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-red-400">Not uploaded</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedUser.rejectionReason && (
                  <div className="mt-6 p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Rejection Reason</span>
                    </div>
                    <p className="text-red-300">{selectedUser.rejectionReason}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectionModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRejectionModal({ isOpen: false, user: null, reason: '' })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-md w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Reject User Registration</h3>
                <p className="text-gray-400 mb-4">
                  Please provide a reason for rejecting {rejectionModal.user?.name}'s registration.
                  They will be able to re-upload their documents.
                </p>
                
                <textarea
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., ID document is not clear, proof of address is outdated..."
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 resize-none"
                  rows={4}
                />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setRejectionModal({ isOpen: false, user: null, reason: '' })}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={rejectUser}
                    disabled={!rejectionModal.reason.trim() || actionLoading === rejectionModal.user?.email}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === rejectionModal.user?.email ? 'Rejecting...' : 'Reject User'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}