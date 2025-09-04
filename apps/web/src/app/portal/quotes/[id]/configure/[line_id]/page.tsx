'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DFMPanel } from '@/components/dfm/DFMPanel';
import { Viewer3D } from '@/components/viewer/Viewer3D';
import {
  ChevronLeftIcon,
  CubeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

// Types based on specification
interface QuoteLine {
  id: string;
  file_id: string;
  file_name: string;
  thumb_url: string;
  qty: number;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish: string | null;
  dfm_summary: { pass: number; warn: number; blocker: number };
  lead_time_options: any[];
  unit_price: number;
  total_price: number;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size_bytes: number;
  url: string;
  is_primary: boolean;
}

interface PartSpec {
  quantity: number;
  process: string;
  material: string;
  finish: string;
  threads: boolean;
  inserts: boolean;
  tolerance_pack: string;
  surface_roughness: string;
  part_marking: string[];
  inspection: string;
  certificates: string[];
  notes: string;
}

export default function EditConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const lineId = params.line_id as string;

  const [line, setLine] = useState<QuoteLine | null>(null);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [spec, setSpec] = useState<PartSpec>({
    quantity: 1,
    process: 'CNC',
    material: '',
    finish: '',
    threads: false,
    inserts: false,
    tolerance_pack: 'Standard (±.005" / ±0.13mm)',
    surface_roughness: '125uin/3.2µm Ra',
    part_marking: [],
    inspection: 'Standard Inspection',
    certificates: [],
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mock data
  const mockLine: QuoteLine = {
    id: lineId,
    file_id: 'file-123',
    file_name: 'bracket.step',
    thumb_url: '/api/placeholder/200/200',
    qty: 50,
    process: 'CNC',
    material: 'Aluminum 6061',
    finish: 'Anodized',
    dfm_summary: { pass: 15, warn: 2, blocker: 0 },
    lead_time_options: [],
    unit_price: 45.50,
    total_price: 2275.00,
  };

  const mockFiles: FileAttachment[] = [
    {
      id: 'file-123',
      name: 'bracket.step',
      type: 'STEP',
      size_bytes: 2457600,
      url: '/api/files/file-123',
      is_primary: true,
    },
    {
      id: 'file-456',
      name: 'bracket-drawing.pdf',
      type: 'PDF',
      size_bytes: 512000,
      url: '/api/files/file-456',
      is_primary: false,
    },
  ];

  useEffect(() => {
    // Track page view
    posthog.capture('edit_config_view', { quote_id: quoteId, line_id: lineId });

    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLine(mockLine);
      setFiles(mockFiles);
      setSpec({
        quantity: mockLine.qty,
        process: mockLine.process,
        material: mockLine.material,
        finish: mockLine.finish || '',
        threads: false,
        inserts: false,
        tolerance_pack: 'Standard (±.005" / ±0.13mm)',
        surface_roughness: '125uin/3.2µm Ra',
        part_marking: [],
        inspection: 'Standard Inspection',
        certificates: [],
        notes: '',
      });
      setLoading(false);
    };

    fetchData();
  }, [quoteId, lineId]);

  const handleSpecChange = (field: keyof PartSpec, value: any) => {
    setSpec(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify(spec) })
      await new Promise(resolve => setTimeout(resolve, 1000));

      posthog.capture('edit_config_save', { quote_id: quoteId, line_id: lineId });
      setHasUnsavedChanges(false);

      // Navigate back to quote detail
      router.push(`/portal/quotes/${quoteId}`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = () => {
    router.push(`/portal/quotes/${quoteId}/analyze/${lineId}`);
    posthog.capture('edit_config_analyze', { quote_id: quoteId, line_id: lineId });
  };

  const handleMakePrimary = async (fileId: string) => {
    try {
      // In real implementation: await fetch(`/api/files/${fileId}/make-primary`, { method: 'PUT' })
      setFiles(prev => prev.map(file =>
        file.id === fileId
          ? { ...file, is_primary: true }
          : { ...file, is_primary: false }
      ));
    } catch (error) {
      console.error('Failed to make file primary:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // In real implementation: await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDfmBadgeColor = (dfm: { pass: number; warn: number; blocker: number }) => {
    if (dfm.blocker > 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (dfm.warn > 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getDfmBadgeText = (dfm: { pass: number; warn: number; blocker: number }) => {
    if (dfm.blocker > 0) return `${dfm.blocker} blockers`;
    if (dfm.warn > 0) return `${dfm.warn} warnings`;
    return `${dfm.pass} checks passed`;
  };

  if (loading || !line) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-80 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
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
              <span className="font-medium text-gray-900">Edit {line.file_name}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleAnalyze}
                className="flex items-center space-x-1"
              >
                <CubeIcon className="w-4 h-4" />
                <span>Analyze</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/portal/quotes/${quoteId}/attachments?line=${lineId}`)}
                className="flex items-center space-x-1"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>Upload Drawings</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                className="flex items-center space-x-1"
              >
                <span>Cancel</span>
              </Button>
              <Button
                onClick={handleSaveConfiguration}
                disabled={saving}
                className="flex items-center space-x-1"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Files Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{file.name}</span>
                            {file.is_primary && (
                              <Badge variant="secondary">Primary File</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {file.type} • {formatFileSize(file.size_bytes)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!file.is_primary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakePrimary(file.id)}
                          >
                            Make Primary
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
                    <p className="text-sm text-gray-500">Max 100MB each</p>
                    <Button variant="outline" className="mt-4">
                      Browse Files
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3D Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>3D Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Viewer3D fileId={line.file_id} />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  100 × 50 × 25 mm | 3.94 × 1.97 × 0.98 in | 0.008 ft³
                </div>
              </CardContent>
            </Card>

            {/* DFM Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>DFM Checks</span>
                  <Badge className={getDfmBadgeColor(line.dfm_summary)}>
                    {getDfmBadgeText(line.dfm_summary)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={handleAnalyze}
                  className="w-full"
                >
                  View Full DFM Feedback
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Part Specification Form */}
            <Card>
              <CardHeader>
                <CardTitle>Part Specification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quantity */}
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={spec.quantity}
                    onChange={(e) => handleSpecChange('quantity', parseInt(e.target.value) || 1)}
                  />
                </div>

                {/* Process */}
                <div>
                  <Label htmlFor="process">Process</Label>
                  <Select value={spec.process} onValueChange={(value) => handleSpecChange('process', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNC">CNC Machining</SelectItem>
                      <SelectItem value="SheetMetal">Sheet Metal</SelectItem>
                      <SelectItem value="InjectionMolding">Injection Molding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Material */}
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={spec.material} onValueChange={(value) => handleSpecChange('material', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aluminum 6061">Aluminum 6061</SelectItem>
                      <SelectItem value="Steel 4140">Steel 4140</SelectItem>
                      <SelectItem value="Stainless Steel 304">Stainless Steel 304</SelectItem>
                      <SelectItem value="Brass">Brass</SelectItem>
                      <SelectItem value="ABS">ABS Plastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Finish */}
                <div>
                  <Label htmlFor="finish">Finish</Label>
                  <Select value={spec.finish} onValueChange={(value) => handleSpecChange('finish', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select finish" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">No Finish</SelectItem>
                      <SelectItem value="Anodized">Anodized</SelectItem>
                      <SelectItem value="Powder Coat">Powder Coat</SelectItem>
                      <SelectItem value="Plated">Plated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="threads"
                      checked={spec.threads}
                      onCheckedChange={(checked) => handleSpecChange('threads', checked)}
                    />
                    <Label htmlFor="threads">Threads</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inserts"
                      checked={spec.inserts}
                      onCheckedChange={(checked) => handleSpecChange('inserts', checked)}
                    />
                    <Label htmlFor="inserts">Inserts</Label>
                  </div>
                </div>

                {/* Tolerance Pack */}
                <div>
                  <Label>Tolerance Pack</Label>
                  <RadioGroup
                    value={spec.tolerance_pack}
                    onValueChange={(value) => handleSpecChange('tolerance_pack', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Standard (±.005&quot; / ±0.13mm)" id="standard" />
                      <Label htmlFor="standard">Standard (±.005" / ±0.13mm)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Tight (±.002&quot; / ±0.05mm)" id="tight" />
                      <Label htmlFor="tight">Tight (±.002" / ±0.05mm)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Critical (custom)" id="critical" />
                      <Label htmlFor="critical">Critical (custom)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Surface Roughness */}
                <div>
                  <Label htmlFor="roughness">Surface Roughness</Label>
                  <Select value={spec.surface_roughness} onValueChange={(value) => handleSpecChange('surface_roughness', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="125uin/3.2µm Ra">125uin/3.2µm Ra</SelectItem>
                      <SelectItem value="63uin/1.6µm Ra">63uin/1.6µm Ra</SelectItem>
                      <SelectItem value="32uin/0.8µm Ra">32uin/0.8µm Ra</SelectItem>
                      <SelectItem value="16uin/0.4µm Ra">16uin/0.4µm Ra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Special Instructions</Label>
                  <textarea
                    id="notes"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={spec.notes}
                    onChange={(e) => handleSpecChange('notes', e.target.value)}
                    placeholder="Special instructions, prior order refs..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Price & Lead Time Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Price & Lead Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  Save your configuration to select a lead time on the Quote page.
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Estimated Unit Price:</span>
                    <span className="font-medium">${line.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span>{spec.quantity}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>${(line.unit_price * spec.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Unsaved Changes</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            You have unsaved changes. Click Save Configuration to apply them.
          </p>
        </div>
      )}
    </div>
  );
}
