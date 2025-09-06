'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetricsPanelProps {
  metrics?: {
    triangles?: number;
    volume?: number;
    surfaceArea?: number;
    boundingBox?: {
      width: number;
      height: number;
      depth: number;
    };
  };
  className?: string;
}

export function MetricsPanel({ metrics, className = '' }: MetricsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Model Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {metrics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Triangles</p>
                <p className="text-lg font-semibold">{metrics.triangles?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Volume</p>
                <p className="text-lg font-semibold">
                  {metrics.volume ? `${metrics.volume.toFixed(2)} mm³` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Surface Area</p>
                <p className="text-lg font-semibold">
                  {metrics.surfaceArea ? `${metrics.surfaceArea.toFixed(2)} mm²` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bounding Box</p>
                <p className="text-lg font-semibold">
                  {metrics.boundingBox
                    ? `${metrics.boundingBox.width}×${metrics.boundingBox.height}×${metrics.boundingBox.depth} mm`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <Badge variant="secondary" className="w-full justify-center">
                Analysis Complete
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No metrics available</p>
            <p className="text-sm text-gray-500 mt-2">Upload and analyze a model to see metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
