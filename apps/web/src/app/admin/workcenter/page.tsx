'use client';

import React, { useState } from 'react';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CogIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

// Mock data for admin workcenter
const mockNeedsReview = [
  {
    id: 'Q-2025-001',
    org: 'Acme Corp',
    complexity: 'High',
    dfmBlockers: 2,
    value: 2500.00,
    slaAge: '2h',
    assignee: 'John Doe'
  },
  {
    id: 'Q-2025-002',
    org: 'TechStart Inc',
    complexity: 'Medium',
    dfmBlockers: 0,
    value: 1200.00,
    slaAge: '4h',
    assignee: 'Unassigned'
  }
];

const mockPriced = [
  {
    id: 'Q-2025-003',
    org: 'BuildCo LLC',
    price: 1800.00,
    speed: 'Standard',
    updated: '2025-09-03T10:30:00Z'
  },
  {
    id: 'Q-2025-004',
    org: 'Innovate Ltd',
    price: 3200.00,
    speed: 'Expedite',
    updated: '2025-09-03T09:15:00Z'
  }
];

function FiltersToolbar() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quotes, customers, files…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="priced">Priced</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="24h">&lt;24h</SelectItem>
                <SelectItem value="3d">1–3d</SelectItem>
                <SelectItem value="7d">3–7d</SelectItem>
                <SelectItem value="older">&gt;7d</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="widget">Widget</SelectItem>
                <SelectItem value="large_order">Large Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NeedsReviewQueue() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          Needs Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Quote ID</th>
                <th className="text-left p-3 font-medium">Org</th>
                <th className="text-left p-3 font-medium">Complexity</th>
                <th className="text-left p-3 font-medium">DFM Blockers</th>
                <th className="text-left p-3 font-medium">Value</th>
                <th className="text-left p-3 font-medium">SLA Age</th>
                <th className="text-left p-3 font-medium">Assignee</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockNeedsReview.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3">{item.org}</td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        item.complexity === 'High'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {item.complexity}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {item.dfmBlockers > 0 ? (
                      <Badge variant="destructive">
                        {item.dfmBlockers}
                      </Badge>
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                  </td>
                  <td className="p-3 font-medium">${item.value.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.slaAge.includes('2h')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.slaAge}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.assignee === 'Unassigned' ? (
                      <span className="text-gray-500">Unassigned</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        {item.assignee}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                      <Button size="sm">
                        Approve & Send
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PricedQueue() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          Priced
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Quote ID</th>
                <th className="text-left p-3 font-medium">Org</th>
                <th className="text-left p-3 font-medium">Price</th>
                <th className="text-left p-3 font-medium">Speed</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockPriced.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3">{item.org}</td>
                  <td className="p-3 font-medium text-green-600">
                    ${item.price.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {item.speed}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(item.updated).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        Send
                      </Button>
                      <Button size="sm" variant="outline">
                        Lock Price
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthRail() {
  const healthItems = [
    { label: 'API OK', status: 'good' },
    { label: 'CAD OK', status: 'good' },
    { label: 'Webhooks OK', status: 'good' },
    { label: 'Queue Depth', status: 'warn', value: '23' }
  ];

  const sloItems = [
    { label: 'First Price', value: '1.8s', target: '2.0s', status: 'good' },
    { label: 'CAD Analysis', value: '45s', target: '60s', status: 'good' },
    { label: 'Payment→Order', value: '3.2s', target: '5.0s', status: 'good' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-sm font-medium">{item.value}</span>
                  )}
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>P95 SLOs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sloItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    item.status === 'good' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-500">/ {item.target}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWorkcenterPage() {
  return (
    <DefaultLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quoting Workcenter</h1>
        </div>

        {/* Filters Toolbar */}
        <FiltersToolbar />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            <NeedsReviewQueue />
            <PricedQueue />
          </div>

          {/* Right Rail */}
          <div className="xl:col-span-1">
            <SystemHealthRail />
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
