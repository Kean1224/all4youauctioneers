'use client';

import React, { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';

interface PendingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  reserve: number;
  condition: string;
  sellerEmail: string;
  imageUrl: string;
  status: string;
  createdAt: string;
}

export default function CreateAuctionPage() {
  const [form, setForm] = useState({
    title: '',
    location: '',
    startTime: '',
    endTime: '',
    increment: 10,
    depositRequired: false,
    depositAmount: 0,
    description: ''
  });
  const [auctionImage, setAuctionImage] = useState<File | null>(null);

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [lotSettings, setLotSettings] = useState<{[key: string]: { startBid: number, lotEndTime: string, images: File[], bidIncrement: number }}>({});
  const [isCreating, setIsCreating] = useState(false);

  // Helper to get admin auth headers
  // For testing: do not send Authorization header
  const getAdminHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // Fetch pending items that can be assigned to auctions
  const fetchPendingItems = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pending-items`, {
        headers: getAdminHeaders()
      });
      
      if (response.ok) {
        const items = await response.json();
        // Only show approved items that aren't already assigned to auctions
        const availableItems = items.filter((item: PendingItem) => 
          item.status === 'approved' || item.status === 'pending'
        );
        setPendingItems(availableItems);
      }
    } catch (error) {
      console.error('Error fetching pending items:', error);
    }
  };

  useEffect(() => {
    fetchPendingItems();
  }, []);

  // Handle lot selection
  const toggleLotSelection = (itemId: string) => {
    setSelectedLots(prev => {
      if (prev.includes(itemId)) {
        const newSelected = prev.filter(id => id !== itemId);
        // Remove lot settings for deselected item
        const newSettings = { ...lotSettings };
        delete newSettings[itemId];
        setLotSettings(newSettings);
        return newSelected;
      } else {
        const newSelected = [...prev, itemId];
        // Initialize lot settings for newly selected item
        const item = pendingItems.find(i => i.id === itemId);
        if (item) {
          setLotSettings(prev => ({
            ...prev,
            [itemId]: {
              startBid: item.reserve || 10,
              lotEndTime: form.endTime,
              images: [],
              bidIncrement: form.increment || 10
            }
          }));
        }
        return newSelected;
      }
    });
  };

  // Update individual lot settings
  const updateLotSetting = (itemId: string, key: string, value: any) => {
    setLotSettings(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [key]: value
      }
    }));
  };

  // Generate staggered end times for lots
  const generateStaggeredTimes = () => {
    if (selectedLots.length === 0 || !form.endTime) return;

    const baseEndTime = new Date(form.endTime);
    const intervalMinutes = 15; // 15 minutes between lot endings

    const newSettings = { ...lotSettings };
    selectedLots.forEach((lotId, index) => {
      const lotEndTime = new Date(baseEndTime.getTime() + (index * intervalMinutes * 60000));
      newSettings[lotId] = {
        ...newSettings[lotId],
        lotEndTime: lotEndTime.toISOString().slice(0, 16), // Format for datetime-local input
        images: newSettings[lotId]?.images || [],
        bidIncrement: newSettings[lotId]?.bidIncrement || form.increment || 10
      };
    });
    setLotSettings(newSettings);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Create FormData for auction
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      if (auctionImage) {
        formData.append('auctionImage', auctionImage);
      }

      const auctionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`, {
        method: 'POST',
        body: formData,
      });

      if (!auctionResponse.ok) {
        const errorData = await auctionResponse.json();
        throw new Error(errorData.error || 'Failed to create auction');
      }

      const auctionData = await auctionResponse.json();
      const auctionId = auctionData.id;

      // Now assign selected lots to the auction
      for (const itemId of selectedLots) {
        const item = pendingItems.find(i => i.id === itemId);
        const settings = lotSettings[itemId];

        if (item && settings) {
          // Create FormData for lot with multiple images
          const lotFormData = new FormData();
          lotFormData.append('title', item.title);
          lotFormData.append('description', item.description);
          lotFormData.append('category', item.category);
          lotFormData.append('condition', item.condition);
          lotFormData.append('startBid', settings.startBid.toString());
          lotFormData.append('bidIncrement', settings.bidIncrement.toString());
          lotFormData.append('endTime', settings.lotEndTime);
          lotFormData.append('sellerEmail', item.sellerEmail);
          lotFormData.append('sourceItemId', item.id);
          
          // Add existing image if available
          if (item.imageUrl) {
            lotFormData.append('existingImageUrl', item.imageUrl);
          }
          
          // Add multiple images
          settings.images.forEach((image, index) => {
            lotFormData.append(`images`, image);
          });

          const lotResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lots/${auctionId}`, {
            method: 'POST',
            body: lotFormData, // Send as FormData instead of JSON
          });

          if (!lotResponse.ok) {
            console.error(`Failed to add lot ${item.title} to auction`);
          }
        }
      }

      alert(`✅ Auction "${form.title}" created successfully with ${selectedLots.length} lots!`);

      // Reset form
      setForm({ 
        title: '', 
        location: '', 
        startTime: '', 
        endTime: '', 
        increment: 10, 
        depositRequired: false, 
        depositAmount: 0,
        description: '' 
      });
      setAuctionImage(null);
      setSelectedLots([]);
      setLotSettings({});
      
      // Clean up any object URLs to prevent memory leaks
      Object.values(lotSettings).forEach(setting => {
        setting.images?.forEach(image => {
          URL.revokeObjectURL(URL.createObjectURL(image));
        });
      });

      // Refresh pending items
      fetchPendingItems();

    } catch (error) {
      console.error('Error creating auction:', error);
      alert(`❌ Failed to create auction: ${(error as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-yellow-600">🏛️ Create New Auction</h1>

          <form onSubmit={handleCreate} className="space-y-8">
            {/* Auction Details */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">📋 Auction Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auction Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="e.g., Monthly Estate Auction"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auction Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setAuctionImage(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload an image for the auction (optional)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="e.g., Cape Town Auction House"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">When bidding begins for the auction</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lots will be staggered after this time</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bid Increment (R) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.increment}
                    onChange={e => setForm({ ...form, increment: Number(e.target.value) })}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.depositRequired}
                      onChange={e => setForm({ ...form, depositRequired: e.target.checked })}
                      className="rounded text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Deposit</span>
                  </label>
                  {form.depositRequired && (
                    <input
                      type="number"
                      min={0}
                      value={form.depositAmount}
                      onChange={e => setForm({ ...form, depositAmount: Number(e.target.value) })}
                      placeholder="Amount (R)"
                      className="border border-gray-300 px-3 py-2 rounded-lg w-32 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description for the auction..."
                />
              </div>
            </div>

            {/* Lot Assignment */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">🎯 Assign Lots to Auction</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateStaggeredTimes}
                    disabled={selectedLots.length === 0}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                  >
                    ⏰ Auto-stagger Times
                  </button>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium">
                    {selectedLots.length} lots selected
                  </span>
                </div>
              </div>
              
              {pendingItems.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending items available for auction assignment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingItems.map(item => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${ 
                        selectedLots.includes(item.id) 
                          ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleLotSelection(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedLots.includes(item.id)}
                          onChange={() => toggleLotSelection(item.id)}
                          className="mt-1 rounded text-yellow-500 focus:ring-yellow-500"
                        />
                        <div className="flex-1 min-w-0">
                          {item.imageUrl && (
                            <img 
                              src={`${process.env.NEXT_PUBLIC_API_URL}${item.imageUrl}`}
                              alt={item.title}
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                          )}
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">{item.category}</p>
                          <p className="text-xs text-gray-500">Reserve: R{item.reserve}</p>
                          <p className="text-xs text-gray-500">Seller: {item.sellerEmail}</p>
                        </div>
                      </div>
                      
                      {selectedLots.includes(item.id) && lotSettings[item.id] && (
                        <div className="mt-3 pt-3 border-t border-yellow-200 space-y-2" onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Start Bid (R)</label>
                            <input
                              type="number"
                              min="1"
                              value={lotSettings[item.id].startBid}
                              onChange={e => updateLotSetting(item.id, 'startBid', Number(e.target.value))}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:ring-1 focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Lot End Time</label>
                            <input
                              type="datetime-local"
                              value={lotSettings[item.id].lotEndTime}
                              onChange={e => updateLotSetting(item.id, 'lotEndTime', e.target.value)}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:ring-1 focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Bid Increment (R)</label>
                            <input
                              type="number"
                              min="1"
                              value={lotSettings[item.id].bidIncrement}
                              onChange={e => updateLotSetting(item.id, 'bidIncrement', Number(e.target.value))}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:ring-1 focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Lot Images</label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={e => {
                                if (e.target.files) {
                                  const newImages = Array.from(e.target.files);
                                  const currentImages = lotSettings[item.id].images || [];
                                  updateLotSetting(item.id, 'images', [...currentImages, ...newImages]);
                                }
                              }}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:ring-1 focus:ring-yellow-500 mb-2"
                            />
                            <p className="text-xs text-gray-500 mb-2">Upload multiple images for this lot</p>
                            
                            {/* Image Preview */}
                            {lotSettings[item.id].images && lotSettings[item.id].images.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {lotSettings[item.id].images.map((image, idx) => (
                                  <div key={idx} className="relative">
                                    <img
                                      src={URL.createObjectURL(image)}
                                      alt={`Preview ${idx + 1}`}
                                      className="w-full h-20 object-cover rounded border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newImages = lotSettings[item.id].images.filter((_, i) => i !== idx);
                                        updateLotSetting(item.id, 'images', newImages);
                                      }}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="bg-white p-6 rounded-lg shadow">
              <button 
                type="submit" 
                disabled={isCreating || !form.title || !form.startTime || !form.endTime}
                className="w-full bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
              >
                {isCreating ? '🔄 Creating Auction...' : `🏛️ Create Auction with ${selectedLots.length} Lots`}
              </button>
              
              {selectedLots.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-2">
                  You can create an auction without lots and add them later
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
