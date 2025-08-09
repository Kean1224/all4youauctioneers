'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface PaymentAlert {
  pendingInvoices: number;
  pendingDeposits: number;
  totalPendingValue: number;
}

export default function PaymentAlerts() {
  const [alerts, setAlerts] = useState<PaymentAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentAlerts();
  }, []);

  const fetchPaymentAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts({
          pendingInvoices: data.invoices.pending,
          pendingDeposits: data.deposits.pending,
          totalPendingValue: (data.invoices.totalValue - data.invoices.paidValue) + (data.deposits.totalValue - data.deposits.paidValue)
        });
      }
    } catch (error) {
      console.error('Error fetching payment alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !alerts) return null;

  const hasPendingPayments = alerts.pendingInvoices > 0 || alerts.pendingDeposits > 0;

  if (!hasPendingPayments) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-yellow-400 text-xl">⚠️</span>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Pending Payments:</strong> {alerts.pendingInvoices} invoices and {alerts.pendingDeposits} deposits 
            (Total value: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(alerts.totalPendingValue)})
          </p>
          <p className="mt-2">
            <Link 
              href="/admin/payments" 
              className="text-yellow-700 hover:text-yellow-600 font-medium underline"
            >
              Manage Payments →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
