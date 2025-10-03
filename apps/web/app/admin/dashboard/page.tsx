'use client';

import { OverviewCardsGroup } from '../../(home)/_components/overview-cards';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Settings, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <RequireAnyRole roles={['admin','org_admin','reviewer','finance','auditor']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Operational overview & quick actions.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/admin/security">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>
      <OverviewCardsGroup />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage user accounts, roles, and permissions.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Update website content, pages, and resources.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/content">Manage Content</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">View detailed analytics and system metrics.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/metrics">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>• New quote submitted (Quote #1234) 2 minutes ago</p>
            <p>• User john.doe@example.com registered 5 minutes ago</p>
            <p>• Payment processed $2,450.00 10 minutes ago</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireAnyRole>
  );
}
