'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileCheck, Search, Filter, Download, Eye, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function AdminInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const invoices = [
    { id: 1, invoiceNumber: 'INV-2024-001', customer: 'Acme Manufacturing', orderNumber: 'ORD-2024-001', amount: 15420, issueDate: '2024-10-15', dueDate: '2024-11-15', status: 'paid' },
    { id: 2, invoiceNumber: 'INV-2024-002', customer: 'TechCorp Industries', orderNumber: 'ORD-2024-002', amount: 48900, issueDate: '2024-10-18', dueDate: '2024-11-18', status: 'pending' },
    { id: 3, invoiceNumber: 'INV-2024-003', customer: 'Global Robotics Ltd', orderNumber: 'ORD-2024-003', amount: 8750, issueDate: '2024-10-20', dueDate: '2024-11-20', status: 'paid' },
    { id: 4, invoiceNumber: 'INV-2024-004', customer: 'AeroSpace Dynamics', orderNumber: 'ORD-2024-005', amount: 95000, issueDate: '2024-10-22', dueDate: '2024-11-22', status: 'overdue' },
    { id: 5, invoiceNumber: 'INV-2024-005', customer: 'MedDevice Inc', orderNumber: 'ORD-2024-006', amount: 125000, issueDate: '2024-10-25', dueDate: '2024-11-25', status: 'pending' },
  ];

  const stats = [
    { label: 'Total Invoices', value: invoices.length, icon: FileCheck, color: 'blue' },
    { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle, color: 'green' },
    { label: 'Pending', value: invoices.filter(i => i.status === 'pending').length, icon: Clock, color: 'orange' },
    { label: 'Total Amount', value: `$${(invoices.reduce((sum, i) => sum + i.amount, 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: 'purple' },
  ];

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'paid': 'bg-green-100 text-green-700 border-0',
      'pending': 'bg-yellow-100 text-yellow-700 border-0',
      'overdue': 'bg-red-100 text-red-700 border-0'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage billing and payments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileCheck className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
          };
          return (
            <Card key={stat.label} className="hover:shadow-lg transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorMap[stat.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hover:shadow-md transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-gray-700 font-semibold">Invoice Number</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Customer</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Order</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Amount</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Issue Date</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Due Date</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Status</th>
                <th className="text-left p-4 text-gray-700 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                  <td className="p-4 text-gray-700">{invoice.customer}</td>
                  <td className="p-4 text-gray-700">{invoice.orderNumber}</td>
                  <td className="p-4 text-gray-900 font-semibold">${invoice.amount.toLocaleString()}</td>
                  <td className="p-4 text-gray-700">{invoice.issueDate}</td>
                  <td className="p-4 text-gray-700">{invoice.dueDate}</td>
                  <td className="p-4">{getStatusBadge(invoice.status)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
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
