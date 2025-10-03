import { RequireAnyRole } from '@/components/auth/RequireAnyRole';

export default function AdminDashboardPage() {
  return (
    <RequireAnyRole roles={['admin','org_admin','reviewer','finance','auditor']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>
    </RequireAnyRole>
  );
}
