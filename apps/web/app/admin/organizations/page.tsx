'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Users, DollarSign, TrendingUp, Plus } from 'lucide-react';

export default function AdminOrganizationsPage() {
  const organizations = [
    { 
      id: 1, 
      name: 'Acme Manufacturing', 
      users: 12, 
      plan: 'Enterprise', 
      status: 'active', 
      created: '2024-01-15',
      revenue: '$45,200',
      quotes: 156,
      orders: 89
    },
    { 
      id: 2, 
      name: 'TechCorp Industries', 
      users: 8, 
      plan: 'Professional', 
      status: 'active', 
      created: '2024-03-20',
      revenue: '$32,800',
      quotes: 98,
      orders: 67
    },
    { 
      id: 3, 
      name: 'Precision Parts Ltd', 
      users: 5, 
      plan: 'Professional', 
      status: 'active', 
      created: '2024-02-10',
      revenue: '$28,400',
      quotes: 87,
      orders: 54
    },
    { 
      id: 4, 
      name: 'Global Engineering', 
      users: 15, 
      plan: 'Enterprise', 
      status: 'active', 
      created: '2023-11-05',
      revenue: '$67,900',
      quotes: 234,
      orders: 145
    },
    { 
      id: 5, 
      name: 'StartUp Co', 
      users: 3, 
      plan: 'Starter', 
      status: 'trial', 
      created: '2024-10-15',
      revenue: '$1,200',
      quotes: 12,
      orders: 3
    },
    { 
      id: 6, 
      name: 'Manufacturing Solutions', 
      users: 9, 
      plan: 'Professional', 
      status: 'active', 
      created: '2024-04-22',
      revenue: '$38,500',
      quotes: 112,
      orders: 78
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline', class: string }> = {
      active: { variant: 'default', class: 'bg-green-100 text-green-700 hover:bg-green-100' },
      trial: { variant: 'secondary', class: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      suspended: { variant: 'outline', class: 'bg-red-100 text-red-700 hover:bg-red-100' },
    };
    const config = variants[status] || variants.active;
    return (
      <Badge variant={config.variant} className={config.class}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, string> = {
      Enterprise: 'bg-purple-100 text-purple-700',
      Professional: 'bg-blue-100 text-blue-700',
      Starter: 'bg-gray-100 text-gray-700',
    };
    return (
      <Badge variant="outline" className={variants[plan] || variants.Starter}>
        {plan}
      </Badge>
    );
  };

  const totalUsers = organizations.reduce((sum, org) => sum + org.users, 0);
  const totalRevenue = organizations.reduce((sum, org) => {
    const revenue = parseFloat(org.revenue.replace(/[$,]/g, ''));
    return sum + revenue;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage organizations and subscriptions
          </p>
        </div>
        <Button disabled className="cursor-not-allowed opacity-50">
          <Plus className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Organizations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {organizations.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalUsers}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue/Org</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${Math.round(totalRevenue / organizations.length).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Organizations
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-400" />
                <input
                  placeholder="Search organizations..."
                  className="pl-7 pr-3 py-1 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-not-allowed opacity-75"
                  disabled
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3 font-medium">Organization</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Users</th>
                  <th className="text-left p-3 font-medium">Revenue</th>
                  <th className="text-left p-3 font-medium">Quotes</th>
                  <th className="text-left p-3 font-medium">Orders</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-medium">{org.name}</td>
                    <td className="p-3">{getPlanBadge(org.plan)}</td>
                    <td className="p-3">{org.users}</td>
                    <td className="p-3 font-medium">{org.revenue}</td>
                    <td className="p-3">{org.quotes}</td>
                    <td className="p-3">{org.orders}</td>
                    <td className="p-3">{getStatusBadge(org.status)}</td>
                    <td className="p-3 text-gray-600">{org.created}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" disabled className="cursor-not-allowed opacity-50">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
