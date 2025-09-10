'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { validateBusinessEmail, validatePhoneNumber } from '@/lib/validation';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  checksum?: string;
  preview?: string;
}

interface QuoteSummary {
  quoteId: string;
  totalFiles: number;
  processedFiles: number;
  estimatedPrice?: number;
  estimatedTime?: string;
}

interface LeadFormData {
  businessEmail: string;
  phoneE164: string;
  consent: boolean;
  honeypot?: string; // Hidden field for spam detection
}

interface LeadFormErrors {
  businessEmail?: string;
  phoneE164?: string;
  consent?: string;
}

export default function InstantQuotePage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [quoteSummary, setQuoteSummary] = useState<QuoteSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadFormData, setLeadFormData] = useState<LeadFormData>({
    businessEmail: '',
    phoneE164: '',
    consent: false,
    honeypot: ''
  });
  const [leadFormErrors, setLeadFormErrors] = useState<LeadFormErrors>({});
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = {
    'application/step': ['.step', '.stp'],
    'application/iges': ['.iges', '.igs'],
    'application/sldprt': ['.sldprt'],
    'model/stl': ['.stl'],
    'model/x_t': ['.x_t'],
    'model/x_b': ['.x_b'],
    'model/jt': ['.jt'],
    'model/3mf': ['.3mf'],
    'image/vnd.dxf': ['.dxf'],
    'application/zip': ['.zip']
  };

  const maxFileSize = 200 * 1024 * 1024; // 200MB

  // Business email validation
  const validateBusinessEmail = (email: string): boolean => {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email)) return false;

    const blocklistDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'proton.me', 'yopmail.com', 'gmx.com', 'mailinator.com'];
    const allowedTlds = ['com', 'net', 'org', 'io', 'co', 'ai', 'edu', 'gov'];

    const domain = email.split('@')[1].toLowerCase();
    const tld = domain.split('.').pop();

    return !blocklistDomains.includes(domain) && allowedTlds.includes(tld || '');
  };

  // Phone validation (E.164 format)
  const validatePhoneE164 = (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(phone) && phone.length >= 8 && phone.length <= 15;
  };

  // Format phone number to E.164
  const formatPhoneToE164 = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Assume US if no country code
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start upload process
    for (const uploadedFile of newFiles) {
      await uploadFile(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: true,
    noClick: false,
    noKeyboard: false
  });

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      // Step 1: Prepare file upload
      const uploadPrepResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadedFile.file.name,
          fileSize: uploadedFile.file.size,
          contentType: uploadedFile.file.type || 'application/octet-stream'
        })
      });

      if (!uploadPrepResponse.ok) {
        throw new Error('Failed to prepare file upload');
      }

      const { fileId, signedUrl } = await uploadPrepResponse.json();

      // Step 2: Upload file to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: uploadedFile.file,
        headers: {
          'Content-Type': uploadedFile.file.type || 'application/octet-stream'
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Update progress to show upload complete
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, progress: 100, status: 'processing' }
            : f
        )
      );

      // Step 3: Create draft quote (only for first file)
      let quoteId = quoteSummary?.quoteId;
      if (!quoteId) {
        const quoteResponse = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'web',
            guestEmail: null // For anonymous users
          })
        });

        if (!quoteResponse.ok) {
          throw new Error('Failed to create quote');
        }

        const quote = await quoteResponse.json();
        quoteId = quote.id;

        setQuoteSummary({
          quoteId,
          totalFiles: uploadedFiles.length + 1,
          processedFiles: 0,
          estimatedPrice: undefined,
          estimatedTime: undefined
        });
      }

      // Step 4: Create quote line
      const lineResponse = await fetch(`/api/quotes/${quoteId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: uploadedFile.file.name,
          fileSize: uploadedFile.file.size
        })
      });

      if (!lineResponse.ok) {
        throw new Error('Failed to create quote line');
      }

      const quoteLine = await lineResponse.json();

      // Step 5: Start CAD analysis
      await fetch('/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          lineId: quoteLine.id,
          quoteId
        })
      });

      // Step 6: Start pricing
      await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          lineId: quoteLine.id,
          specs: { autoGuess: true }
        })
      });

      // Update file status
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'completed' }
            : f
        )
      );

      // Update quote summary
      setQuoteSummary(prev => prev ? {
        ...prev,
        processedFiles: prev.processedFiles + 1
      } : null);

      // Trigger lead modal after first successful upload
      if (!showLeadModal && !leadSubmitted) {
        setShowLeadModal(true);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error' }
            : f
        )
      );
    }
  };

  // Poll for quote updates
  useEffect(() => {
    if (!quoteSummary?.quoteId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/quotes/${quoteSummary.quoteId}`);
        if (response.ok) {
          const updatedQuote = await response.json();
          const hasPrice = updatedQuote.estimatedPrice && !quoteSummary.estimatedPrice;

          setQuoteSummary(prev => prev ? {
            ...prev,
            estimatedPrice: updatedQuote.estimatedPrice,
            estimatedTime: updatedQuote.estimatedTime,
            processedFiles: updatedQuote.lines?.filter((l: any) => l.status === 'completed').length || prev.processedFiles
          } : null);

          // Trigger lead modal when first price is ready
          if (hasPrice && !showLeadModal && !leadSubmitted) {
            setShowLeadModal(true);
          }
        }
      } catch (error) {
        console.error('Failed to poll quote status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [quoteSummary?.quoteId, quoteSummary?.estimatedPrice, showLeadModal, leadSubmitted]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Lead form validation
  const validateLeadForm = (): boolean => {
    const errors: LeadFormErrors = {};

    // Check honeypot (should be empty)
    if (leadFormData.honeypot && leadFormData.honeypot.trim() !== '') {
      // This is likely spam, but we'll still validate other fields for UX
      console.warn('Honeypot field was filled, possible spam attempt');
    }

    if (!leadFormData.businessEmail) {
      errors.businessEmail = 'Business email is required';
    } else if (!validateBusinessEmail(leadFormData.businessEmail)) {
      errors.businessEmail = 'Please use a business email (e.g., name@company.com)';
    }

    if (!leadFormData.phoneE164) {
      errors.phoneE164 = 'Phone number is required';
    } else if (!validatePhoneE164(leadFormData.phoneE164)) {
      errors.phoneE164 = 'Enter a valid phone (e.g., +1 212 555 0100)';
    }

    if (!leadFormData.consent) {
      errors.consent = 'You must agree to the Terms and Privacy Policy';
    }

    setLeadFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle lead form submission
  const handleLeadSubmit = async () => {
    if (!validateLeadForm() || !quoteSummary?.quoteId) return;

    setIsSubmittingLead(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadFormData.businessEmail,
          phone: leadFormData.phoneE164,
          quoteId: quoteSummary.quoteId,
          fingerprint: 'web-session-' + Date.now() // Simple fingerprint for demo
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create lead');
      }

      const lead = await response.json();
      setLeadSubmitted(true);
      setShowLeadModal(false);

      // Navigate to quote page
      window.location.href = `/quote/${quoteSummary.quoteId}`;

    } catch (error) {
      console.error('Lead submission error:', error);
      setLeadFormErrors({ businessEmail: 'Failed to process your information. Please try again.' });
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Handle form input changes
  const handleLeadFormChange = (field: keyof LeadFormData, value: string | boolean) => {
    setLeadFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (leadFormErrors[field]) {
      setLeadFormErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-format phone number
    if (field === 'phoneE164' && typeof value === 'string') {
      const formatted = formatPhoneToE164(value);
      setLeadFormData(prev => ({ ...prev, phoneE164: formatted }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <DocumentIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading...</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing...</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">CNC Quote</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost">Sign In</Button>
              <Button>Get Started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Upload your CAD.
            <span className="block text-blue-600">Get pricing in seconds.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Drag and drop your CAD files to get instant manufacturing quotes with automated analysis.
          </p>
        </div>
      </section>

      {/* Drop Zone */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
              <div>
                <p className="text-xl font-medium text-gray-900">
                  {isDragActive ? 'Drop your files here' : 'Drag & drop your CAD files here'}
                </p>
                <p className="text-gray-600 mt-2">
                  or <button className="text-blue-600 hover:text-blue-500 font-medium px-3 py-2 rounded-md hover:bg-blue-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">browse files</button>
                </p>
              </div>
              <div className="text-sm text-gray-500">
                <p>Supported formats: STEP, STP, IGES, IGS, SLDPRT, STL, X_T, X_B, JT, 3MF, DXF, ZIP</p>
                <p>Maximum file size: 200MB per file</p>
                <p className="mt-2 text-xs">Files are private and secure • Multi-file upload supported</p>
              </div>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
              <div className="space-y-3">
                {uploadedFiles.map((uploadedFile) => (
                  <Card key={uploadedFile.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(uploadedFile.status)}
                          <div>
                            <p className="font-medium text-gray-900">{uploadedFile.file.name}</p>
                            <p className="text-sm text-gray-600">{formatFileSize(uploadedFile.file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(uploadedFile.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadedFile.id)}
                            className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                        <div className="mt-3">
                          <Progress value={uploadedFile.progress} className="h-2" />
                          <p className="text-xs text-gray-600 mt-1">
                            {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Processing...'} {uploadedFile.progress}%
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Quote Summary Skeleton */}
          {uploadedFiles.some(f => f.status === 'processing' || f.status === 'completed') && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Analyzing Files & Calculating Price</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-center text-gray-600">
                      <p>This usually takes 10-30 seconds...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Section */}
          {uploadedFiles.some(f => f.status === 'completed') && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Quote Ready!</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                    <p className="text-lg text-gray-900">
                      Your instant quote is ready. Files processed successfully!
                    </p>

                    {leadSubmitted ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-medium text-green-800 mb-2">Quote Summary</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Estimated Price</p>
                              <p className="font-semibold text-lg">
                                {quoteSummary?.estimatedPrice ? `$${quoteSummary.estimatedPrice}` : 'Calculating...'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Lead Time</p>
                              <p className="font-semibold">
                                {quoteSummary?.estimatedTime || 'Calculating...'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Files Processed</p>
                              <p className="font-semibold">
                                {quoteSummary?.processedFiles || 0} of {quoteSummary?.totalFiles || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center space-x-4">
                          <Button>View Full Quote</Button>
                          <Button variant="outline">Download Summary</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-medium text-blue-800 mb-2">Pricing Preview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Estimated Price</p>
                              <p className="font-semibold text-lg text-gray-500">
                                ${quoteSummary?.estimatedPrice ? '$' + Math.floor(quoteSummary.estimatedPrice / 10) + 'XX' : 'Calculating...'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Lead Time</p>
                              <p className="font-semibold text-gray-500">
                                {quoteSummary?.estimatedTime || 'Calculating...'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Files Processed</p>
                              <p className="font-semibold">
                                {quoteSummary?.processedFiles || 0} of {quoteSummary?.totalFiles || 0}
                              </p>
                            </div>
                          </div>
                          <p className="text-blue-700 text-sm mt-2">
                            Complete your contact information to view detailed pricing
                          </p>
                        </div>
                        <Button onClick={() => setShowLeadModal(true)}>
                          View Detailed Quote
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Lead Gate Modal */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Where should we send your quote?</DialogTitle>
            <DialogDescription>
              Enter your business contact information to view detailed pricing and continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Honeypot field (hidden) */}
            <input
              type="text"
              name="website"
              value={leadFormData.honeypot}
              onChange={(e) => handleLeadFormChange('honeypot', e.target.value)}
              className="sr-only"
              autoComplete="off"
            />

            {/* Business Email */}
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email *</Label>
              <Input
                id="businessEmail"
                type="email"
                placeholder="name@company.com"
                value={leadFormData.businessEmail}
                onChange={(e) => handleLeadFormChange('businessEmail', e.target.value)}
                className={leadFormErrors.businessEmail ? 'border-red-500' : ''}
              />
              {leadFormErrors.businessEmail && (
                <p className="text-sm text-red-600">{leadFormErrors.businessEmail}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneE164">Phone Number *</Label>
              <Input
                id="phoneE164"
                type="tel"
                placeholder="+1 212 555 0100"
                value={leadFormData.phoneE164}
                onChange={(e) => handleLeadFormChange('phoneE164', e.target.value)}
                className={leadFormErrors.phoneE164 ? 'border-red-500' : ''}
              />
              {leadFormErrors.phoneE164 && (
                <p className="text-sm text-red-600">{leadFormErrors.phoneE164}</p>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={leadFormData.consent}
                onCheckedChange={(checked) => handleLeadFormChange('consent', !!checked)}
                className={`mt-1 min-h-[44px] min-w-[44px] ${leadFormErrors.consent ? 'border-red-500' : ''}`}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="consent"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the Terms and Privacy Policy *
                </Label>
                {leadFormErrors.consent && (
                  <p className="text-sm text-red-600">{leadFormErrors.consent}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowLeadModal(false)}
              disabled={isSubmittingLead}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeadSubmit}
              disabled={isSubmittingLead || !leadFormData.consent}
            >
              {isSubmittingLead ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
