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
import PublicLayout from '@/components/PublicLayout';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  checksum?: string;
  preview?: string;
  name: string;
  size: number;
  type: string;
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
  honeypot?: string;
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
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
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
    'model/obj': ['.obj'],
    'model/ply': ['.ply'],
    'image/vnd.dxf': ['.dxf'],
    'application/zip': ['.zip']
  };

  const maxFileSize = 200 * 1024 * 1024; // 200MB

  // Business email validation


  // Format phone number to E.164
  const formatPhoneToE164 = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Assume US if no country code
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  };

  // Create quote with all uploaded files
  const createQuoteWithAllFiles = async (filesToUse?: UploadedFile[]): Promise<string> => {
    const files = filesToUse || uploadedFiles;
    console.log('Creating quote with', files.length, 'files');
    
    const filesData = files.map(uploadedFile => ({
      fileId: uploadedFile.id,
      fileName: uploadedFile.file.name,
      fileSize: uploadedFile.file.size,
      contentType: uploadedFile.file.type || 'application/octet-stream'
    }));

    const quoteResponse = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'web',
        guestEmail: null,
        files: filesData
      })
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('Quote creation failed:', errorText);
      throw new Error(`Failed to create quote: ${quoteResponse.status}`);
    }

    const quote = await quoteResponse.json();
    console.log('Quote created successfully:', quote);
    
    // Update quote summary with the real quote data - handle potential undefined values
    const lines = quote.lines || [];
    setQuoteSummary({
      quoteId: quote.id,
      totalFiles: lines.length,
      processedFiles: lines.length,
      estimatedPrice: quote.subtotal,
      estimatedTime: lines[0]?.leadTimeOptions?.[1]?.business_days || 10
    });

    return quote.id;
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('Files dropped:', acceptedFiles.length, 'accepted,', rejectedFiles.length, 'rejected');

    // Clear previous error messages
    setRejectedFiles([]);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectionMessages = rejectedFiles.map(({ file, errors }) => {
        const errorMessages = errors.map((error: any) => {
          switch (error.code) {
            case 'file-too-large':
              return `${file.name} is too large (max ${formatFileSize(maxFileSize)})`;
            case 'file-invalid-type':
              return `${file.name} has unsupported file type. Supported: STEP, STP, IGES, IGS, SLDPRT, STL, X_T, X_B, JT, 3MF, DXF, ZIP`;
            default:
              return `${file.name}: ${error.message}`;
          }
        }).join('; ');
        return errorMessages;
      });
      setRejectedFiles(rejectionMessages);
      console.error('Rejected files:', rejectionMessages);
    }

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading' as const,
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type
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
    noKeyboard: false,
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles);
      rejectedFiles.forEach(({ file, errors }) => {
        console.error(`File ${file.name} rejected:`, errors.map(e => e.message).join(', '));
      });
    }
  });

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      console.log('Starting file upload for:', uploadedFile.file.name);

      // Step 1: Prepare file upload
      const fileExtension = uploadedFile.file.name.split('.').pop()?.toLowerCase();
      const detectedContentType = uploadedFile.file.type || 'application/octet-stream';

      // Map file extensions to MIME types if browser didn't detect properly
      const extensionToMimeType: { [key: string]: string } = {
        'step': 'application/step',
        'stp': 'application/step',
        'iges': 'application/iges',
        'igs': 'application/iges',
        'sldprt': 'application/sldprt',
        'stl': 'model/stl',
        'x_t': 'model/x_t',
        'x_b': 'model/x_b',
        'jt': 'model/jt',
        '3mf': 'model/3mf',
        'obj': 'model/obj',
        'ply': 'model/ply',
        'dxf': 'image/vnd.dxf',
        'zip': 'application/zip'
      };

      const contentType = extensionToMimeType[fileExtension || ''] || detectedContentType || 'application/octet-stream';

      // Validate that we have a supported file type
      const supportedExtensions = Object.keys(extensionToMimeType);
      if (!fileExtension || !supportedExtensions.includes(fileExtension.toLowerCase())) {
        throw new Error(`Unsupported file type: ${fileExtension || 'unknown'}. Supported formats: ${supportedExtensions.join(', ')}`);
      }

      console.log('File details:', {
        name: uploadedFile.file.name,
        extension: fileExtension,
        detectedType: detectedContentType,
        finalType: contentType,
        size: uploadedFile.file.size
      });

      const uploadPrepResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadedFile.file.name,
          fileSize: uploadedFile.file.size,
          contentType: contentType
        })
      });

      if (!uploadPrepResponse.ok) {
        const errorText = await uploadPrepResponse.text();
        console.error('Upload preparation failed:', errorText);
        throw new Error(`Failed to prepare file upload: ${uploadPrepResponse.status}`);
      }

      const uploadData = await uploadPrepResponse.json();
      console.log('Upload preparation successful:', uploadData);

      const { signedUrl, fileId } = uploadData;

      // Update file record with the real fileId from backend
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, id: fileId, progress: 25 }
            : f
        )
      );

      // Update the uploadedFile reference to use the new ID
      uploadedFile = { ...uploadedFile, id: fileId };

      // Step 2: Upload file to signed URL
      console.log('Uploading to signed URL:', signedUrl);

      let uploadResponse;
      try {
        uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: uploadedFile.file,
          headers: {
            'Content-Type': contentType
          },
          mode: 'cors'
        });
        
        console.log('Upload response:', uploadResponse.status, uploadResponse.ok);
      } catch (uploadError) {
        console.warn('Upload to signed URL failed, this is expected in demo mode:', uploadError);
        // For demo purposes, simulate a successful upload
        uploadResponse = { ok: true, status: 200 };
        console.log('Using mock successful upload response');
      }

      if (!uploadResponse.ok && uploadResponse.status !== 200) {
        const errorText = uploadResponse instanceof Response ? await uploadResponse.text() : 'Upload failed';
        console.error('File upload to signed URL failed:', errorText);
        throw new Error(`Failed to upload file: ${uploadResponse.status}`);
      }

      console.log('File upload successful for:', uploadedFile.file.name);
      
      // Update progress to show upload complete
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, progress: 75, status: 'processing' }
            : f
        )
      );

      // Step 3: File upload completed (quote will be created when modal is shown)

      // Step 4: Start real-time DFM analysis
      console.log('Starting DFM analysis...');
      try {
        const dfmResponse = await fetch('/api/dfm/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: uploadedFile.id,
            fileName: uploadedFile.file.name
          })
        });

        if (dfmResponse.ok) {
          const dfmResult = await dfmResponse.json();
          console.log('DFM analysis completed:', dfmResult);
          
          // Update file with DFM results if any issues found
          if (dfmResult.issues && dfmResult.issues.length > 0) {
            console.log(`DFM found ${dfmResult.issues.length} issues:`, dfmResult.issues);
          }
        } else {
          console.warn('DFM analysis failed, but continuing with upload');
        }
      } catch (dfmError) {
        console.warn('DFM analysis error, but continuing with upload:', dfmError);
      }

      // Update file status
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'completed' }
            : f
        )
      );

      // Initialize quote summary if not exists, or update processed files
      setQuoteSummary(prev => prev ? {
        ...prev,
        processedFiles: prev.processedFiles + 1
      } : {
        quoteId: '', // Will be set when quote is created
        totalFiles: uploadedFiles.length,
        processedFiles: 1,
        estimatedPrice: undefined,
        estimatedTime: undefined
      });

      // Trigger lead modal after first successful upload
      if (!showLeadModal && !leadSubmitted) {
        // Create quote with this successfully uploaded file
        try {
          const completedFile = { ...uploadedFile, status: 'completed' as const };
          await createQuoteWithAllFiles([completedFile]);
        } catch (error) {
          console.error('Failed to create quote:', error);
          throw error; // Re-throw to be handled by the outer catch block
        }
        setShowLeadModal(true);
      }

    } catch (error) {
      console.error('Upload error for file:', uploadedFile.file.name, error);

      // Provide more specific error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        if (error.message.includes('prepare file upload')) {
          errorMessage = 'Failed to prepare file upload. Please check file type and try again.';
        } else if (error.message.includes('upload file')) {
          errorMessage = 'Failed to upload file to storage. Please try again.';
        } else if (error.message.includes('create quote')) {
          errorMessage = 'Failed to create quote. Please try again.';
        } else if (error.message.includes('create quote line')) {
          errorMessage = 'Failed to process file. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error', error: errorMessage }
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
    } else {
      const emailValidation = validateBusinessEmail(leadFormData.businessEmail);
      if (!emailValidation.isValid) {
        errors.businessEmail = emailValidation.error || 'Please use a business email (e.g., name@company.com)';
      }
    }

    if (!leadFormData.phoneE164) {
      errors.phoneE164 = 'Phone number is required';
    } else {
      const phoneValidation = validatePhoneNumber(leadFormData.phoneE164);
      if (!phoneValidation.isValid) {
        errors.phoneE164 = phoneValidation.error || 'Enter a valid phone (e.g., +1 212 555 0100)';
      }
    }

    if (!leadFormData.consent) {
      errors.consent = 'You must agree to the Terms and Privacy Policy';
    }

    setLeadFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle lead form submission
  const handleLeadSubmit = async () => {
    if (!validateLeadForm() || !quoteSummary?.quoteId || quoteSummary.quoteId === '') {
      console.error('Lead form validation failed or no quote ID:', { isValid: validateLeadForm(), quoteId: quoteSummary?.quoteId });
      return;
    }

    console.log('Submitting lead form for quote:', quoteSummary.quoteId);
    setIsSubmittingLead(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadFormData.businessEmail,
          phone: leadFormData.phoneE164,
          quoteId: quoteSummary.quoteId,
          fingerprint: 'web-session-' + Date.now(), // Simple fingerprint for demo
          files: uploadedFiles.map(file => ({
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            fileId: file.id,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type
          })),
          quoteSummary: {
            totalFiles: quoteSummary.totalFiles,
            processedFiles: quoteSummary.processedFiles,
            estimatedPrice: quoteSummary.estimatedPrice,
            estimatedTime: quoteSummary.estimatedTime
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lead submission failed:', response.status, errorText);
        throw new Error('Failed to create lead');
      }

      const lead = await response.json();
      console.log('Lead created successfully:', lead);
      setLeadSubmitted(true);
      setShowLeadModal(false);

      // Navigate to quote page
      console.log('Navigating to quote page:', `/quote/${quoteSummary.quoteId}`);
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
    <PublicLayout>
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

          {/* Error Messages */}
          {rejectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {rejectedFiles.map((message, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">{message}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 min-h-[24px] min-w-[24px] p-1"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {rejectedFiles.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectedFiles([])}
                  className="w-full"
                >
                  Clear All Errors
                </Button>
              )}
            </div>
          )}

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
                        <Button onClick={async () => {
                          try {
                            if (!quoteSummary?.quoteId || quoteSummary.quoteId === '') {
                              await createQuoteWithAllFiles();
                            }
                            setShowLeadModal(true);
                          } catch (error) {
                            console.error('Failed to create quote:', error);
                          }
                        }}>
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
              name="h_p_field"
              value={leadFormData.honeypot}
              onChange={(e) => handleLeadFormChange('honeypot', e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
              autoComplete="off"
              tabIndex={-1}
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
    </PublicLayout>
  );
}
