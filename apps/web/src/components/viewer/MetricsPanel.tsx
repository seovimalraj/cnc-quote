'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MetricsPanelProps {
  metrics: {
    volume: number;
    surface_area: number;
    bbox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    primitive_features: {
      holes: number;
      pockets: number;
      slots: number;
      faces: number;
    };
  };
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const formatNumber = (num: number) => num.toFixed(2);
  
  const dimensions = {
    x: metrics.bbox.max.x - metrics.bbox.min.x,
    y: metrics.bbox.max.y - metrics.bbox.min.y,
    z: metrics.bbox.max.z - metrics.bbox.min.z,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Part Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Volume</p>
              <p className="text-2xl">{formatNumber(metrics.volume)} cm³</p>
            </div>
            <div>
              <p className="text-sm font-medium">Surface Area</p>
              <p className="text-2xl">{formatNumber(metrics.surface_area)} cm²</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Dimensions</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Length</p>
                <p className="text-lg">{formatNumber(dimensions.x)} mm</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Width</p>
                <p className="text-lg">{formatNumber(dimensions.y)} mm</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="text-lg">{formatNumber(dimensions.z)} mm</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Features</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Holes</p>
                <p className="text-lg">{metrics.primitive_features.holes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pockets</p>
                <p className="text-lg">{metrics.primitive_features.pockets}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slots</p>
                <p className="text-lg">{metrics.primitive_features.slots}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faces</p>
                <p className="text-lg">{metrics.primitive_features.faces}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
