'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface Model3DViewerProps {
  fileName?: string;
  fileType?: string;
}

// Dynamically import the Canvas component with SSR disabled
const Canvas3D = dynamic(() => import('./Canvas3D').then(mod => ({ default: mod.Canvas3D })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading 3D viewer...</p>
      </div>
    </div>
  )
});

export default function Model3DViewer({ fileName, fileType }: Model3DViewerProps) {
  return <Canvas3D fileName={fileName} fileType={fileType} />;
}
