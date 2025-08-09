// Admin Offers Page - Force Vercel Deployment Fix
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Offer {
  id: string;
  userEmail: string;
  itemName: string;
  description: string;
  category: string;
  estimatedValue: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/sell-item/admin/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
      } else {
        setError('Failed to fetch offers');
      }
    } catch (err) {
      setError('Error loading offers');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (offerId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/sell-item/admin/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`
        },
        body: JSON.stringify({ offerId, status: newStatus })
      });

      if (response.ok) {
        fetchOffers(); // Refresh the list
      } else {
        setError('Failed to update offer status');
      }
    } catch (err) {
      setError('Error updating offer');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Item Offers</h1>
          <p className="mt-2 text-gray-600">Manage submitted item offers</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No offers submitted yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{offer.itemName}</h3>
                    <p className="text-sm text-gray-500">From: {offer.userEmail}</p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(offer.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    offer.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {offer.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description:</p>
                    <p className="text-sm text-gray-600">{offer.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Category:</p>
                    <p className="text-sm text-gray-600">{offer.category}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Estimated Value:</p>
                    <p className="text-sm text-gray-600">R{(offer.estimatedValue || 0).toLocaleString()}</p>
                  </div>
                </div>

                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(offer.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(offer.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}