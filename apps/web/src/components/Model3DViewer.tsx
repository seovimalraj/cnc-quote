'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import { Box, Sphere, Cylinder, Plane } from '@react-three/drei';
import * as THREE from 'three';

interface Model3DViewerProps {
  fileName?: string;
  fileType?: string;
}

// Mock 3D model component - in production this would load actual CAD files
function MockModel({ fileName }: { fileName?: string }) {
  return (
    <group>
      {/* Main body */}
      <Box args={[2, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#e5e7eb" />
      </Box>

      {/* Holes */}
      <Cylinder args={[0.1, 0.1, 0.2]} position={[0.5, 0.6, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.2]} position={[-0.5, 0.6, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.2]} position={[0.5, 0.6, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.2]} position={[-0.5, 0.6, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>

      {/* Features */}
      <Box args={[0.3, 0.2, 0.3]} position={[0, -0.4, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Box>
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center space-x-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span>Loading 3D model...</span>
      </div>
    </Html>
  );
}

export default function Model3DViewer({ fileName, fileType }: Model3DViewerProps) {
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={<LoadingFallback />}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {/* Environment */}
          <Environment preset="studio" />

          {/* Grid */}
          <Grid
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#e5e7eb"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#d1d5db"
            fadeDistance={25}
            fadeStrength={1}
            infiniteGrid
          />

          {/* 3D Model */}
          <MockModel fileName={fileName} />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>

      {/* File info overlay */}
      {fileName && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <p className="text-sm font-medium text-gray-900">{fileName}</p>
          <p className="text-xs text-gray-600">{fileType || 'CAD Model'}</p>
        </div>
      )}

      {/* Controls info */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
        <p className="text-xs text-gray-600">
          🖱️ Drag to rotate • 🔍 Scroll to zoom • 👆 Right-click to pan
        </p>
      </div>
    </div>
  );
}
