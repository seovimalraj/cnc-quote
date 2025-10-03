/**
 * 3D Viewer Integration Example
 * 
 * This file demonstrates how to integrate the CadViewer3D component
 * into the instant quote page with full functionality
 */

'use client';

import React, { useState, useCallback } from 'react';
import { CadViewer3D, Measurement, Feature } from '@/components/viewer/CadViewer3D';
import { loadCadFile, LoadedModel } from '@/lib/cad-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CadViewerSectionProps {
  fileUrl: string;
  fileName: string;
  fileType: 'stl' | 'step' | 'stp' | 'obj' | 'iges' | 'igs';
  onMeasurementsChange?: (measurements: Measurement[]) => void;
  onFeaturesDetected?: (features: Feature[]) => void;
}

export function CadViewerSection({
  fileUrl,
  fileName,
  fileType,
  onMeasurementsChange,
  onFeaturesDetected,
}: CadViewerSectionProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [modelInfo, setModelInfo] = useState<LoadedModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load CAD file and extract metadata
  const handleViewerReady = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Load CAD file with full metadata
      const loaded = await loadCadFile(fileUrl, fileType, {
        center: true,
        optimize: true,
        calculateMetrics: true,
        onProgress: (progress) => {
          console.log(`Loading: ${progress.percentage.toFixed(1)}%`);
        },
      });

      setModelInfo(loaded);

      // Detect features (holes, pockets, etc.)
      // This would call the feature detection algorithm
      // For now, using mock data
      const detectedFeatures: Feature[] = [
        {
          id: '1',
          type: 'hole',
          position: [10, 20, 0],
          properties: {
            diameter: 5.0,
            depth: 15.0,
            type: 'through-hole',
          },
          highlighted: false,
        },
        // More features would be auto-detected
      ];

      setFeatures(detectedFeatures);
      onFeaturesDetected?.(detectedFeatures);
    } catch (error) {
      console.error('Failed to load CAD file:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load CAD file');
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, fileType, onFeaturesDetected]);

  // Handle measurement creation
  const handleMeasurementCreate = useCallback(
    (measurement: Measurement) => {
      const newMeasurements = [...measurements, measurement];
      setMeasurements(newMeasurements);
      onMeasurementsChange?.(newMeasurements);
    },
    [measurements, onMeasurementsChange]
  );

  // Handle feature click
  const handleFeatureClick = useCallback((feature: Feature) => {
    console.log('Feature clicked:', feature);
    // Could show feature details in a modal or sidebar
  }, []);

  // Delete measurement
  const deleteMeasurement = useCallback((id: string) => {
    const updated = measurements.filter((m) => m.id !== id);
    setMeasurements(updated);
    onMeasurementsChange?.(updated);
  }, [measurements, onMeasurementsChange]);

  return (
    <div className="space-y-4">
      {/* 3D Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>3D Model Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Viewer Container */}
            <div className="relative bg-gray-50 rounded-lg overflow-hidden">
              <CadViewer3D
                modelUrl={fileUrl}
                fileType={fileType}
                showMeasurementTools={true}
                showCrossSectionControls={true}
                features={features}
                onMeasurementCreate={handleMeasurementCreate}
                onFeatureClick={handleFeatureClick}
              />
            </div>

            {/* Model Information */}
            {modelInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Dimensions</div>
                  <div className="font-semibold">
                    {modelInfo.size.x.toFixed(1)} × {modelInfo.size.y.toFixed(1)} × {modelInfo.size.z.toFixed(1)} mm
                  </div>
                </div>

                {modelInfo.volume && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Volume</div>
                    <div className="font-semibold">
                      {(modelInfo.volume / 1000).toFixed(2)} cm³
                    </div>
                  </div>
                )}

                {modelInfo.surfaceArea && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Surface Area</div>
                    <div className="font-semibold">
                      {(modelInfo.surfaceArea / 100).toFixed(2)} cm²
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Features</div>
                  <div className="font-semibold">{features.length} detected</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Measurements Panel */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{measurement.type}</Badge>
                    <span className="font-semibold">
                      {measurement.value.toFixed(2)} {measurement.unit}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMeasurement(measurement.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Features Panel */}
      {features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => handleFeatureClick(feature)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {feature.type}
                      </Badge>
                      {feature.properties && (
                        <div className="text-sm text-gray-600">
                          {Object.entries(feature.properties).map(([key, value]) => (
                            <div key={key}>
                              {key}: {value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">Failed to load 3D model</p>
          <p className="text-red-600 text-sm mt-1">{loadError}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Usage Example in Instant Quote Page:
 * 
 * ```tsx
 * import { CadViewerSection } from '@/components/viewer/CadViewerSection';
 * 
 * // Inside your component:
 * const [uploadedFile, setUploadedFile] = useState<{url: string, name: string, type: string}>();
 * 
 * {uploadedFile && (
 *   <CadViewerSection
 *     fileUrl={uploadedFile.url}
 *     fileName={uploadedFile.name}
 *     fileType={uploadedFile.type as 'stl' | 'step'}
 *     onMeasurementsChange={(measurements) => {
 *       // Save measurements for quote calculation
 *       console.log('Measurements:', measurements);
 *     }}
 *     onFeaturesDetected={(features) => {
 *       // Use features for DFM analysis
 *       console.log('Features:', features);
 *     }}
 *   />
 * )}
 * ```
 */
