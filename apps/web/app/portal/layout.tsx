import React from 'react';
import AdminLayout from '@/components/AdminLayout';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}