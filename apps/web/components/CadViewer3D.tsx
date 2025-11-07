'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Card } from '@/components/ui/card';
import { AlertCircle, Box, Loader2, Upload } from 'lucide-react';

interface CadViewer3DProps {
  fileName: string;
  file?: File;
  width?: string;
  height?: string;
  className?: string;
}

function STLModel({ file }: { file: File }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new STLLoader();
    const reader = new FileReader();

    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const loadedGeometry = loader.parse(arrayBuffer);
      
      // Center and normalize geometry
      loadedGeometry.computeBoundingBox();
      const boundingBox = loadedGeometry.boundingBox!;
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      loadedGeometry.translate(-center.x, -center.y, -center.z);
      
      // Scale to fit
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 5 / maxDim; // Scale to 5 units
      loadedGeometry.scale(scale, scale, scale);
      
      loadedGeometry.computeVertexNormals();
      setGeometry(loadedGeometry);
    };

    reader.readAsArrayBuffer(file);

    return () => {
      geometry?.dispose();
    };
  }, [file]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#4a90e2"
        metalness={0.6}
        roughness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function OBJModel({ file }: { file: File }) {
  const groupRef = useRef<THREE.Group>(null);
  const [object, setObject] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const loader = new OBJLoader();
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const loadedObject = loader.parse(text);
      
      // Calculate bounding box and center
      const box = new THREE.Box3().setFromObject(loadedObject);
      const center = new THREE.Vector3();
      box.getCenter(center);
      loadedObject.position.sub(center);
      
      // Scale to fit
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 5 / maxDim;
      loadedObject.scale.set(scale, scale, scale);
      
      // Apply material to all meshes
      loadedObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: '#4a90e2',
            metalness: 0.6,
            roughness: 0.3,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      setObject(loadedObject);
    };

    reader.readAsText(file);

    return () => {
      object?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => mat.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    };
  }, [file]);

  if (!object) return null;

  return <primitive ref={groupRef} object={object} />;
}

function STEPModel({ file }: { file: File }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSTEP = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import of OpenCascade
        const initOpenCascade = (await import('opencascade.js')).default;
        const oc = await initOpenCascade();

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Write file to OpenCascade virtual filesystem
        oc.FS.createDataFile('/', 'input.step', uint8Array, true, true, true);

        // Read STEP file
        const reader = new oc.STEPControl_Reader_1();
        const readStatus = reader.ReadFile('input.step');

        if (readStatus === oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
          reader.TransferRoots(new oc.Message_ProgressRange_1());
          const shape = reader.OneShape();

          // Triangulate the shape
          const triangulation = new oc.BRepMesh_IncrementalMesh_2(
            shape,
            0.1, // deflection
            false,
            0.5, // angle
            true
          );

          if (!triangulation.IsDone()) {
            throw new Error('Triangulation failed');
          }

          // Extract mesh data
          const vertices: number[] = [];
          const indices: number[] = [];
          let vertexIndex = 0;

          const explorer = new oc.TopExp_Explorer_2(
            shape,
            oc.TopAbs_ShapeEnum.TopAbs_FACE,
            oc.TopAbs_ShapeEnum.TopAbs_SHAPE
          );

          while (explorer.More()) {
            const face = oc.TopoDS.Face_1(explorer.Current());
            const location = new oc.TopLoc_Location_1();
            const triangles = oc.BRep_Tool.Triangulation(face, location);

            if (!triangles.IsNull()) {
              const transform = location.Transformation();
              const nodeCount = triangles.NbNodes();

              // Get vertices
              for (let i = 1; i <= nodeCount; i++) {
                const node = triangles.Node(i);
                const transformed = node.Transformed(transform);
                vertices.push(transformed.X(), transformed.Y(), transformed.Z());
              }

              // Get triangles
              const triangleCount = triangles.NbTriangles();
              for (let i = 1; i <= triangleCount; i++) {
                const triangle = triangles.Triangle(i);
                let v1 = triangle.Value(1) - 1;
                let v2 = triangle.Value(2) - 1;
                let v3 = triangle.Value(3) - 1;

                // Check face orientation
                if (face.Orientation_1() === oc.TopAbs_Orientation.TopAbs_REVERSED) {
                  [v2, v3] = [v3, v2];
                }

                indices.push(
                  vertexIndex + v1,
                  vertexIndex + v2,
                  vertexIndex + v3
                );
              }

              vertexIndex += nodeCount;
            }

            explorer.Next();
          }

          // Cleanup OpenCascade objects
          reader.delete();
          shape.delete();
          triangulation.delete();
          explorer.delete();

          // Create Three.js geometry
          const bufferGeometry = new THREE.BufferGeometry();
          bufferGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
          );
          bufferGeometry.setIndex(indices);
          bufferGeometry.computeVertexNormals();

          // Center and scale
          bufferGeometry.computeBoundingBox();
          const boundingBox = bufferGeometry.boundingBox!;
          const center = new THREE.Vector3();
          boundingBox.getCenter(center);
          bufferGeometry.translate(-center.x, -center.y, -center.z);

          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          bufferGeometry.scale(scale, scale, scale);

          if (mounted) {
            setGeometry(bufferGeometry);
            setLoading(false);
          }
        } else {
          throw new Error('Failed to read STEP file');
        }

        // Cleanup virtual filesystem
        oc.FS.unlink('/input.step');
      } catch (err) {
        console.error('STEP loading error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load STEP file');
          setLoading(false);
        }
      }
    };

    loadSTEP();

    return () => {
      mounted = false;
      geometry?.dispose();
    };
  }, [file]);

  if (loading) {
    return (
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a90e2" transparent opacity={0.5} />
      </mesh>
    );
  }

  if (error || !geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#4a90e2"
        metalness={0.6}
        roughness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene({ file, extension }: { file: File; extension: string }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
        makeDefault
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} />
      
      {/* Grid helper */}
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />
      
      {/* Model */}
      <Suspense fallback={null}>
        {extension === 'stl' && <STLModel file={file} />}
        {extension === 'obj' && <OBJModel file={file} />}
        {(extension === 'step' || extension === 'stp') && <STEPModel file={file} />}
      </Suspense>
      
      {/* Environment lighting */}
      <Environment preset="city" />
    </>
  );
}

