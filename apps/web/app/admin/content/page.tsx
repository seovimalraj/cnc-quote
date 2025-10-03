'use client';
import React from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminContentPage() {
  return (
    <RequireAnyRole roles={['admin','org_admin']} fallback={<div className="p-4 text-sm text-red-600">Access denied</div>}>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage static marketing & documentation pages.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between border p-2 rounded-md">
              <span>/pricing</span>
              <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Edit</Button>
            </div>
            <div className="flex items-center justify-between border p-2 rounded-md">
              <span>/capabilities/cnc</span>
              <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Edit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload and curate customer-facing docs (PDF, spec sheets).</p>
          <Button size="sm">Upload Document</Button>
        </CardContent>
      </Card>
    </div>
    </RequireAnyRole>
  );
}
