'use client';

export default function AdminRootRedirect() {
  // Simple redirect without complex components
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/dashboard';
  }
  return (
    <div className="p-6">
      <p>Redirecting to admin dashboard...</p>
    </div>
  );
}
