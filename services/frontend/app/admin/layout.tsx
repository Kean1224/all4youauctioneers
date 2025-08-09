'use client';

import { usePathname } from 'next/navigation';
import AdminAuthWrapper from '../../components/AdminAuthWrapper';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Don't require authentication for the login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }
  
  return (
    <AdminAuthWrapper>
      {children}
    </AdminAuthWrapper>
  );
}
