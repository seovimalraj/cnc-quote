'use client';

import DefaultLayout from '@/components/Layouts/DefaultLayout';
import SafeDate from '@/components/SafeDate';
import { useState } from 'react';
import {
  DocumentDuplicateIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface Quote {
  id: string;
  customer: string;
  email: string;
  company: string;
  phone: string;
  material: string;
  quantity: number;
  surface: string;
  tolerance: string;
  leadTime: string;
  files: number;
  price: number;
  status: 'pending' | 'processing' | 'quoted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('quotes');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Mock data
  const quotes: Quote[] = [
    {
      id: 'Q-2024-001',
      customer: 'John Smith',
      email: 'john.smith@aerospace.com',
      company: 'Aerospace Dynamics',
      phone: '+1 (555) 123-4567',
      material: 'Aluminum 6061-T6',
      quantity: 50,
      surface: 'Anodized',
      tolerance: 'Tight (±0.002")',
      leadTime: '5-7 Business Days',
      files: 3,
      price: 12450,
      status: 'pending',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: 'Q-2024-002',
      customer: 'Sarah Johnson',
      email: 'sarah.j@medtech.com',
      company: 'MedTech Solutions',
      phone: '+1 (555) 987-6543',
      material: 'Stainless Steel 316',
      quantity: 25,
      surface: 'As Machined',
      tolerance: 'Standard (±0.005")',
      leadTime: '2-3 Business Days',
      files: 2,
      price: 8750,
      status: 'processing',
      createdAt: '2024-01-14T14:15:00Z',
      updatedAt: '2024-01-15T09:45:00Z',
    },
    {
      id: 'Q-2024-003',
      customer: 'Michael Chen',
      email: 'm.chen@autoparts.com',
      company: 'AutoParts Manufacturing',
      phone: '+1 (555) 456-7890',
      material: 'Mild Steel',
      quantity: 100,
      surface: 'Powder Coating',
      tolerance: 'Standard (±0.005")',
      leadTime: '5-7 Business Days',
      files: 4,
      price: 15600,
      status: 'quoted',
      createdAt: '2024-01-13T11:20:00Z',
      updatedAt: '2024-01-14T16:30:00Z',
    },
    {
      id: 'Q-2024-004',
      customer: 'Emily Rodriguez',
      email: 'e.rodriguez@robotics.com',
      company: 'Advanced Robotics Inc',
      phone: '+1 (555) 234-5678',
      material: 'Titanium Grade 2',
      quantity: 10,
      surface: 'As Machined',
      tolerance: 'Precision (±0.001")',
      leadTime: '24-48 Hours',
      files: 5,
      price: 28900,
      status: 'approved',
      createdAt: '2024-01-12T16:45:00Z',
      updatedAt: '2024-01-13T10:15:00Z',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'processing': return <DocumentDuplicateIcon className="h-4 w-4" />;
      case 'quoted': return <DocumentDuplicateIcon className="h-4 w-4" />;
      case 'approved': return <CheckCircleIcon className="h-4 w-4" />;
      case 'rejected': return <XCircleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const updateQuoteStatus = (quoteId: string, newStatus: Quote['status']) => {
    // In a real app, this would make an API call
    console.log(`Updating quote ${quoteId} to status: ${newStatus}`);
  };

  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-9">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
          <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <DocumentDuplicateIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {quotes.length}
                </h4>
                <span className="text-sm font-medium">Total Quotes</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <ClockIcon className="h-6 w-6 text-meta-5" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {quotes.filter(q => q.status === 'pending').length}
                </h4>
                <span className="text-sm font-medium">Pending Review</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <CheckCircleIcon className="h-6 w-6 text-meta-3" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {quotes.filter(q => q.status === 'approved').length}
                </h4>
                <span className="text-sm font-medium">Approved</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <DocumentDuplicateIcon className="h-6 w-6 text-meta-6" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {formatCurrency(quotes.reduce((sum, q) => sum + q.price, 0))}
                </h4>
                <span className="text-sm font-medium">Total Value</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Quote Management
              </h3>
            </div>
            
            {/* Quotes Table */}
            <div className="p-7">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                        Quote ID
                      </th>
                      <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                        Customer
                      </th>
                      <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                        Material
                      </th>
                      <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                        Quantity
                      </th>
                      <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                        Price
                      </th>
                      <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                        Status
                      </th>
                      <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                        Created
                      </th>
                      <th className="py-4 px-4 font-medium text-black dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => (
                      <tr key={quote.id}>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <p className="text-black dark:text-white font-medium">
                            {quote.id}
                          </p>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <div>
                            <p className="text-black dark:text-white font-medium">
                              {quote.customer}
                            </p>
                            <p className="text-sm text-gray-500">{quote.company}</p>
                          </div>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <p className="text-black dark:text-white">
                            {quote.material}
                          </p>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <p className="text-black dark:text-white">
                            {quote.quantity}
                          </p>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <p className="text-black dark:text-white font-medium">
                            {formatCurrency(quote.price)}
                          </p>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(quote.status)}`}>
                            {getStatusIcon(quote.status)}
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </div>
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <SafeDate 
                            dateString={quote.createdAt}
                            className="text-black dark:text-white text-sm"
                          />
                        </td>
                        <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedQuote(quote)}
                              className="hover:text-primary"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="hover:text-meta-5"
                              title="Edit Quote"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="hover:text-meta-1"
                              title="Delete Quote"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Details Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-2xl w-full mx-4 bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark flex justify-between items-center">
                <h3 className="font-medium text-black dark:text-white">
                  Quote Details - {selectedQuote.id}
                </h3>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      Customer Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-black dark:text-white">{selectedQuote.customer}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-black dark:text-white">{selectedQuote.company}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-black dark:text-white">{selectedQuote.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-black dark:text-white">{selectedQuote.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quote Details */}
                  <div>
                    <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                      Quote Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-500">Material:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.material}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Surface:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.surface}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tolerance:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.tolerance}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Lead Time:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.leadTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Files:</span>
                        <span className="ml-2 text-black dark:text-white">{selectedQuote.files} uploaded</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-2 text-black dark:text-white font-bold text-lg">
                          {formatCurrency(selectedQuote.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className="mt-6 pt-6 border-t border-stroke dark:border-strokedark">
                  <h4 className="text-lg font-medium text-black dark:text-white mb-4">
                    Update Status
                  </h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateQuoteStatus(selectedQuote.id, 'processing')}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Mark Processing
                    </button>
                    <button
                      onClick={() => updateQuoteStatus(selectedQuote.id, 'quoted')}
                      className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                      Send Quote
                    </button>
                    <button
                      onClick={() => updateQuoteStatus(selectedQuote.id, 'approved')}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateQuoteStatus(selectedQuote.id, 'rejected')}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AdminDashboard;