export default function CadViewer3D({ 
  fileName, 
  file,
  width = '100%', 
  height = '400px',
  className = '' 
}: CadViewer3DProps) {
  const getFileExtension = (name: string) => {
    return name.split('.').pop()?.toLowerCase() || '';
  };

  const extension = getFileExtension(fileName);
  const is3DFormat = ['step', 'stp', 'stl', 'iges', 'igs', 'x_t', 'x_b', 'obj'].includes(extension);
  const supportedFormats = ['stl', 'obj', 'step', 'stp'];

  if (!is3DFormat) {
    return (
      <Card className={`flex items-center justify-center bg-gray-50 border-2 border-dashed ${className}`} style={{ width, height }}>
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Preview not available for .{extension} files</p>
        </div>
      </Card>
    );
  }

  if (supportedFormats.includes(extension) && file) {
    return (
      <div 
        className={`relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden ${className}`}
        style={{ width, height }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}
        >
          <Scene file={file} extension={extension} />
        </Canvas>
        
        {/* Controls overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs text-gray-700 z-10">
          <div className="flex items-center gap-2">
            <span className="font-semibold">🖱️ Controls:</span>
            <span>Drag to Rotate</span>
            <span className="text-gray-400">|</span>
            <span>Scroll to Zoom</span>
          </div>
        </div>
        
        {/* File info overlay */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs text-gray-700 z-10">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-600" />
            <span className="font-medium">{fileName}</span>
            <span className="text-gray-400">|</span>
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            {['step', 'stp'].includes(extension) && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-green-600 font-medium">✓ STEP</span>
              </>
            )}
          </div>
        </div>
        
        {/* Loading fallback */}
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading {extension.toUpperCase()} model...</p>
                {['step', 'stp'].includes(extension) && (
                  <p className="text-xs text-gray-500 mt-1">Processing CAD geometry...</p>
                )}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  // For IGES files - show coming soon message
  if (['iges', 'igs'].includes(extension)) {
    return (
      <Card 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 ${className}`} 
        style={{ width, height }}
      >
        <div className="text-center p-6">
          <div className="relative inline-block mb-4">
            <Box className="w-16 h-16 text-amber-600 animate-pulse" />
            <div className="absolute inset-0 bg-amber-400 opacity-20 blur-xl rounded-full"></div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{fileName}</h3>
          <p className="text-sm text-gray-600 mb-1">3D CAD File (.{extension})</p>
          <p className="text-xs text-amber-700 font-medium mt-3">🚀 IGES viewer coming soon</p>
          <p className="text-xs text-gray-500 mt-1">Interactive 3D preview available for STL, OBJ & STEP files</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 ${className}`} 
      style={{ width, height }}
    >
      <div className="text-center p-6">
        <div className="relative inline-block mb-4">
          <Box className="w-16 h-16 text-blue-600 animate-pulse" />
          <div className="absolute inset-0 bg-blue-400 opacity-20 blur-xl rounded-full"></div>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{fileName}</h3>
        <p className="text-sm text-gray-600 mb-1">3D CAD File (.{extension})</p>
        <p className="text-xs text-gray-500">Interactive 3D preview for STL, OBJ & STEP files</p>
      </div>
    </Card>
  );
}
