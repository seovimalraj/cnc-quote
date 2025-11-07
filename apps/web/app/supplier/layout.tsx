import React from 'react';
import SupplierLayout from '@/components/SupplierLayout';

export default function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  return <SupplierLayout>{children}</SupplierLayout>;
}
