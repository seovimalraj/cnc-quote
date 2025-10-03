"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Upload,
  FileText,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Download,
  Share2,
  History
} from 'lucide-react';
import { AdvancedViewer3D } from './AdvancedViewer3D';
import { SmartRecommendations } from './SmartRecommendations';
import { LiveMaterialComparison } from './LiveMaterialComparison';
import type { Feature, Measurement } from '../viewer/CadViewer3D';

interface QuickStats {
  estimatedPrice: number;
  leadTimeDays: number;
  manufacturabilityScore: number;
  confidence: number;
}

interface PartData {
  id: string;
  name: string;
  meshUrl: string;
  volume: number; // cubic inches
  surfaceArea: number; // square inches
  boundingBox: { x: number; y: number; z: number };
  complexity: number; // 0-1
}

export function EnhancedInstantQuote() {
  const [uploadedPart, setUploadedPart] = useState<PartData | null>(null);
  const [detectedFeatures, setDetectedFeatures] = useState<Feature[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('al-6061');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  // Simulate file upload and processing
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    // Simulate upload and processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock part data
    const mockPart: PartData = {
      id: 'part-' + Date.now(),
      name: file.name,
      meshUrl: '/api/geometry/mock-part/mesh?lod=low',
      volume: 8.5,
      surfaceArea: 42.3,
      boundingBox: { x: 100, y: 80, z: 30 },
      complexity: 0.65
    };

    // Mock quick stats
    const mockStats: QuickStats = {
      estimatedPrice: 245.50,
      leadTimeDays: 6,
      manufacturabilityScore: 8.5,
      confidence: 0.92
    };

    setUploadedPart(mockPart);
    setQuickStats(mockStats);
    setIsProcessing(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.step') || file.name.endsWith('.stl') || file.name.endsWith('.stp'))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFeaturesDetected = useCallback((features: Feature[]) => {
    setDetectedFeatures(features);
  }, []);

  const handleMeasurementCreate = useCallback((measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
  }, []);

  const handleMaterialChange = useCallback((materialId: string) => {
    setSelectedMaterial(materialId);
    // Recalculate pricing
    if (quickStats) {
      setQuickStats({
        ...quickStats,
        estimatedPrice: quickStats.estimatedPrice * (0.9 + Math.random() * 0.2)
      });
    }
  }, [quickStats]);

  const exportQuote = useCallback(() => {
    console.log('Exporting quote...');
    // Implementation for PDF export
  }, []);

  const saveQuote = useCallback(() => {
    console.log('Saving quote...');
    // Implementation for saving to database
  }, []);

  // Calculate updated stats based on quantity
  const calculatedStats = useMemo(() => {
    if (!quickStats) return null;
    
    const unitPrice = quickStats.estimatedPrice;
    
    // Calculate quantity discount
    let quantityDiscount = 1.0;
    if (quantity >= 10) quantityDiscount = 0.65;
    else if (quantity >= 5) quantityDiscount = 0.80;
    else if (quantity >= 3) quantityDiscount = 0.90;
    
    const totalPrice = unitPrice * quantity * quantityDiscount;
    
    return {
      ...quickStats,
      unitPrice: unitPrice * quantityDiscount,
      totalPrice,
      quantityDiscount: (1 - quantityDiscount) * 100
    };
  }, [quickStats, quantity]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Advanced Instant Quote
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  AI-powered manufacturing analysis & pricing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </button>
              {uploadedPart && (
                <>
                  <button 
                    onClick={saveQuote}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Save Quote
                  </button>
                  <button 
                    onClick={exportQuote}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-md">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {!uploadedPart ? (
          /* Upload Zone */
          <div className="max-w-4xl mx-auto">
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
              className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-16 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800 shadow-lg"
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-pulse" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Processing your file...
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Analyzing geometry, detecting features, and calculating pricing
                  </p>
                  <div className="max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-[width_2s_ease-in-out]" style={{ width: '75%' }} />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Upload Your CAD File
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Drag & drop your STEP, STL, or IGES file here
                  </p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg">
                    <Upload className="w-5 h-5" />
                    Choose File
                    <input
                      id="file-input"
                      type="file"
                      accept=".step,.stp,.stl,.iges,.igs"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instant Analysis</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Auto-detect features & geometry
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Smart Pricing</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Real-time quotes with alternatives
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Recommendations</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Optimize cost & manufacturability
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Quote Workspace */
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Config */}
            <div className="col-span-3 space-y-4">
              {/* Part Info */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">PART DETAILS</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Volume:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{uploadedPart.volume.toFixed(2)} in³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Surface Area:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{uploadedPart.surfaceArea.toFixed(2)} in²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Bounding Box:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                      {uploadedPart.boundingBox.x}×{uploadedPart.boundingBox.y}×{uploadedPart.boundingBox.z}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Complexity:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {(uploadedPart.complexity * 10).toFixed(1)}/10
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">QUANTITY</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-300"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-4 py-2 text-center text-lg font-bold bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-300"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  {[1, 5, 10, 25, 50, 100].map(qty => (
                    <button
                      key={qty}
                      onClick={() => setQuantity(qty)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        quantity === qty
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              {calculatedStats && (
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg text-white shadow-lg">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold">${calculatedStats.totalPrice.toFixed(2)}</div>
                    <div className="text-xs opacity-90">
                      ${calculatedStats.unitPrice.toFixed(2)} per part
                    </div>
                    {calculatedStats.quantityDiscount > 0 && (
                      <div className="mt-2 inline-block px-2 py-1 bg-white/20 rounded text-xs font-semibold">
                        ↓{calculatedStats.quantityDiscount.toFixed(0)}% volume discount
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white/10 rounded">
                      <Clock className="w-3 h-3 mb-1" />
                      <div className="font-semibold">{calculatedStats.leadTimeDays} days</div>
                      <div className="opacity-75">Lead Time</div>
                    </div>
                    <div className="p-2 bg-white/10 rounded">
                      <CheckCircle2 className="w-3 h-3 mb-1" />
                      <div className="font-semibold">{calculatedStats.manufacturabilityScore}/10</div>
                      <div className="opacity-75">Mfg Score</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Comparison */}
              <LiveMaterialComparison
                currentMaterial={selectedMaterial}
                partVolume={uploadedPart.volume}
                quantity={quantity}
                onMaterialChange={handleMaterialChange}
              />
            </div>

            {/* Center - 3D Viewer */}
            <div className="col-span-6">
              <AdvancedViewer3D
                meshUrl={uploadedPart.meshUrl}
                partId={uploadedPart.id}
                onFeaturesDetected={handleFeaturesDetected}
                onMeasurementCreate={handleMeasurementCreate}
              />
            </div>

            {/* Right Sidebar - Recommendations */}
            <div className="col-span-3">
              <SmartRecommendations
                features={detectedFeatures}
                currentMaterial={selectedMaterial}
                currentProcess="CNC"
                currentQuantity={quantity}
                partComplexity={uploadedPart.complexity}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
