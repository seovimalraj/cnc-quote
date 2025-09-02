'use client';

import { FC } from 'react';

interface ModelViewerProps {
  url: string;
  showWireframe?: boolean;
}

export const ModelViewer: FC<ModelViewerProps> = ({ url, showWireframe = false }) => {
  return (
    <div className="w-full h-[500px] bg-background border rounded-lg flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p>3D Model Viewer</p>
        <p className="text-sm mt-2">Model: {url}</p>
        {showWireframe && <p className="text-sm">Wireframe mode enabled</p>}
      </div>
    </div>
  );
};