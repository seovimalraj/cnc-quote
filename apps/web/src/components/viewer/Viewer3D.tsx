'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'

interface ModelViewerProps {
  modelUrl?: string
  highlights?: {
    face_ids: number[]
    edge_ids: number[]
    color: string
  }
  onModelLoad?: (geometry: THREE.BufferGeometry) => void
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  highlights,
  onModelLoad
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [material, setMaterial] = useState<THREE.Material | null>(null)

  useEffect(() => {
    if (!modelUrl) {
      // Create a simple cube as placeholder
      const boxGeometry = new THREE.BoxGeometry(10, 10, 10)
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.7
      })
      setGeometry(boxGeometry)
      setMaterial(boxMaterial)
      if (onModelLoad) {
        onModelLoad(boxGeometry)
      }
    }
  }, [modelUrl, onModelLoad])

  useEffect(() => {
    if (meshRef.current && highlights) {
      // Apply highlights to the mesh
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: highlights.color,
        transparent: true,
        opacity: 0.8,
        emissive: highlights.color,
        emissiveIntensity: 0.2
      })

      // This is a simplified highlight implementation
      // In a real implementation, you'd need to modify specific faces/edges
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material = highlightMaterial
      }
    }
  }, [highlights])

  if (!geometry || !material) {
    return (
      <Html center>
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          Loading model...
        </div>
      </Html>
    )
  }

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      {/* Additional meshes for highlights would go here */}
    </mesh>
  )
}

const Scene: React.FC<ModelViewerProps> = (props) => {
  const { camera, gl } = useThree()

  useEffect(() => {
    camera.position.set(20, 20, 20)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />

      <ModelViewer {...props} />

      <Grid
        args={[100, 100]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#cccccc"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#aaaaaa"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        dampingFactor={0.05}
        maxPolarAngle={Math.PI}
      />
    </>
  )
}

interface Viewer3DProps {
  modelUrl?: string
  highlights?: {
    face_ids: number[]
    edge_ids: number[]
    color: string
  }
  width?: string | number
  height?: string | number
  onModelLoad?: (geometry: THREE.BufferGeometry) => void
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  modelUrl,
  highlights,
  width = '100%',
  height = 400,
  onModelLoad
}) => {
  return (
    <div style={{ width, height }} className="border border-gray-200 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [20, 20, 20], fov: 50 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Scene
          modelUrl={modelUrl}
          highlights={highlights}
          onModelLoad={onModelLoad}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Mouse: Orbit</span>
          <span>•</span>
          <span>Scroll: Zoom</span>
          <span>•</span>
          <span>Right-click: Pan</span>
        </div>
      </div>

      {/* Bottom bar with dimensions */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>Dims: 100×50×25mm | Volume: 125,000 mm³</div>
          <div>Units: mm</div>
        </div>
      </div>
    </div>
  )
}
