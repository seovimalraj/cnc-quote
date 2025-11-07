'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Search, 
  Filter, 
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useState } from 'react';

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  supplier: string;
  parts: number;
  quantity: number;
  value: number;
  status: 'pending' | 'in-production' | 'quality-check' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderDate: string;
  deliveryDate: string;
  progress: number;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customer: 'Acme Manufacturing',
    supplier: 'Precision Parts Co',
    parts: 5,
    quantity: 100,
    value: 15420,
    status: 'in-production',
    priority: 'high',
    orderDate: '2024-01-15',
    deliveryDate: '2024-02-01',
    progress: 65
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customer: 'TechCorp Industries',
    supplier: 'Advanced CNC Solutions',
    parts: 12,
    quantity: 500,
    value: 48900,
    status: 'quality-check',
    priority: 'urgent',
    orderDate: '2024-01-12',
    deliveryDate: '2024-01-28',
    progress: 90
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    customer: 'Global Robotics Ltd',
    supplier: 'MetalWorks Pro',
    parts: 3,
    quantity: 50,
    value: 8750,
    status: 'shipped',
    priority: 'normal',
    orderDate: '2024-01-10',
    deliveryDate: '2024-01-25',
    progress: 100
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    customer: 'AutoTech Systems',
    supplier: 'Precision Parts Co',
    parts: 8,
    quantity: 200,
    value: 22100,
    status: 'pending',
    priority: 'normal',
    orderDate: '2024-01-18',
    deliveryDate: '2024-02-10',
    progress: 5
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-005',
    customer: 'AeroSpace Dynamics',
    supplier: 'Titanium Works',
    parts: 15,
    quantity: 75,
    value: 95000,
    status: 'in-production',
    priority: 'urgent',
    orderDate: '2024-01-14',
    deliveryDate: '2024-02-15',
    progress: 45
  },
  {
    id: '6',
    orderNumber: 'ORD-2024-006',
    customer: 'MedDevice Inc',
    supplier: 'Sterile Manufacturing',
    parts: 20,
    quantity: 1000,
    value: 125000,
    status: 'delivered',
    priority: 'high',
    orderDate: '2024-01-05',
    deliveryDate: '2024-01-22',
    progress: 100
  },
  {
    id: '7',
    orderNumber: 'ORD-2024-007',
    customer: 'Defense Systems Corp',
    supplier: 'Secure Manufacturing',
    parts: 6,
    quantity: 30,
    value: 67500,
    status: 'cancelled',
    priority: 'low',
    orderDate: '2024-01-08',
    deliveryDate: '2024-02-05',
    progress: 0
  }
];

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      'pending': { bg: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600/20', icon: Clock },
      'in-production': { bg: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20', icon: Package },
      'quality-check': { bg: 'bg-purple-100 text-purple-700 ring-1 ring-purple-600/20', icon: AlertCircle },
      'shipped': { bg: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/20', icon: TrendingUp },
      'delivered': { bg: 'bg-green-100 text-green-700 ring-1 ring-green-600/20', icon: CheckCircle },
      'cancelled': { bg: 'bg-red-100 text-red-700 ring-1 ring-red-600/20', icon: XCircle }
    };
    
    const variant = variants[status];
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.bg} border-0 flex items-center gap-1.5 px-3 py-1 font-medium`}>
        <Icon className="w-3.5 h-3.5" />
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Order['priority']) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20',
      'normal': 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20',
      'high': 'bg-orange-100 text-orange-700 ring-1 ring-orange-600/20',
      'urgent': 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
    };
    
    return (
      <Badge className={`${colors[priority]} border-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>
        {priority}
      </Badge>
    );
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockOrders.length,
    active: mockOrders.filter(o => ['pending', 'in-production', 'quality-check'].includes(o.status)).length,
    completed: mockOrders.filter(o => o.status === 'delivered').length,
    totalValue: mockOrders.reduce((sum, o) => sum + o.value, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all production orders</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Export Orders
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.total}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Active tracking</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.active}</p>
                <p className="text-sm text-green-600 dark:text-green-400">In progress</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.completed}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Successfully delivered</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">${(stats.totalValue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-green-600 dark:text-green-400">Revenue generated</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order number, customer, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-production">In Production</option>
                <option value="quality-check">Quality Check</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Order Number</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Customer</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Supplier</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Parts/Qty</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Value</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Priority</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Progress</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Delivery Date</th>
                <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{order.orderDate}</div>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{order.customer}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{order.supplier}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {order.parts} parts / {order.quantity} qty
                  </td>
                  <td className="p-4 text-gray-900 dark:text-white font-semibold">${order.value.toLocaleString()}</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4">{getPriorityBadge(order.priority)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-[80px] overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{order.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300 text-sm">{order.deliveryDate}</td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
