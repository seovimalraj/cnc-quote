'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type { LeadCapture } from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

const SUPPORTED_FORMATS = [
  'STEP', 'STP', 'IGES', 'STL', 'OBJ', '3MF', 'PLY'
];

const MATERIALS = [
  { id: 'aluminum_6061', name: 'Aluminum 6061', cost_per_kg: 8.50 },
  { id: 'steel_1018', name: 'Steel 1018', cost_per_kg: 4.20 },
  { id: 'stainless_304', name: 'Stainless Steel 304', cost_per_kg: 12.00 },
  { id: 'brass_360', name: 'Brass 360', cost_per_kg: 9.80 },
  { id: 'plastic_abs', name: 'ABS Plastic', cost_per_kg: 3.20 }
];

export default function InstantQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [leadData, setLeadData] = useState<Partial<LeadCapture>>({
    email: '',
    company: '',
    phone: ''
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'details' | 'lead' | 'result'>('upload');

  // Check if embedded
  const isEmbedded = searchParams.get('embed') === 'true';
  const partnerId = searchParams.get('partner');

  useEffect(() => {
    // Track page view
    trackEvent('instant_quote_view', {
      embedded: isEmbedded,
      partner_id: partnerId
    });

    // Handle embed communication
    if (isEmbedded) {
      const handleMessage = (event: MessageEvent) => {
        // Validate origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'INIT_QUOTE') {
          // Handle initialization from parent
          console.log('Quote initialized from embed');
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isEmbedded, partnerId]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }

      if (!SUPPORTED_FORMATS.includes(extension?.toUpperCase() || '')) {
        setError(`${file.name} has an unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setFiles(validFiles);
      setError(null);
      trackEvent('quote_file_uploaded', {
        file_count: validFiles.length,
        file_types: validFiles.map(f => f.name.split('.').pop()).join(',')
      });
    }
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one CAD file.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Mock upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setCurrentStep('details');
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedMaterial) {
      setError('Please select a material.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      trackEvent('quote_analysis_started', {
        material: selectedMaterial,
        quantity: parseInt(quantity)
      });

      // Mock analysis process (simulate CAD analysis time)
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Mock quote result
      const mockQuote = {
        id: 'quote_' + Date.now(),
        material: MATERIALS.find(m => m.id === selectedMaterial),
        quantity: parseInt(quantity),
        unit_price: 45.67,
        total_price: 45.67 * parseInt(quantity),
        machining_time: 2.5,
        material_cost: 12.34,
        processing_fee: 8.90,
        estimated_delivery: '7-10 business days',
        analysis_complete: true
      };

      setQuoteResult(mockQuote);
      setCurrentStep('lead');

      trackEvent('quote_analysis_complete', {
        quote_id: mockQuote.id,
        total_price: mockQuote.total_price,
        analysis_time: 8
      });

    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLeadCapture = async () => {
    if (!leadData.email) {
      setError('Please provide your email address.');
      return;
    }

    try {
      trackEvent('quote_lead_captured', {
        has_company: !!leadData.company,
        has_phone: !!leadData.phone
      });

      // Mock lead capture
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep('result');

      // Send message to parent if embedded
      if (isEmbedded) {
        window.parent.postMessage({
          type: 'QUOTE_COMPLETE',
          quote: quoteResult,
          lead: leadData
        }, '*');
      }

    } catch (err) {
      setError('Failed to process your information. Please try again.');
    }
  };

  const handleProceedToOrder = () => {
    trackEvent('quote_proceed_to_order', {
      quote_id: quoteResult?.id,
      embedded: isEmbedded
    });

    if (isEmbedded) {
      // Redirect to partner's order flow
      window.parent.postMessage({
        type: 'PROCEED_TO_ORDER',
        quote: quoteResult
      }, '*');
    } else {
      // Redirect to portal order flow
      router.push(`/portal/orders/new?quote=${quoteResult?.id}`);
    }
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CloudArrowUpIcon className="w-5 h-5" />
          <span>Upload Your CAD Files</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="file-upload">Select CAD Files</Label>
          <div className="mt-2">
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".step,.stp,.iges,.stl,.obj,.3mf,.ply"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
            >
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your CAD files here, or click to browse
              </p>
              <p className="text-sm text-gray-600">
                Supports: {SUPPORTED_FORMATS.join(', ')} (Max 50MB per file)
              </p>
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {file.name.split('.').pop()?.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? 'Uploading...' : 'Upload & Continue'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="material">Material</Label>
          <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name} - ${material.cost_per_kg}/kg
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max="10000"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setCurrentStep('upload')}>
            Back
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!selectedMaterial || analyzing}
            className="flex-1"
          >
            {analyzing ? 'Analyzing...' : 'Get Quote'}
          </Button>
        </div>

        {analyzing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analyzing your CAD files...</span>
              <span>This may take up to 20 seconds</span>
            </div>
            <Progress value={75} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderLeadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <p className="text-sm text-gray-600">
          Provide your details to receive the quote and proceed with ordering.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={leadData.email}
            onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <Label htmlFor="company">Company (Optional)</Label>
          <Input
            id="company"
            value={leadData.company}
            onChange={(e) => setLeadData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Enter your company name"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input
            id="phone"
            value={leadData.phone}
            onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Enter your phone number"
          />
        </div>

        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setCurrentStep('details')}>
            Back
          </Button>
          <Button onClick={handleLeadCapture} className="flex-1">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderResultStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span>Quote Generated Successfully</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Quote Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Material:</span>
                  <span>{quoteResult?.material?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{quoteResult?.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span>${quoteResult?.unit_price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${quoteResult?.total_price?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Additional Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Machining Time:</span>
                  <span>{quoteResult?.machining_time}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Delivery:</span>
                  <span>{quoteResult?.estimated_delivery}</span>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-600">
                    Prices include material and machining. Shipping calculated at checkout.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => setCurrentStep('lead')} className="flex-1">
              Edit Details
            </Button>
            <Button onClick={handleProceedToOrder} className="flex-1">
              Proceed to Order
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Instant Quote</h1>
            <p className="text-gray-600 mt-2">
              Upload your CAD files and get an instant CNC machining quote
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {['upload', 'details', 'lead', 'result'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    ['upload', 'details', 'lead', 'result'].indexOf(currentStep) >= index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      ['upload', 'details', 'lead', 'result'].indexOf(currentStep) > index
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'details' && renderDetailsStep()}
          {currentStep === 'lead' && renderLeadStep()}
          {currentStep === 'result' && renderResultStep()}
        </div>
      </div>
    </div>
  );
}
