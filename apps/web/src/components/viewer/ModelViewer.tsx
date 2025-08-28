'use client';

import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
  showWireframe?: boolean;
}

export function ModelViewer({ url, showWireframe = false }: ModelViewerProps) {
  const modelRef = useRef();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load model when URL changes
  useState(() => {
    if (!url) return;

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        setModel(gltf.scene);
        setError(null);
      },
      undefined,
      (err) => {
        console.error('Error loading model:', err);
        setError('Failed to load model');
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
                {showWireframe && (
                  <wireframe
                    geometry={model.children[0].geometry}
                    material={new THREE.MeshBasicMaterial({
                      wireframe: true,
                      color: 0x000000,
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
