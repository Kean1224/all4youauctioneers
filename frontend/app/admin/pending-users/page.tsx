'use client';

import { useState, useEffect } from 'react';
import AdminPageWrapper from '../../../components/AdminPageWrapper';
import { getApiUrl } from '../../../lib/api';

interface PendingUser {
  email: string;
  name: string;
  username: string;
  cell: string;
  createdAt: string;
  expiresAt: string;
  idDocument?: string;
  proofOfAddress?: string;
}

export default function PendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('admin_jwt');
      const response = await fetch(`${getApiUrl()}/api/users/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      } else {
        setError('Failed to fetch pending users');
      }
    } catch (err) {
      setError('Error fetching pending users');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async (email: string) => {
    setVerifying(email);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('admin_jwt');
      const response = await fetch(`${getApiUrl()}/api/users/${encodeURIComponent(email)}/verify-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess(`Successfully verified ${email}`);
        // Remove user from pending list
        setPendingUsers(pendingUsers.filter(user => user.email !== email));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to verify user');
      }
    } catch (err) {
      setError('Error verifying user');
      console.error('Error:', err);
    } finally {
      setVerifying(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <AdminPageWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">⏳ Pending Email Verifications</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-xl">✅ No pending email verifications</p>
              <p className="mt-2">All users have verified their email addresses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cell</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Registered</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expires</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">FICA Docs</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingUsers.map((user, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${isExpired(user.expiresAt) ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.username || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.cell || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(user.createdAt)}</td>
                      <td className={`px-4 py-3 text-sm ${isExpired(user.expiresAt) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                        {formatDate(user.expiresAt)}
                        {isExpired(user.expiresAt) && <span className="ml-2">⚠️ EXPIRED</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.idDocument && user.proofOfAddress ? '✅ Complete' : '⚠️ Incomplete'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => verifyUser(user.email)}
                          disabled={verifying === user.email}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          {verifying === user.email ? 'Verifying...' : 'Verify Email'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800">📧 About Email Verification:</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Users receive verification emails after registration</li>
              <li>• If they don't receive the email, you can manually verify them here</li>
              <li>• Verification links expire after 24 hours</li>
              <li>• After manual verification, users can login immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}