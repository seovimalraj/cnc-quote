'use client';

import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

interface Canvas3DProps {
  readonly fileName?: string;
  readonly fileType?: string;
  readonly dfmHighlights?: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly status: 'passed' | 'warning' | 'blocker';
    readonly highlights: {
      readonly face_ids: readonly number[];
      readonly edge_ids: readonly number[];
    };
    readonly suggestions: readonly string[];
  }>;
}

// Mock 3D model component that can show DFM highlights
function CADModel({ fileName, dfmHighlights = [] }: { readonly fileName?: string; readonly dfmHighlights?: readonly any[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<string | null>(null);

  // Create mock geometry based on file type
  const createGeometry = () => {
    if (fileName?.toLowerCase().includes('bracket')) {
      return new THREE.BoxGeometry(2, 1, 0.2);
    } else if (fileName?.toLowerCase().includes('shaft')) {
      return new THREE.CylinderGeometry(0.1, 0.1, 2, 16);
    } else if (fileName?.toLowerCase().includes('plate')) {
      return new THREE.BoxGeometry(3, 2, 0.1);
    }
    return new THREE.BoxGeometry(1.5, 1, 0.5);
  };

  const geometry = createGeometry();

  // Create highlight overlays for DFM issues
  const highlightMeshes = dfmHighlights.map((highlight, index) => {
    if (highlight.highlights.face_ids.length === 0 && highlight.highlights.edge_ids.length === 0) {
      return null;
    }

    const color = highlight.status === 'blocker' ? '#ef4444' :
                  highlight.status === 'warning' ? '#f59e0b' : '#10b981';

    return (
      <group key={highlight.id}>
        {/* Highlight overlay */}
        <Box
          args={[1.6, 1.1, 0.6]}
          position={[0, 0, 0]}
          onPointerOver={() => setHoveredHighlight(highlight.id)}
          onPointerOut={() => setHoveredHighlight(null)}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hoveredHighlight === highlight.id ? 0.3 : 0.1}
            side={THREE.BackSide}
          />
        </Box>

        {/* Tooltip */}
        {hoveredHighlight === highlight.id && (
          <Html position={[0, 1.5, 0]} center>
            <div className="bg-white p-2 rounded shadow-lg max-w-xs">
              <div className="font-semibold text-sm">{highlight.title}</div>
              <div className="text-xs text-gray-600 mt-1">
                {highlight.suggestions.length > 0 ? highlight.suggestions[0] : 'No suggestions available'}
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  });

  return (
    <group>
      {/* Main model */}
      <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* DFM highlights */}
      {highlightMeshes}

      {/* Mock features (holes, etc.) */}
      <Cylinder args={[0.05, 0.05, 0.3]} position={[0.3, 0.6, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>
      <Cylinder args={[0.05, 0.05, 0.3]} position={[-0.3, 0.6, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Cylinder>
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

export function Canvas3D({ fileName, fileType, dfmHighlights = [] }: Canvas3DProps) {
  return (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden relative">
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

          {/* 3D Model with DFM highlights */}
          <CADModel fileName={fileName} dfmHighlights={dfmHighlights} />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
          />
        </Suspense>
      </Canvas>

      {/* DFM Legend */}
      {dfmHighlights.length > 0 && (
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
          <div className="text-sm font-semibold mb-2">DFM Analysis</div>
          <div className="space-y-1">
            {dfmHighlights.slice(0, 3).map((highlight) => (
              <div key={highlight.id} className="flex items-center space-x-2 text-xs">
                <div
                  className={`w-3 h-3 rounded ${
                    highlight.status === 'blocker' ? 'bg-red-500' :
                    highlight.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                />
                <span className="truncate max-w-32">{highlight.title}</span>
              </div>
            ))}
            {dfmHighlights.length > 3 && (
              <div className="text-xs text-gray-500">+{dfmHighlights.length - 3} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}