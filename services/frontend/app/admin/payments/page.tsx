'use client';

import React, { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import { motion } from 'framer-motion';

interface Invoice {
  id: string;
  buyerEmail: string;
  buyerName: string;
  lotTitle: string;
  totalAmount: number;
  paymentStatus: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  createdAt: string;
}

interface Deposit {
  auctionId: string;
  email: string;
  userName: string;
  status: string;
  paymentStatus: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  depositAmount: number;
}

interface PaymentSummary {
  invoices: {
    total: number;
    paid: number;
    pending: number;
    totalValue: number;
    paidValue: number;
  };
  deposits: {
    total: number;
    paid: number;
    pending: number;
    totalValue: number;
    paidValue: number;
  };
}

interface PaymentModalData {
  type: 'invoice' | 'deposit';
  id: string;
  title: string;
  amount: number;
  currentStatus: string;
}

import { useRouter } from 'next/navigation';
export default function AdminPaymentsPage() {
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
    fetchData();
  }, [router]);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'deposits'>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    notes: '',
    depositAmount: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, depositsRes, summaryRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/invoices`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/deposits`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/summary`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` }
        })
      ]);

      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (depositsRes.ok) setDeposits(await depositsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentModal) return;

    try {
      const endpoint = paymentModal.type === 'invoice' 
        ? `/api/payments/invoices/${paymentModal.id}/mark-paid`
        : `/api/payments/deposits/${paymentModal.id}/mark-paid`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`
        },
        body: JSON.stringify(paymentForm)
      });

      if (response.ok) {
        await fetchData();
        setPaymentModal(null);
        setPaymentForm({ paymentMethod: 'bank_transfer', paymentReference: '', notes: '', depositAmount: 0 });
      } else {
        alert('Failed to mark payment as paid');
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Error occurred while updating payment');
    }
  };

  const handleMarkUnpaid = async (type: 'invoice' | 'deposit', id: string) => {
    if (!confirm('Are you sure you want to mark this payment as unpaid?')) return;

    try {
      const endpoint = type === 'invoice' 
        ? `/api/payments/invoices/${id}/mark-unpaid`
        : `/api/payments/deposits/${id}/mark-unpaid`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` }
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to mark payment as unpaid');
      }
    } catch (error) {
      console.error('Error marking payment as unpaid:', error);
      alert('Error occurred while updating payment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 px-8 py-8 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-yellow-600">💰 Payment Management</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow">
            {[
              { key: 'overview', label: '📊 Overview', icon: '📊' },
              { key: 'invoices', label: '🧾 Invoices', icon: '🧾' },
              { key: 'deposits', label: '💳 Deposits', icon: '💳' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-yellow-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                      <p className="text-3xl font-bold text-gray-900">{summary.invoices.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <span className="text-blue-600 text-xl">🧾</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-green-600 font-medium">{summary.invoices.paid} Paid</span>
                    <span className="text-orange-600 font-medium ml-3">{summary.invoices.pending} Pending</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Invoice Value</p>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.invoices.totalValue)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-green-600 font-medium">Paid: {formatCurrency(summary.invoices.paidValue)}</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Deposits</p>
                      <p className="text-3xl font-bold text-gray-900">{summary.deposits.total}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <span className="text-purple-600 text-xl">💳</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-green-600 font-medium">{summary.deposits.paid} Paid</span>
                    <span className="text-orange-600 font-medium ml-3">{summary.deposits.pending} Pending</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deposit Value</p>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.deposits.totalValue)}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <span className="text-yellow-600 text-xl">💵</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-green-600 font-medium">Paid: {formatCurrency(summary.deposits.paidValue)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">🧾 Invoice Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.lotTitle}</div>
                            <div className="text-sm text-gray-500">ID: {invoice.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.buyerName}</div>
                            <div className="text-sm text-gray-500">{invoice.buyerEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.paymentStatus === 'paid' ? (
                            <div>
                              <div>Method: {invoice.paymentMethod}</div>
                              <div>Date: {formatDate(invoice.paymentDate)}</div>
                              {invoice.paymentReference && <div>Ref: {invoice.paymentReference}</div>}
                            </div>
                          ) : (
                            'No payment recorded'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invoice.paymentStatus === 'paid' ? (
                            <button
                              onClick={() => handleMarkUnpaid('invoice', invoice.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Mark Unpaid
                            </button>
                          ) : (
                            <button
                              onClick={() => setPaymentModal({
                                type: 'invoice',
                                id: invoice.id,
                                title: invoice.lotTitle,
                                amount: invoice.totalAmount,
                                currentStatus: invoice.paymentStatus
                              })}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Deposits Tab */}
          {activeTab === 'deposits' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">💳 Deposit Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Auction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deposits.map((deposit) => (
                      <tr key={`${deposit.auctionId}-${deposit.email}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{deposit.auctionId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{deposit.userName}</div>
                            <div className="text-sm text-gray-500">{deposit.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(deposit.depositAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            deposit.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {deposit.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {deposit.paymentStatus === 'paid' ? (
                            <div>
                              <div>Method: {deposit.paymentMethod}</div>
                              <div>Date: {formatDate(deposit.paymentDate)}</div>
                              {deposit.paymentReference && <div>Ref: {deposit.paymentReference}</div>}
                            </div>
                          ) : (
                            'No payment recorded'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {deposit.paymentStatus === 'paid' ? (
                            <button
                              onClick={() => handleMarkUnpaid('deposit', `${deposit.auctionId}/${encodeURIComponent(deposit.email)}`)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Mark Unpaid
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setPaymentForm(prev => ({ ...prev, depositAmount: deposit.depositAmount }));
                                setPaymentModal({
                                  type: 'deposit',
                                  id: `${deposit.auctionId}/${encodeURIComponent(deposit.email)}`,
                                  title: `Deposit for ${deposit.auctionId}`,
                                  amount: deposit.depositAmount,
                                  currentStatus: deposit.paymentStatus
                                });
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>

        {/* Payment Modal */}
        {paymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">💰 Mark Payment as Paid</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">{paymentModal.title}</p>
                <p className="text-lg font-semibold">{formatCurrency(paymentModal.amount)}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Reference</label>
                  <input
                    type="text"
                    value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                    placeholder="Transaction ID, Check number, etc."
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                {paymentModal.type === 'deposit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Deposit Amount</label>
                    <input
                      type="number"
                      value={paymentForm.depositAmount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, depositAmount: Number(e.target.value) }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional payment notes..."
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
