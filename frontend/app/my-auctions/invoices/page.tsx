"use client";

import React, { useEffect, useState } from "react";

// Helper to get token from localStorage (if needed)
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Types for invoices
interface Invoice {
  id: string;
  auctionTitle: string;
  auctionId?: string;
  lotNumber: number;
  item: string;
  amount: number;
  date: string;
  baseAmount?: number;
  sellerEmail?: string;
  buyerEmail?: string;
  sellerNet?: number;
  depositRequired?: boolean;
  depositAmount?: number;
}
// Helper to request deposit refund
async function requestRefund(auctionId: string, email: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/refunds/${auctionId}/${encodeURIComponent(email)}`, {
    method: 'POST',
  });
  return res.json();
}

// Group invoices by auction
function groupByAuction(invoices: Invoice[]) {
  const grouped: { [auction: string]: Invoice[] } = {};
  invoices.forEach(inv => {
    const key = inv.auctionTitle || inv.auctionId || "Unknown Auction";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(inv);
  });
  return grouped;
}

export default function MyAuctionsInvoicesPage() {
  const [buyerInvoices, setBuyerInvoices] = useState<Invoice[]>([]);
  const [sellerInvoices, setSellerInvoices] = useState<Invoice[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserEmail(payload.email);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/buyer/${encodeURIComponent(payload.email)}`)
        .then(res => res.json())
        .then(data => setBuyerInvoices(data));
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/seller/${encodeURIComponent(payload.email)}`)
        .then(res => res.json())
        .then(data => setSellerInvoices(data));
    } catch {
      setUserEmail(null);
    }
  }, []);

  // Download PDF for a specific auction
  const handleDownload = (type: "buyer" | "seller", auction: string) => {
    if (!userEmail) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${type}/${encodeURIComponent(userEmail)}/auction/${encodeURIComponent(auction)}/pdf`, "_blank");
  };

  // Email all invoices for a specific auction
  const handleEmail = async (auction: string) => {
    setStatus("Sending...");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/email-invoices/${encodeURIComponent(auction)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) setStatus("✅ Invoice(s) emailed!");
      else setStatus(`❌ ${data.error || "Failed to email invoices."}`);
    } catch {
      setStatus("❌ Failed to email invoices.");
    }
  };

  // Render invoice table with grand total and refund button for buyers
  function renderTable(invoices: Invoice[], type: "buyer" | "seller") {
    if (!invoices.length) return <p className="text-gray-500">No invoices found.</p>;
    const grouped = groupByAuction(invoices);
    return (
      <div>
        {Object.entries(grouped).map(([auction, items]) => {
          const grandTotal = type === "buyer"
            ? items.reduce((sum, inv) => sum + (inv.amount || 0), 0)
            : items.reduce((sum, inv) => sum + (inv.sellerNet || 0), 0);
          // Use auctionId from first invoice in group
          const auctionId = items[0]?.auctionId;
          return (
            <section key={auction} className="mb-8 bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-yellow-700">{auction}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(type, auction)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Download PDF</button>
                  <button onClick={() => handleEmail(auction)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Email</button>
                  {type === "buyer" && auctionId && (
                    <RequestRefundButton auctionId={auctionId} userEmail={userEmail} />
                  )}
                </div>
              </div>
              <table className="w-full border text-sm mt-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">Lot</th>
                    <th className="p-2">Item</th>
                    {type === "buyer" ? <th className="p-2">Seller</th> : <th className="p-2">Buyer</th>}
                    <th className="p-2">Base Amount</th>
                    {type === "buyer" ? <th className="p-2">Total Paid (10% fee)</th> : <th className="p-2">Seller Net (15% commission)</th>}
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((inv, idx) => (
                    <tr key={inv.id || idx} className="border-t">
                      <td className="p-2">{inv.lotNumber}</td>
                      <td className="p-2">{inv.item}</td>
                      {type === "buyer"
                        ? <td className="p-2">{inv.sellerEmail}</td>
                        : <td className="p-2">{inv.buyerEmail}</td>}
                      <td className="p-2">R{inv.baseAmount}</td>
                      {type === "buyer"
                        ? <td className="p-2">R{inv.amount}</td>
                        : <td className="p-2">R{inv.sellerNet}</td>}
                      <td className="p-2">{new Date(inv.date).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-yellow-100">
                    <td colSpan={type === "buyer" ? 5 : 5} className="p-2 text-right">Grand Total:</td>
                    <td className="p-2">R{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    );
  }
// Refund button component
function RequestRefundButton({ auctionId, userEmail }: { auctionId: string, userEmail: string | null }) {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  if (!userEmail) return null;
  const handleRefund = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await requestRefund(auctionId, userEmail);
      if (res.error) setStatus("❌ " + res.error);
      else setStatus("✅ Refund requested!");
    } catch {
      setStatus("❌ Failed to request refund.");
    }
    setLoading(false);
  };
  return (
    <button
      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
      onClick={handleRefund}
      disabled={loading}
    >
      {loading ? "Requesting..." : "Request Refund"}
      {status && <span className="ml-2 text-xs">{status}</span>}
    </button>
  );
}

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-yellow-600">My Auctions & Invoices</h1>
      {status && <p className="mb-4 text-blue-700">{status}</p>}
      <h2 className="text-xl font-semibold mb-2">Buyer Invoices</h2>
      {renderTable(buyerInvoices, "buyer")}
      <h2 className="text-xl font-semibold mt-8 mb-2">Seller Invoices</h2>
      {renderTable(sellerInvoices, "seller")}
    </main>
  );
}
