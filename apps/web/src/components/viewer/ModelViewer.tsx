'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
  showWireframe?: boolean;
}

export function ModelViewer({ url, showWireframe = false }: ModelViewerProps) {
  const modelRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load model when URL changes
  useEffect(() => {
    if (!url) return;

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf: any) => {
        setModel(gltf.scene);
        setError(null);
      },
      undefined,
      (err: any) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load model';
        setError(errorMessage);
      }
    );
  }, [url]);

  return (
    <div className="w-full h-[500px] bg-background border rounded-lg">
      {error ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          {error}
        </div>
      ) : (
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
          <Stage environment="city" intensity={0.5}>
            {model && (
              <group ref={modelRef}>
                <primitive object={model} />
                                {showWireframe && model.children[0] && (
                  <mesh
                    geometry={(model.children[0] as THREE.Mesh).geometry}
                    material={new THREE.MeshBasicMaterial({
                      wireframe: true,
                      color: 0x000000
                    })}
                  />
                )}
              </group>
            )}
          </Stage>
          <OrbitControls
            autoRotate
            autoRotateSpeed={1}
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
          />
        </Canvas>
      )}
    </div>
  );
}
