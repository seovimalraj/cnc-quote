'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowUpTrayIcon as UploadIcon,
  DocumentIcon as FileIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CogIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import PublicLayout from '@/components/PublicLayout';

interface DFMOptions {
  tolerances: Array<{ id: string; name: string; description: string }>;
  finishes: Array<{ id: string; name: string; description: string }>;
  industries: Array<{ id: string; name: string; description: string }>;
  certifications: Array<{ id: string; name: string; description: string }>;
  criticality: Array<{ id: string; name: string; description: string }>;
}

interface FormData {
  cadFile: File | null;
  tolerancePack: string;
  surfaceFinish: string;
  industry: string;
  certifications: string[];
  criticality: string;
  notes: string;
}

const ACCEPTED_FILE_TYPES = [
  'application/step',
  'application/x-step',
  'application/iges',
  'application/x-iges',
  'application/sldprt',
  'model/x-t',
  'model/x-b',
  'application/x-jt',
  'model/3mf',
  'image/vnd.dxf',
  'application/vnd.ms-pki.stl',
  'application/zip',
  'application/x-zip-compressed'
];

const FILE_EXTENSIONS = [
  '.step', '.stp', '.iges', '.igs', '.sldprt',
  '.x_t', '.x_b', '.jt', '.3mf', '.dxf', '.stl', '.zip'
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function DFMAnalysisPage() {
  const router = useRouter();
  const [options, setOptions] = useState<DFMOptions>({
    tolerances: [
      { id: 'tight', name: 'Tight (±0.002")', description: 'High precision machining' },
      { id: 'standard', name: 'Standard (±0.005")', description: 'Standard manufacturing tolerances' },
      { id: 'loose', name: 'Loose (±0.010")', description: 'Basic manufacturing tolerances' }
    ],
    finishes: [
      { id: 'as_machined', name: 'As Machined', description: 'No additional finishing' },
      { id: 'bead_blast', name: 'Bead Blast', description: 'Smooth surface finish' },
      { id: 'anodized', name: 'Anodized', description: 'Corrosion resistant coating' }
    ],
    industries: [
      { id: 'aerospace', name: 'Aerospace', description: 'Aerospace and defense' },
      { id: 'automotive', name: 'Automotive', description: 'Automotive industry' },
      { id: 'medical', name: 'Medical', description: 'Medical devices' },
      { id: 'general', name: 'General', description: 'General manufacturing' }
    ],
    certifications: [
      { id: 'iso_9001', name: 'ISO 9001', description: 'Quality management systems' },
      { id: 'as9100', name: 'AS9100', description: 'Aerospace quality management' },
      { id: 'none', name: 'None', description: 'No specific certification required' }
    ],
    criticality: [
      { id: 'low', name: 'Low', description: 'Non-critical component' },
      { id: 'medium', name: 'Medium', description: 'Standard criticality' },
      { id: 'high', name: 'High', description: 'Critical component' },
      { id: 'extreme', name: 'Extreme', description: 'Mission-critical component' }
    ]
  });
  const [formData, setFormData] = useState<FormData>({
    cadFile: null,
    tolerancePack: '',
    surfaceFinish: '',
    industry: '',
    certifications: [],
    criticality: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setIsLoading(true);
      const [tolerancesRes, finishesRes, industriesRes, certificationsRes, criticalityRes] = await Promise.all([
        fetch('/api/dfm/options/tolerances').catch(() => ({ ok: false })),
        fetch('/api/dfm/options/finishes').catch(() => ({ ok: false })),
        fetch('/api/dfm/options/industries').catch(() => ({ ok: false })),
        fetch('/api/dfm/options/certifications').catch(() => ({ ok: false })),
        fetch('/api/dfm/options/criticality').catch(() => ({ ok: false }))
      ]);

      // Provide fallback mock data if API fails
      const mockTolerances = [
        { id: 'tight', name: 'Tight (±0.002")', description: 'High precision machining' },
        { id: 'standard', name: 'Standard (±0.005")', description: 'Standard manufacturing tolerances' },
        { id: 'loose', name: 'Loose (±0.010")', description: 'Basic manufacturing tolerances' }
      ];

      const mockFinishes = [
        { id: 'as_machined', name: 'As Machined', description: 'No additional finishing' },
        { id: 'bead_blast', name: 'Bead Blast', description: 'Smooth surface finish' },
        { id: 'anodized', name: 'Anodized', description: 'Corrosion resistant coating' }
      ];

      const mockIndustries = [
        { id: 'aerospace', name: 'Aerospace', description: 'Aerospace and defense' },
        { id: 'automotive', name: 'Automotive', description: 'Automotive industry' },
        { id: 'medical', name: 'Medical', description: 'Medical devices' },
        { id: 'general', name: 'General', description: 'General manufacturing' }
      ];

      const mockCertifications = [
        { id: 'iso_9001', name: 'ISO 9001', description: 'Quality management systems' },
        { id: 'as9100', name: 'AS9100', description: 'Aerospace quality management' },
        { id: 'none', name: 'None', description: 'No specific certification required' }
      ];

      const mockCriticality = [
        { id: 'low', name: 'Low', description: 'Non-critical component' },
        { id: 'medium', name: 'Medium', description: 'Standard criticality' },
        { id: 'high', name: 'High', description: 'Critical component' },
        { id: 'extreme', name: 'Extreme', description: 'Mission-critical component' }
      ];

      const [tolerances, finishes, industries, certifications, criticality] = await Promise.all([
        tolerancesRes.ok ? tolerancesRes.json() : Promise.resolve(mockTolerances),
        finishesRes.ok ? finishesRes.json() : Promise.resolve(mockFinishes),
        industriesRes.ok ? industriesRes.json() : Promise.resolve(mockIndustries),
        certificationsRes.ok ? certificationsRes.json() : Promise.resolve(mockCertifications),
        criticalityRes.ok ? criticalityRes.json() : Promise.resolve(mockCriticality)
      ]);

      setOptions({
        tolerances,
        finishes,
        industries,
        certifications,
        criticality
      });
    } catch (err) {
      setError('Failed to load form options');
    } finally {
      setIsLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file size (200MB limit)
    if (file.size > 200 * 1024 * 1024) {
      return 'File size must be less than 200MB';
    }

    // Check file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type) &&
        !FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return 'Unsupported file format. Please upload a supported CAD file.';
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFormData(prev => ({ ...prev, cadFile: file }));
    setError(null);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleCertificationToggle = (certId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      certifications: checked
        ? [...prev.certifications, certId]
        : prev.certifications.filter(id => id !== certId)
    }));
  };

  const uploadFileWithProgress = (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cadFile) {
      setError('Please select a CAD file to upload');
      return;
    }

    if (!formData.tolerancePack || !formData.surfaceFinish || !formData.industry || !formData.criticality) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(0);

      // First, get signed upload URL
      const uploadResponse = await fetch('/api/dfm/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: formData.cadFile.name,
          fileSize: formData.cadFile.size,
          contentType: formData.cadFile.type
        })
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileId } = await uploadResponse.json();

      // Upload file with progress tracking
      await uploadFileWithProgress(formData.cadFile, uploadUrl);

      // Create DFM request
      const dfmResponse = await fetch('/api/dfm/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          tolerancePack: formData.tolerancePack,
          surfaceFinish: formData.surfaceFinish,
          industry: formData.industry,
          certifications: formData.certifications,
          criticality: formData.criticality,
          notes: formData.notes
        })
      });

      if (!dfmResponse.ok) {
        throw new Error('DFM request creation failed');
      }

      const { requestId } = await dfmResponse.json();

      // Redirect to results page
      router.push(`/dfm-analysis/${requestId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis request failed');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DFM analysis form...</p>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Design for Manufacturability (DFM) Analysis
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Upload your CAD file and select specifications to receive a comprehensive 20-point DFM report.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CogIcon className="h-6 w-6 mr-2" />
                  DFM Analysis Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* CAD File Upload */}
                  <div>
                    <Label htmlFor="cadFile" className="text-base font-medium">
                      Upload Part *
                    </Label>
                    <div
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {formData.cadFile ? (
                        <div className="flex items-center justify-center space-x-3">
                          <FileIcon className="h-8 w-8 text-green-600" />
                          <div className="text-left">
                            <p className="font-medium text-green-600">{formData.cadFile.name}</p>
                            <p className="text-sm text-gray-600">
                              {(formData.cadFile.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, cadFile: null }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label htmlFor="cadFile" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Drop your CAD file here, or{' '}
                                <span className="text-blue-600 hover:text-blue-500">browse</span>
                              </span>
                            </label>
                            <input
                              id="cadFile"
                              name="cadFile"
                              type="file"
                              className="sr-only"
                              accept={ACCEPTED_FILE_TYPES.join(',')}
                              onChange={handleFileInput}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Supported: STEP, IGES, Parasolid, SLDPRT, JT, 3MF, DXF, STL, ZIP (max 200MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tolerance Pack */}
                  <div className="space-y-2">
                    <Label htmlFor="tolerancePack">Tolerance Pack</Label>
                    <Select value={formData.tolerancePack} onValueChange={(value) => setFormData(prev => ({ ...prev, tolerancePack: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tolerance pack" />
                      </SelectTrigger>
                      <SelectContent>
                        {(options?.tolerances || []).map((tolerance) => (
                          <SelectItem key={tolerance.id} value={tolerance.id}>
                            {tolerance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Surface Finish */}
                  <div className="space-y-2">
                    <Label htmlFor="surfaceFinish">Surface Finish</Label>
                    <Select value={formData.surfaceFinish} onValueChange={(value) => setFormData(prev => ({ ...prev, surfaceFinish: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select surface finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {(options?.finishes || []).map((finish) => (
                          <SelectItem key={finish.id} value={finish.id}>
                            {finish.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tolerance Selection */}
                  <div>
                    <Label htmlFor="tolerance-select">Tolerance Pack</Label>
                    <Select value={selectedTolerance} onValueChange={setSelectedTolerance}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tolerance pack" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.tolerances.map((tolerance) => (
                          <SelectItem key={tolerance.id} value={tolerance.id}>
                            {tolerance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Surface Finish */}
                  <div>
                    <Label htmlFor="surfaceFinish">Surface Finish *</Label>
                    <Select
                      value={formData.surfaceFinish}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, surfaceFinish: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select surface finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.finishes.map((finish) => (
                          <SelectItem key={finish.id} value={finish.id}>
                            {finish.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Industry */}
                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {(options?.industries || []).map((industry) => (
                          <SelectItem key={industry.id} value={industry.id}>
                            {industry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Certifications */}
                  <div>
                    <Label>Required Certifications</Label>
                    <div className="mt-2 space-y-2">
                      {(options?.certifications || []).map((cert) => (
                        <div key={cert.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={cert.id}
                            checked={formData.certifications.includes(cert.id)}
                            onCheckedChange={(checked) =>
                              handleCertificationToggle(cert.id, checked as boolean)
                            }
                          />
                          <Label htmlFor={cert.id} className="text-sm">
                            {cert.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Criticality */}
                  <div>
                    <Label htmlFor="criticality">Part Criticality *</Label>
                    <Select
                      value={formData.criticality}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, criticality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select criticality" />
                      </SelectTrigger>
                      <SelectContent>
                        {(options?.criticality || []).map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special requirements or notes..."
                      maxLength={2000}
                      rows={4}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.notes.length}/2000 characters
                    </p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {uploadProgress > 0 ? 'Uploading...' : 'Creating Analysis...'}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <CogIcon className="h-5 w-5 mr-2" />
                        Run DFM Analysis
                        <ArrowRightIcon className="h-5 w-5 ml-2" />
                      </div>
                    )}
                  </Button>

                  {/* Progress Bar */}
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Upload Progress</span>
                        <span>{uploadProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Supported Formats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <InformationCircleIcon className="h-5 w-5 mr-2" />
                  Supported Formats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• STEP, STP</p>
                  <p>• IGES, IGS</p>
                  <p>• Parasolid (X_T, X_B)</p>
                  <p>• SLDPRT</p>
                  <p>• JT</p>
                  <p>• 3MF</p>
                  <p>• DXF</p>
                  <p>• STL (optional)</p>
                  <p>• ZIP assemblies</p>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Maximum file size: 200MB
                </p>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your files are private and encrypted at rest. We use signed URLs and organization scoping to ensure your data remains secure.
                </p>
              </CardContent>
            </Card>

            {/* What to Expect */}
            <Card>
              <CardHeader>
                <CardTitle>What to Expect</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>20-point manufacturability analysis</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Detailed recommendations</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Cost optimization suggestions</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Processing time: 2-5 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
