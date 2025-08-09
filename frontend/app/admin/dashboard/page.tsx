'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/AdminSidebar';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_jwt');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    // Optionally: verify token client-side (not secure, but better UX)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin' || !payload.email || !payload.exp || Date.now() / 1000 > payload.exp) {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-yellow-600 drop-shadow text-center">
            Admin Dashboard
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Manage Users" href="/admin/users" />
            <Card title="Manage Auctions" href="/admin/auctions" />
            <Card title="Manage Lots" href="/admin/lots" />
            <Card title="Invoices" href="/admin/invoices" />
            <Card title="💰 Payment Management" href="/admin/payments" />
            <Card title="Item Offers" href="/admin/offers" />
            <Card title="Logout" onClick={() => {
              // Properly clear admin JWT on logout
              localStorage.removeItem('admin_jwt');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('userRole');
              localStorage.removeItem('admin_login_time');
              router.push('/admin/login');
            }} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ title, href, onClick }: { title: string; href?: string; onClick?: () => void }) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white rounded-lg shadow p-6 hover:shadow-xl transition"
    >
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    </div>
  );
}
