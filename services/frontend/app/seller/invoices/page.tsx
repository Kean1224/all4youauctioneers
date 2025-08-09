"use client";

import { useEffect, useState } from "react";

export default function SellerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");

  const fetchInvoices = async () => {
    if (!sellerEmail) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/seller/${encodeURIComponent(sellerEmail)}`);
      if (!res.ok) throw new Error("No invoices found");
      const data = await res.json();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!sellerEmail) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/seller/${encodeURIComponent(sellerEmail)}/pdf`, "_blank");
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-yellow-600">Seller Invoices</h1>
      <div className="mb-4 flex gap-2 items-center">
        <input
          type="email"
          placeholder="Enter your seller email"
          value={sellerEmail}
          onChange={e => setSellerEmail(e.target.value)}
          className="border px-3 py-2 rounded w-full"
        />
        <button
          onClick={fetchInvoices}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          View
        </button>
        <button
          onClick={downloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={!invoices.length}
        >
          Download PDF
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && invoices.length > 0 && (
        <table className="w-full border text-sm mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Auction</th>
              <th className="p-2">Lot</th>
              <th className="p-2">Item</th>
              <th className="p-2">Buyer</th>
              <th className="p-2">Sale Amount</th>
              <th className="p-2">Seller Net</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{inv.auctionTitle}</td>
                <td className="p-2">{inv.lotNumber}</td>
                <td className="p-2">{inv.item}</td>
                <td className="p-2">{inv.buyerEmail}</td>
                <td className="p-2">R{inv.baseAmount}</td>
                <td className="p-2">R{inv.sellerNet}</td>
                <td className="p-2">{new Date(inv.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !error && !invoices.length && (
        <p className="text-gray-500 mt-4">No invoices found for this seller.</p>
      )}
    </main>
  );
}
