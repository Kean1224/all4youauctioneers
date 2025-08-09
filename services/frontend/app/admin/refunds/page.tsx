"use client";

import { useEffect, useState } from "react";
import AdminPageWrapper from '../../../components/AdminPageWrapper';

interface RefundRequest {
  auctionId: string;
  email: string;
  status: string;
  requestedAt: string;
  updatedAt?: string;
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState<string>("");

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_jwt');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/refunds/`, {
      credentials: 'include',
      headers: {
        'Authorization': adminToken ? `Bearer ${adminToken}` : ''
      }
    })
      .then(res => res.json())
      .then(data => {
        setRefunds(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load refund requests.");
        setLoading(false);
      });
  }, []);

  const handleUpdate = async (auctionId: string, email: string, status: string) => {
    setActionStatus("");
    try {
      const adminToken = localStorage.getItem('admin_jwt');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/refunds/${auctionId}/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': adminToken ? `Bearer ${adminToken}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRefunds(refunds => refunds.map(r => r.auctionId === auctionId && r.email === email ? { ...r, status } : r));
        setActionStatus("✅ Updated");
      } else {
        setActionStatus("❌ Failed to update");
      }
    } catch {
      setActionStatus("❌ Failed to update");
    }
  };

  return (
    <AdminPageWrapper>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-yellow-700">Deposit Refund Requests</h1>
        
        {/* Security Notice */}
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-red-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">High Security Financial Operations</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All refund operations are logged with full audit trail</li>
                <li>Financial transactions require admin authentication</li>
                <li>Unauthorized access attempts are automatically flagged</li>
              </ul>
            </div>
          </div>
        </div>
      {loading ? <p>Loading...</p> : error ? <p className="text-red-600">{error}</p> : (
        <table className="w-full border text-sm bg-white rounded shadow">
          <thead>
            <tr className="bg-yellow-100">
              <th className="p-2">Auction ID</th>
              <th className="p-2">Buyer Email</th>
              <th className="p-2">Status</th>
              <th className="p-2">Requested At</th>
              <th className="p-2">Updated At</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r, idx) => (
              <tr key={r.auctionId + r.email + idx} className="border-t">
                <td className="p-2">{r.auctionId}</td>
                <td className="p-2">{r.email}</td>
                <td className="p-2 font-bold">{r.status}</td>
                <td className="p-2">{new Date(r.requestedAt).toLocaleString()}</td>
                <td className="p-2">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td>
                <td className="p-2">
                  {r.status === 'pending' && (
                    <>
                      <button className="bg-green-600 text-white px-2 py-1 rounded mr-2 hover:bg-green-700" onClick={() => handleUpdate(r.auctionId, r.email, 'approved')}>Approve</button>
                      <button className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" onClick={() => handleUpdate(r.auctionId, r.email, 'rejected')}>Reject</button>
                    </>
                  )}
                  {r.status !== 'pending' && <span className="text-gray-500">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {actionStatus && <p className="mt-4 text-blue-700">{actionStatus}</p>}
      </main>
    </AdminPageWrapper>
  );
}
