'use client';

import React, { useEffect, useState } from 'react';
import { getToken } from '../../../utils/auth';

type Invoice = {
  id: string;
  auctionTitle: string;
  auctionId?: string;
  lotNumber: number;
  item: string;
  amount: number;
  date: string;
  baseAmount?: number;
  sellerEmail?: string;
};

export default function BuyerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get user email from token (or however your app stores it)
    const token = getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.email);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/buyer/${encodeURIComponent(payload.email)}`)
        .then(res => res.json())
        .then(data => setInvoices(data));
    } catch {
      setUserEmail(null);
    }
  }, []);

  const handleDownload = () => {
    if (!userEmail) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/buyer/${encodeURIComponent(userEmail)}/pdf`, '_blank');
  };

  const handleEmail = async () => {
    setStatus('Sending...');
    if (!invoices.length) return setStatus('No invoices to email.');
    // Try to find auctionId from invoices (assume all from same auction or pick first)
    const auctionId = invoices[0]?.auctionTitle || invoices[0]?.auctionId;
    if (!auctionId) return setStatus('No auction ID found.');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/email-invoices/${encodeURIComponent(auctionId)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) setStatus('✅ Invoice(s) emailed!');
      else setStatus(`❌ ${data.error || 'Failed to email invoices.'}`);
    } catch {
      setStatus('❌ Failed to email invoices.');
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-700 mb-6">
        🧾 My Purchased Invoices
      </h1>

      {invoices.length === 0 ? (
        <p className="text-gray-600">Loading invoices...</p>
      ) : (
        <>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleDownload}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            >
              Download PDF
            </button>
            <button
              onClick={handleEmail}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
            >
              Email Me My Invoices
            </button>
            {status && <span className="ml-2 text-sm text-blue-700">{status}</span>}
          </div>
          <table className="w-full border-collapse text-sm shadow">
            <thead className="bg-yellow-100 text-gray-800">
              <tr>
                <th className="border px-3 py-2">Invoice ID</th>
                <th className="border px-3 py-2">Auction</th>
                <th className="border px-3 py-2">Lot #</th>
                <th className="border px-3 py-2">Item</th>
                <th className="border px-3 py-2">Amount (R)</th>
                <th className="border px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{inv.id}</td>
                  <td className="border px-3 py-2">{inv.auctionTitle}</td>
                  <td className="border px-3 py-2">{inv.lotNumber}</td>
                  <td className="border px-3 py-2">{inv.item}</td>
                  <td className="border px-3 py-2 font-semibold">R{inv.amount}</td>
                  <td className="border px-3 py-2">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
