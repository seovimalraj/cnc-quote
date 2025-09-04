'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CloudArrowUpIcon,
  CubeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

// Mock data for widget
const mockResumeItems = [
  {
    id: 'Q-2025-001',
    thumbnail: '/api/placeholder/60/60',
    price: 1250.00,
    leadTime: '5-7 days',
    status: 'priced'
  },
  {
    id: 'Q-2025-002',
    thumbnail: '/api/placeholder/60/60',
    price: 890.50,
    leadTime: '3-5 days',
    status: 'draft'
  }
];

function WidgetQuoteHome() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);

      // Post message to parent window
      window.parent?.postMessage({
        type: 'upload:started',
        data: { files: droppedFiles.map(f => ({ name: f.name, size: f.size })) }
      }, '*');
    }
  };

  const handleStartQuote = () => {
    // Post message to parent window
    window.parent?.postMessage({
      type: 'quote:start',
      data: { files: files }
    }, '*');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Instant Quote</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Instant Quote Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag & drop your CAD files here
              </p>
              <p className="text-sm text-gray-500 mb-6">
                STEP | STP | IGES | STL | ZIP | DXF
              </p>
              <Button onClick={handleStartQuote} disabled={files.length === 0}>
                Start Quote
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mini Resume Bar */}
        {mockResumeItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Continue Your Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockResumeItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <img
                      src={item.thumbnail}
                      alt={`Quote ${item.id}`}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.id}</p>
                      <p className="text-sm font-bold text-green-600">
                        ${item.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{item.leadTime}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === 'priced'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload Status */}
        {files.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CubeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Uploaded
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return <WidgetQuoteHome />;
}
