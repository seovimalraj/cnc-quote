'use client';
import React from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminSecurityPage() {
  return (
    <RequireAnyRole roles={['admin','org_admin','auditor']} fallback={<div className="p-4 text-sm text-red-600">Access denied</div>}>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security & Compliance</h1>
      <Card>
        <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Recent privileged actions (placeholder data)</p>
          <ul className="text-sm list-disc ml-5 space-y-1">
            <li>2024-05-01 12:03Z — user admin@example.com updated pricing config</li>
            <li>2024-05-01 11:55Z — user reviewer@example.com approved quote #1234</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Issue and revoke API keys for partner integrations.</p>
          <Button size="sm">Generate New Key</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Toggle experimental features and staged rollouts.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between border p-2 rounded-md"><span>new_pricing_engine</span><Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Enable</Button></div>
            <div className="flex items-center justify-between border p-2 rounded-md"><span>dfm_v2</span><Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Disable</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireAnyRole>
  );
}
