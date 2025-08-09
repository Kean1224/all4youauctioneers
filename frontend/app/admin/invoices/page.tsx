'use client';


import React, { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import ModernAdminLayout from '../../../components/ModernAdminLayout';

type Invoice = {
  id: string;
  auctionTitle: string;
  lotNumber: number;
  item: string;
  baseAmount: number;
  amount: number;
  sellerNet: number;
  buyerEmail: string;
  sellerEmail: string;
  date: string;
  paid?: boolean;
};
import { useRouter } from 'next/navigation';
function AdminInvoicesPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('admin_jwt');
    if (!token) {
      router.push('/admin/login');
      return;
    }
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
    fetchInvoices();
  }, [router]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('');
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice|null>(null);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/admin/all`);
      const data = await res.json();
      // data shape: { invoices, stats }
      const invoicesArr = Array.isArray(data.invoices) ? data.invoices : [];
      // For demo, add paid:false if missing, and map to Invoice type
      const withPaid = invoicesArr.map((inv: any) => ({
        id: inv.id || inv.invoiceNumber || '',
        auctionTitle: inv.auctionTitle || '',
        lotNumber: inv.lotNumber || 0,
        item: inv.item || inv.description || '',
        baseAmount: inv.baseAmount || inv.amount || inv.total || 0,
        amount: inv.amount || inv.total || 0,
        sellerNet: inv.sellerNet || 0,
        buyerEmail: inv.buyerEmail || inv.userEmail || '',
        sellerEmail: inv.sellerEmail || '',
        date: inv.createdAt || '',
        paid: inv.status === 'paid' || inv.paid || false,
      }));
      setInvoices(withPaid);
      setFiltered(withPaid);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  const handleFilter = () => {
    const term = filter.trim().toLowerCase();
    if (!term) return setFiltered(invoices);

    const result = invoices.filter(
      inv =>
        inv.buyerEmail.toLowerCase().includes(term) ||
        inv.sellerEmail.toLowerCase().includes(term)
    );
    setFiltered(result);
  };

  return (
    <ModernAdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-green-400 mb-6">Invoice Overview</h1>

        {/* Filter */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by buyer or seller email..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-green-800 bg-green-950 text-green-100 px-4 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={handleFilter}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-semibold"
          >
            Filter
          </button>
        </div>

        {/* Invoice Table */}
        <div className="overflow-auto bg-green-950/60 p-4 rounded-xl shadow border border-green-900">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-green-900/80 text-xs uppercase text-green-300">
                <th className="p-2 rounded-l-xl">Auction</th>
                <th className="p-2">Lot</th>
                <th className="p-2">Item</th>
                <th className="p-2">Buyer Total</th>
                <th className="p-2">Buyer</th>
                <th className="p-2">Seller</th>
                <th className="p-2">Paid</th>
                <th className="p-2 rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-4 text-green-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr key={inv.id} className="bg-green-950/80 border border-green-900 rounded-xl shadow-sm">
                    <td className="p-2 text-green-100 font-semibold">{inv.auctionTitle}</td>
                    <td className="p-2 text-green-200">{inv.lotNumber}</td>
                    <td className="p-2 text-green-200">{inv.item}</td>
                    <td className="p-2 font-bold text-green-400">R{inv.amount.toFixed(2)}</td>
                    <td className="p-2 text-green-200">{inv.buyerEmail}</td>
                    <td className="p-2 text-green-200">{inv.sellerEmail}</td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={!!inv.paid}
                        onChange={async () => {
                          if (!inv.paid) {
                            // Mark as paid in backend (admin endpoint)
                            try {
                              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/admin/${inv.id}/mark-paid`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({}),
                              });
                              if (!res.ok) throw new Error('Failed to update');
                              setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, paid: true } : i));
                              setFiltered(prev => prev.map(i => i.id === inv.id ? { ...i, paid: true } : i));
                            } catch (err) {
                              alert('Failed to mark as paid.');
                            }
                          }
                        }}
                        className="accent-green-500"
                      />
                      <span className={inv.paid ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {inv.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        className="text-green-300 underline text-xs hover:text-green-400"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-green-950/90 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-green-900 relative">
              <button
                className="absolute top-2 right-2 text-green-400 hover:text-green-200 text-2xl font-bold"
                onClick={() => setSelectedInvoice(null)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-4 text-green-400">Invoice Details</h2>
              <div className="space-y-2 text-sm text-green-200">
                <div><b>Auction:</b> {selectedInvoice.auctionTitle}</div>
                <div><b>Lot:</b> {selectedInvoice.lotNumber}</div>
                <div><b>Item:</b> {selectedInvoice.item}</div>
                <div><b>Buyer:</b> {selectedInvoice.buyerEmail}</div>
                <div><b>Seller:</b> {selectedInvoice.sellerEmail}</div>
                <div><b>Date:</b> {new Date(selectedInvoice.date).toLocaleString()}</div>
                <div><b>Base Amount:</b> R{selectedInvoice.baseAmount.toFixed(2)}</div>
                <div><b>Buyer Total:</b> <span className="text-green-400 font-bold">R{selectedInvoice.amount.toFixed(2)}</span></div>
                <div><b>Seller Net:</b> <span className="text-blue-400 font-bold">R{selectedInvoice.sellerNet.toFixed(2)}</span></div>
                <div><b>Status:</b> {selectedInvoice.paid ? <span className="text-green-400">Paid</span> : <span className="text-red-400">Unpaid</span>}</div>
              </div>
              <div className="mt-6 flex gap-4">
                <button
                  className={`px-4 py-2 rounded font-semibold ${selectedInvoice.paid ? 'bg-gray-400 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  disabled={selectedInvoice.paid}
                  onClick={async () => {
                    if (!selectedInvoice.paid) {
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${selectedInvoice.id}/paid`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                        });
                        if (!res.ok) throw new Error('Failed to update');
                        setInvoices(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, paid: true } : i));
                        setFiltered(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, paid: true } : i));
                        setSelectedInvoice(inv => inv ? { ...inv, paid: true } : inv);
                      } catch (err) {
                        alert('Failed to mark as paid.');
                      }
                    }
                  }}
                >
                  Mark as Paid
                </button>
                <button
                  className="px-4 py-2 rounded bg-green-900 text-green-200 hover:bg-green-800"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernAdminLayout>
  );
}

export default AdminInvoicesPage;
