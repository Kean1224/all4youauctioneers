'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/AdminSidebar';
import ModernAdminLayout from '../../../components/ModernAdminLayout';

type Lot = {
  id: string;
  title: string;
  description: string;
  image?: string;
  startPrice: number;
  currentBid?: number;
  endTime?: string;
  sellerEmail?: string;
  lotNumber?: number;
  condition?: string;
  status?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  suspended: boolean;
};

type Auction = {
  id: string;
  title: string;
  lots: Lot[];
};

export default function AdminLotsPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    startPrice: '',
    bidIncrement: '',
    endTime: '',
    image: null as File | null,
    sellerEmail: '',
    sellerSearch: '',
    condition: 'Good',
  });

  // Helper to get admin auth headers
  const getAdminHeaders = () => {
    const token = localStorage.getItem('admin_jwt');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem('admin_jwt');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    // Verify token client-side
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin' || !payload.email || !payload.exp || Date.now() / 1000 > payload.exp) {
        router.push('/admin/login');
        return;
      }
    } catch {
      router.push('/admin/login');
      return;
    }

    fetchAuctions();
    fetchUsers();
  }, [router]);

  const fetchAuctions = async () => {
    try {
      // Fetch all auctions (both active and completed for admin view)
      const headers = getAdminHeaders();
      const [activeResponse, pastResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions/past`, { headers })
      ]);
      
      let allAuctions: Auction[] = [];
      
      if (activeResponse.ok) {
        const activeAuctions = await activeResponse.json();
        if (Array.isArray(activeAuctions)) {
          allAuctions = [...allAuctions, ...activeAuctions];
        }
      } else if (activeResponse.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      if (pastResponse.ok) {
        const pastAuctions = await pastResponse.json();
        if (Array.isArray(pastAuctions)) {
          allAuctions = [...allAuctions, ...pastAuctions];
        }
      } else if (pastResponse.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      // Sort by creation date (newest first)
      allAuctions.sort((a: any, b: any) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      setAuctions(allAuctions);
      console.log('Fetched auctions with lots:', allAuctions);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setAuctions([]);
      alert('Failed to fetch auctions');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: getAdminHeaders()
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error(`Failed to fetch users: ${res.status}`);
      }
      const data = await res.json();
      // Show ALL users for admin (including suspended users, but exclude other admins)
      if (Array.isArray(data)) {
        setUsers(data.filter((u: User) => u.role !== 'admin'));
        console.log('Fetched all registered users:', data.length);
      } else {
        console.warn('Users data is not an array:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuctionId || !form.title || !form.startPrice || !form.bidIncrement) {
      alert('Please fill in all required fields (Auction, Title, Start Price, Bid Increment)');
      return;
    }

    if (parseFloat(form.startPrice) <= 0) {
      alert('Start price must be greater than 0');
      return;
    }

    if (parseFloat(form.bidIncrement) <= 0) {
      alert('Bid increment must be greater than 0');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('startPrice', form.startPrice);
      formData.append('bidIncrement', form.bidIncrement);
      if (form.endTime) formData.append('endTime', form.endTime);
      if (form.image) formData.append('image', form.image);

      if (form.sellerEmail) {
        formData.append('sellerEmail', form.sellerEmail);
      }
      if (form.condition) {
        formData.append('condition', form.condition);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lots/${selectedAuctionId}`, {
        method: 'POST',
        headers: {
          ...(localStorage.getItem('admin_jwt') && { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` })
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        const errorData = await response.json();
        alert(`Failed to create lot: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const newLot = await response.json();
      const endTimeMessage = newLot.endTime ? `\nEnd Time: ${new Date(newLot.endTime).toLocaleString()}` : '';
      alert(`✅ Lot "${form.title}" successfully added to auction!\n\nLot Number: ${newLot.lotNumber}\nStart Price: R${newLot.startPrice}\nBid Increment: R${newLot.bidIncrement || 10}${endTimeMessage}`);

      setForm({
        title: '',
        description: '',
        startPrice: '',
        bidIncrement: '',
        endTime: '',
        image: null,
        sellerEmail: '',
        sellerSearch: '',
        condition: 'Good',
      });
      
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await fetchAuctions();
    } catch (error) {
      console.error('Error creating lot:', error);
      alert('Network error occurred while creating lot');
    }
  };

  const handleDelete = async (auctionId: string, lotId: string, lotNumber?: number, auctionTitle?: string) => {
    const message = `Are you sure you want to delete Lot${lotNumber ? ' ' + lotNumber : ''} from Auction${auctionTitle ? ' \'' + auctionTitle + '\'' : ''}?`;
    if (!confirm(message)) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lots/${auctionId}/${lotId}`, { 
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      if (!response.ok) {
        alert('Failed to delete lot');
        return;
      }
      
      fetchAuctions();
    } catch (error) {
      console.error('Error deleting lot:', error);
      alert('Network error occurred while deleting lot');
    }
  };

  return (
    <ModernAdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-green-700">Lot Management</h1>

        <div className="bg-white border border-green-200 rounded-lg p-4 mb-6 shadow-sm">
          <h2 className="font-semibold text-green-700 mb-2">📅 Lot Timing Information</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Automatic timing:</strong> Lots end 1 minute apart automatically</li>
            <li>• <strong>First lot:</strong> Ends 5 minutes after creation</li>
            <li>• <strong>Subsequent lots:</strong> Each ends 1 minute after the previous lot</li>
            <li>• <strong>Custom timing:</strong> You can override by setting a specific end time</li>
          </ul>
        </div>

        {/* Add New Lot Form */}
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl shadow space-y-4 mb-10 border border-green-200">
          <div className="md:grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-green-700">Assign Seller</label>
              <input
                type="text"
                placeholder="Search seller by name or email"
                value={form.sellerSearch}
                onChange={e => setForm({ ...form, sellerSearch: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <select
                value={form.sellerEmail}
                onChange={e => {
                  setForm({ ...form, sellerEmail: e.target.value });
                  e.target.blur();
                }}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              >
                <option key="no-seller" value="">No seller (admin-owned)</option>
                {users
                  .filter(u =>
                    u.name.toLowerCase().includes(form.sellerSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(form.sellerSearch.toLowerCase())
                  )
                  .map(u => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email}) {u.suspended ? '🚫 SUSPENDED' : '✅ ACTIVE'}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Shows all registered users. Suspended users are marked with 🚫
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700">Select Auction</label>
              <select
                required
                value={selectedAuctionId}
                onChange={e => {
                  setSelectedAuctionId(e.target.value);
                  e.target.blur();
                }}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              >
                <option key="choose-auction" value="">-- Choose --</option>
                {auctions.map(auction => (
                  <option key={auction.id} value={auction.id}>{auction.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-green-700">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              />
            </div>
          </div>
          <div className="md:grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-green-700">Start Price (R)</label>
              <input
                type="number"
                required
                value={form.startPrice}
                onChange={e => setForm({ ...form, startPrice: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700">Bid Increment (R)</label>
              <input
                type="number"
                required
                min={1}
                value={form.bidIncrement}
                onChange={e => setForm({ ...form, bidIncrement: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
                placeholder="e.g. 10, 50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700">End Time (optional)</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              />
            </div>
          </div>
          <div className="md:grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-green-700">Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm({ ...form, image: e.target.files?.[0] || null })}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700">Condition</label>
              <select
                required
                value={form.condition}
                onChange={e => {
                  setForm({ ...form, condition: e.target.value });
                  e.target.blur();
                }}
                className="w-full border border-green-300 bg-white text-gray-900 px-4 py-2 rounded"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold">
            ➕ Add Lot
          </button>
        </form>

        {/* View Lots per Auction */}
        <div className="space-y-8">
          {auctions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No auctions found. Create an auction first.</p>
          ) : (
            auctions.map(auction => (
              <div key={auction.id} className="bg-white p-6 rounded-xl shadow-md border border-green-200">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-green-700">{auction.title}</h2>
                    <p className="text-sm text-gray-500">Auction ID: {auction.id}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {auction.lots?.length || 0} lots
                  </span>
                </div>

                {!auction.lots || auction.lots.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-400 mb-2">No lots in this auction yet.</p>
                    <p className="text-sm text-gray-500">Add lots using the form above.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {auction.lots.map((lot, index) => (
                      <div key={lot.id} className="border border-green-200 rounded-xl p-4 bg-white flex flex-col justify-between h-full shadow-sm">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                              LOT {lot.lotNumber || index + 1}
                            </span>
                            <h3 className="font-semibold text-lg text-gray-900">{lot.title}</h3>
                          </div>

                          {lot.description && (
                            <p className="text-gray-700 mb-1">{lot.description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-green-700">Start Price:</span>
                              <p className="text-green-700 font-bold">R{(lot.startPrice || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="font-medium text-green-700">Current Bid:</span>
                              <p className="text-green-600 font-bold">R{(lot.currentBid || lot.startPrice || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="font-medium text-green-700">Condition:</span>
                              <p className="text-gray-900">{lot.condition || 'Good'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-green-700">Status:</span>
                              <p className={`font-medium ${lot.status === 'ended' ? 'text-red-500' : 'text-green-700'}`}>
                                {lot.status === 'ended' ? '🔚 Ended' : '🟢 Active'}
                              </p>
                            </div>
                          </div>

                          {lot.sellerEmail && (
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-medium">Seller:</span> {lot.sellerEmail}
                            </p>
                          )}

                          {lot.endTime && (
                            <p className="text-xs text-gray-500 mt-1">
                              <span className="font-medium">End Time:</span> {new Date(lot.endTime).toLocaleString()}
                              {index > 0 && (
                                <span className="ml-2 text-green-700">
                                  📅 +{index} min from first lot
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 mt-2">
                          {lot.image && (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}${lot.image}`}
                              alt={lot.title}
                              className="w-24 h-20 object-cover rounded border border-green-200 bg-white"
                            />
                          )}
                          <button
                            onClick={() => handleDelete(auction.id, lot.id, lot.lotNumber, auction.title)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors font-semibold mt-2"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ModernAdminLayout>
  );
}
