'use client';

import dynamic from 'next/dynamic';

// Dynamically import the AdminDashboard component to avoid SSR issues
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading admin dashboard...</div>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminDashboard />;
}
