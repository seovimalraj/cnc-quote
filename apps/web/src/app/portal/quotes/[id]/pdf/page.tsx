'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

// Types based on specification
interface PDFVersion {
  id: string;
  quote_id: string;
  version: number;
  status: 'completed' | 'processing' | 'failed';
  file_size_bytes: number;
  url: string;
  created_at: string;
  created_by: string;
  notes?: string;
}

export default function QuotePDFHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Mock data
  const mockPDFVersions: PDFVersion[] = [
    {
      id: 'pdf-1',
      quote_id: quoteId,
      version: 3,
      status: 'completed',
      file_size_bytes: 2048000,
      url: '/api/pdf/quote-123-v3.pdf',
      created_at: '2024-09-12T14:30:00Z',
      created_by: 'john.doe@example.com',
      notes: 'Updated pricing and lead times',
    },
    {
      id: 'pdf-2',
      quote_id: quoteId,
      version: 2,
      status: 'completed',
      file_size_bytes: 1984000,
      url: '/api/pdf/quote-123-v2.pdf',
      created_at: '2024-09-11T09:15:00Z',
      created_by: 'jane.smith@example.com',
      notes: 'Added DFM analysis results',
    },
    {
      id: 'pdf-3',
      quote_id: quoteId,
      version: 1,
      status: 'completed',
      file_size_bytes: 1856000,
      url: '/api/pdf/quote-123-v1.pdf',
      created_at: '2024-09-10T16:45:00Z',
      created_by: 'john.doe@example.com',
      notes: 'Initial quote generation',
    },
  ];

  useEffect(() => {
    // Track page view
    posthog.capture('pdf_history_view', { quote_id: quoteId });

    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPdfVersions(mockPDFVersions);
      setLoading(false);
    };

    fetchData();
  }, [quoteId]);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      // In real implementation: POST /api/quotes/:id/generate-pdf
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing

      const newVersion: PDFVersion = {
        id: `pdf-${Date.now()}`,
        quote_id: quoteId,
        version: Math.max(...pdfVersions.map(v => v.version)) + 1,
        status: 'completed',
        file_size_bytes: 2100000,
        url: `/api/pdf/quote-${quoteId}-v${Math.max(...pdfVersions.map(v => v.version)) + 1}.pdf`,
        created_at: new Date().toISOString(),
        created_by: 'current.user@example.com',
        notes: 'Generated from portal',
      };

      setPdfVersions(prev => [newVersion, ...prev]);

      posthog.capture('pdf_generated', {
        quote_id: quoteId,
        version: newVersion.version,
        file_size: newVersion.file_size_bytes,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = (pdfVersion: PDFVersion) => {
    // In real implementation: open PDF viewer modal or new window
    window.open(pdfVersion.url, '_blank');

    posthog.capture('pdf_previewed', {
      quote_id: quoteId,
      pdf_version_id: pdfVersion.id,
      version: pdfVersion.version,
    });
  };

  const handleDownload = (pdfVersion: PDFVersion) => {
    // In real implementation: trigger download with signed URL
    const link = document.createElement('a');
    link.href = pdfVersion.url;
    link.download = `quote-${quoteId}-v${pdfVersion.version}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    posthog.capture('pdf_downloaded', {
      quote_id: quoteId,
      pdf_version_id: pdfVersion.id,
      version: pdfVersion.version,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push('/portal/dashboard')}
                className="hover:text-gray-900"
              >
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push('/portal/quotes')}
                className="hover:text-gray-900"
              >
                Quotes
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                className="hover:text-gray-900"
              >
                {quoteId}
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">PDF History</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="flex items-center space-x-2"
              >
                <ArrowPathIcon className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                <span>{generating ? 'Generating...' : 'Generate New PDF'}</span>
              </Button>
              <Button
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                variant="outline"
              >
                Back to Quote
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DocumentTextIcon className="h-5 w-5" />
                <span>PDF Generation History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{pdfVersions.length}</div>
                  <div className="text-sm text-gray-500">Total PDFs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {pdfVersions.filter(v => v.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatFileSize(pdfVersions.reduce((sum, v) => sum + v.file_size_bytes, 0))}
                  </div>
                  <div className="text-sm text-gray-500">Total Size</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Versions Table */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Versions</CardTitle>
            </CardHeader>
            <CardContent>
              {pdfVersions.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No PDFs generated yet</h3>
                  <p className="text-gray-500 mb-4">
                    Generate your first PDF to see the history here.
                  </p>
                  <Button onClick={handleGeneratePDF} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdfVersions.map((pdfVersion) => (
                      <TableRow key={pdfVersion.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">v{pdfVersion.version}</span>
                            {pdfVersion.version === Math.max(...pdfVersions.map(v => v.version)) && (
                              <Badge variant="outline" className="text-xs">Latest</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(pdfVersion.status)}
                            {getStatusBadge(pdfVersion.status)}
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(pdfVersion.file_size_bytes)}</TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(pdfVersion.created_at)}</div>
                            {pdfVersion.notes && (
                              <div className="text-sm text-gray-500 mt-1">{pdfVersion.notes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{pdfVersion.created_by}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(pdfVersion)}
                              disabled={pdfVersion.status !== 'completed'}
                              className="flex items-center space-x-1"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Preview</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(pdfVersion)}
                              disabled={pdfVersion.status !== 'completed'}
                              className="flex items-center space-x-1"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
