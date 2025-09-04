'use client';

import React from 'react';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentTextIcon, EyeIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function QuotesPage() {
  // Mock data for demonstration
  const quotes = [
    {
      id: 'Q-001',
      title: 'Aluminum CNC Part',
      status: 'completed',
      createdAt: '2024-01-15',
      price: '$245.00',
      description: 'Precision machined aluminum bracket for aerospace application'
    },
    {
      id: 'Q-002',
      title: 'Steel Gear Housing',
      status: 'in-progress',
      createdAt: '2024-01-12',
      price: '$1,250.00',
      description: 'Heavy-duty steel gear housing with complex internal features'
    },
    {
      id: 'Q-003',
      title: 'Plastic Prototype',
      status: 'pending',
      createdAt: '2024-01-10',
      price: '$89.50',
      description: 'Rapid prototype for medical device component'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">My Quotes</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and track your CNC machining quotes</p>
          </div>
          <Button>
            <DocumentTextIcon className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </div>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{quote.title}</CardTitle>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </div>
                <CardDescription>{quote.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Quote ID:</span>
                    <span className="font-medium">{quote.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-bold text-lg text-primary">{quote.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span>{quote.createdAt}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <EyeIcon className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {quotes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No quotes yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Get started by creating your first CNC machining quote
              </p>
              <Button>
                <DocumentTextIcon className="mr-2 h-4 w-4" />
                Create Your First Quote
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  );
}
