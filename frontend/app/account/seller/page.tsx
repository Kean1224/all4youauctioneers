'use client';

import React, { useEffect, useState } from 'react';
import { getToken } from '../../../utils/auth';

type SaleRecord = {
  id: string;
  auctionTitle: string;
  auctionId?: string;
  lotNumber: number;
  item: string;
  amount: number;
  buyer?: string;
  buyerEmail?: string;
  date: string;
  baseAmount?: number;
  sellerNet?: number;
};

export default function SellerInvoicesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [status, setStatus] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.email);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/seller/${encodeURIComponent(payload.email)}`)
        .then(res => res.json())
        .then(data => setSales(data));
    } catch {
      setUserEmail(null);
    }
  }, []);

  const handleDownload = () => {
    if (!userEmail) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/seller/${encodeURIComponent(userEmail)}/pdf`, '_blank');
  };

  const handleEmail = async () => {
    setStatus('Sending...');
    if (!sales.length) return setStatus('No invoices to email.');
    const auctionId = sales[0]?.auctionTitle || sales[0]?.auctionId;
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
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-700 mb-6">
        📦 My Sold Items
      </h1>

      {sales.length === 0 ? (
        <p className="text-gray-600">Loading sales data...</p>
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
                <th className="border px-3 py-2">Sale ID</th>
                <th className="border px-3 py-2">Auction</th>
                <th className="border px-3 py-2">Lot #</th>
                <th className="border px-3 py-2">Item</th>
                <th className="border px-3 py-2">Amount (R)</th>
                <th className="border px-3 py-2">Buyer</th>
                <th className="border px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{sale.id}</td>
                  <td className="border px-3 py-2">{sale.auctionTitle}</td>
                  <td className="border px-3 py-2">{sale.lotNumber}</td>
                  <td className="border px-3 py-2">{sale.item}</td>
                  <td className="border px-3 py-2 font-semibold">R{sale.amount}</td>
                  <td className="border px-3 py-2">{sale.buyer || sale.buyerEmail || '-'}</td>
                  <td className="border px-3 py-2">{sale.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
