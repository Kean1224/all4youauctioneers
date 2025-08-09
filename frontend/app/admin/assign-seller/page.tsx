'use client';

import { useEffect, useState } from 'react';
import ModernAdminLayout from '../../../components/ModernAdminLayout';

export default function AssignSellerPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`)
      .then(res => res.json())
      .then(setAuctions);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`)
      .then(res => res.json())
      .then(data => setUsers(data.filter((u: any) => u.role !== 'admin' && !u.suspended)));
  }, []);

  useEffect(() => {
    if (selectedAuctionId) {
      fetch(`/api/lots/${selectedAuctionId}`)
        .then(res => res.json())
        .then(setLots);
    } else {
      setLots([]);
    }
  }, [selectedAuctionId]);

  const handleAssign = async () => {
    if (!selectedAuctionId || !selectedLotId || !selectedSeller) return;
    setStatus('');
    const res = await fetch(`/api/lots/${selectedAuctionId}/${selectedLotId}/assign-seller`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerEmail: selectedSeller })
    });
    if (res.ok) {
      setStatus('✅ Seller assigned!');
      setLots(lots => lots.map(lot => lot.id === selectedLotId ? { ...lot, sellerEmail: selectedSeller } : lot));
    } else {
      setStatus('❌ Failed to assign seller');
    }
  };

  return (
    <ModernAdminLayout>
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-extrabold mb-8 text-green-400 drop-shadow">Assign Seller to Lot</h1>
        <div className="space-y-6 bg-gradient-to-br from-green-950 via-green-900 to-black p-8 rounded-2xl shadow-xl border border-green-900 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-green-200">Auction</label>
              <select value={selectedAuctionId} onChange={e => { setSelectedAuctionId(e.target.value); setSelectedLotId(''); }} className="w-full border border-green-800 bg-green-950 text-green-100 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-400">
                <option key="default-auction" value="">-- Select Auction --</option>
                {auctions.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-green-200">Lot</label>
              <select value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)} className="w-full border border-green-800 bg-green-950 text-green-100 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-400" disabled={!selectedAuctionId}>
                <option key="default-lot" value="">-- Select Lot --</option>
                {lots.map(lot => <option key={lot.id} value={lot.id}>Lot {lot.lotNumber || '?'}: {lot.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-green-200">Seller</label>
              <select value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} className="w-full border border-green-800 bg-green-950 text-green-100 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-400" disabled={!selectedLotId}>
                <option key="default-seller" value="">-- Select Seller --</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAssign} className="bg-gradient-to-r from-green-500 to-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:from-green-600 hover:to-green-800 transition-all mt-2" disabled={!selectedAuctionId || !selectedLotId || !selectedSeller}>Assign Seller</button>
          {status && <div className="mt-2 text-sm font-semibold text-green-300">{status}</div>}
        </div>
        <div className="bg-gradient-to-br from-green-950 via-green-900 to-black p-8 rounded-2xl shadow-xl border border-green-900">
          <h2 className="text-2xl font-bold mb-4 text-green-400">Current Assignments</h2>
          {lots.length === 0 ? <p className="text-green-300">No lots found.</p> : (
            <ul className="space-y-3">
              {lots.map(lot => (
                <li key={lot.id} className="border-b border-green-800 pb-3 flex justify-between items-center">
                  <span className="text-green-100 font-semibold">Lot {lot.lotNumber || '?'}: {lot.title}</span>
                  <span className="text-xs text-green-400">Seller: {lot.sellerEmail || <span className="text-red-400">Unassigned</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModernAdminLayout>
  );
}
