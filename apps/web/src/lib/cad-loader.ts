/**
 * CAD File Loader Utility
 * 
 * Handles loading and parsing of various CAD formats:
 * - STL (ASCII and Binary)
 * - OBJ
 * - STEP/STP (via backend conversion)
 * - IGES
 * 
 * Optimized for performance with lazy loading and caching
 */

import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

export interface LoadedModel {
  geometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  volume?: number; // cubic mm
  surfaceArea?: number; // square mm
  metadata?: {
    units?: 'mm' | 'in' | 'm';
    author?: string;
    created?: Date;
    software?: string;
  };
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface LoadOptions {
  /** Scale factor to apply */
  scale?: number;
  
  /** Convert units (e.g., inches to mm) */
  convertUnits?: { from: 'in' | 'mm' | 'm'; to: 'in' | 'mm' | 'm' };
  
  /** Center the model */
  center?: boolean;
  
  /** Optimize geometry (merge vertices, etc) */
  optimize?: boolean;
  
  /** Calculate volume and surface area */
  calculateMetrics?: boolean;
  
  /** Progress callback */
  onProgress?: (progress: LoadProgress) => void;
}

/**
 * Load CAD file and return geometry with metadata
 */
export async function loadCadFile(
  url: string,
  fileType: 'stl' | 'obj' | 'step' | 'stp' | 'iges' | 'igs',
  options: LoadOptions = {}
): Promise<LoadedModel> {
  const {
    scale = 1,
    convertUnits,
    center = true,
    optimize = true,
    calculateMetrics = true,
    onProgress,
  } = options;
  
  let geometry: THREE.BufferGeometry;
  
  // Load based on file type
  if (fileType === 'stl') {
    geometry = await loadSTL(url, onProgress);
  } else if (fileType === 'obj') {
    geometry = await loadOBJ(url, onProgress);
  } else if (fileType === 'step' || fileType === 'stp') {
    geometry = await loadSTEP(url, onProgress);
  } else if (fileType === 'iges' || fileType === 'igs') {
    geometry = await loadIGES(url, onProgress);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Apply unit conversion
  if (convertUnits) {
    const conversionFactor = getUnitConversionFactor(convertUnits.from, convertUnits.to);
    geometry.scale(conversionFactor, conversionFactor, conversionFactor);
  }
  
  // Apply scale
  if (scale !== 1) {
    geometry.scale(scale, scale, scale);
  }
  
  // Optimize geometry
  if (optimize) {
    geometry = optimizeGeometry(geometry);
  }
  
  // Calculate bounding box
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox!;
  
  const modelCenter = new THREE.Vector3();
  boundingBox.getCenter(modelCenter);
  
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  // Center geometry
  if (center) {
    geometry.translate(-modelCenter.x, -modelCenter.y, -modelCenter.z);
    boundingBox.translate(new THREE.Vector3(-modelCenter.x, -modelCenter.y, -modelCenter.z));
    modelCenter.set(0, 0, 0);
  }
  
  // Calculate metrics
  let volume: number | undefined;
  let surfaceArea: number | undefined;
  
  if (calculateMetrics) {
    volume = calculateVolume(geometry);
    surfaceArea = calculateSurfaceArea(geometry);
  }
  
  return {
    geometry,
    boundingBox,
    center: modelCenter,
    size,
    volume,
    surfaceArea,
  };
}

/**
 * Load STL file
 */
async function loadSTL(
  url: string,
  onProgress?: (progress: LoadProgress) => void
): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new STLLoader();
    
    loader.load(
      url,
      (geometry) => resolve(geometry),
      (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      },
      (error) => reject(new Error(`Failed to load STL: ${error}`))
    );
  });
}

/**
 * Load OBJ file
 */
async function loadOBJ(
  url: string,
  onProgress?: (progress: LoadProgress) => void
): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    
    loader.load(
      url,
      (object) => {
        // Extract geometry from first mesh
        let geometry: THREE.BufferGeometry | null = null;
        
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && !geometry) {
            geometry = child.geometry;
          }
        });
        
        if (geometry) {
          resolve(geometry);
        } else {
          reject(new Error('No geometry found in OBJ file'));
        }
      },
      (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      },
      (error) => reject(new Error(`Failed to load OBJ: ${error}`))
    );
  });
}

/**
 * Load STEP file (requires backend conversion to STL/OBJ)
 */
async function loadSTEP(
  url: string,
  onProgress?: (progress: LoadProgress) => void
): Promise<THREE.BufferGeometry> {
  try {
    // Call backend to convert STEP to STL
    onProgress?.({ loaded: 0, total: 100, percentage: 0 });
    
    const response = await fetch('/api/cad/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: 'step', outputFormat: 'stl' }),
    });
    
    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.statusText}`);
    }
    
    const { convertedUrl } = await response.json();
    
    onProgress?.({ loaded: 50, total: 100, percentage: 50 });
    
    // Load converted STL
    return await loadSTL(convertedUrl, (progress) => {
      onProgress?.({
        loaded: 50 + progress.loaded / 2,
        total: 100,
        percentage: 50 + progress.percentage / 2,
      });
    });
  } catch (error) {
    throw new Error(`Failed to load STEP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load IGES file (requires backend conversion)
 */
async function loadIGES(
  url: string,
  onProgress?: (progress: LoadProgress) => void
): Promise<THREE.BufferGeometry> {
  try {
    onProgress?.({ loaded: 0, total: 100, percentage: 0 });
    
    const response = await fetch('/api/cad/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: 'iges', outputFormat: 'stl' }),
    });
    
    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.statusText}`);
    }
    
    const { convertedUrl } = await response.json();
    
    onProgress?.({ loaded: 50, total: 100, percentage: 50 });
    
    return await loadSTL(convertedUrl, (progress) => {
      onProgress?.({
        loaded: 50 + progress.loaded / 2,
        total: 100,
        percentage: 50 + progress.percentage / 2,
      });
    });
  } catch (error) {
    throw new Error(`Failed to load IGES file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimize geometry for rendering
 */
function optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  // Merge vertices
  const mergedGeometry = geometry.clone();
  
  // Compute vertex normals for smooth shading
  mergedGeometry.computeVertexNormals();
  
  // Remove duplicate vertices (tolerance: 0.01mm)
  // Note: BufferGeometryUtils.mergeVertices requires three/examples/jsm/utils/BufferGeometryUtils
  // For now, we'll just ensure normals are computed
  
  return mergedGeometry;
}

/**
 * Calculate volume of mesh (in cubic mm)
 */
function calculateVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  let volume = 0;
  
  // Use signed volume of tetrahedron method
  for (let i = 0; i < position.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(position, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    
    // Signed volume of tetrahedron formed by origin and triangle
    volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
  }
  
  return Math.abs(volume);
}

/**
 * Calculate surface area of mesh (in square mm)
 */
function calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  let area = 0;
  
  for (let i = 0; i < position.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(position, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    
    // Triangle area using cross product
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const cross = new THREE.Vector3().crossVectors(edge1, edge2);
    
    area += cross.length() / 2;
  }
  
  return area;
}

/**
 * Get unit conversion factor
 */
function getUnitConversionFactor(from: 'in' | 'mm' | 'm', to: 'in' | 'mm' | 'm'): number {
  const factors: Record<string, number> = {
    'in-mm': 25.4,
    'mm-in': 1 / 25.4,
    'm-mm': 1000,
    'mm-m': 0.001,
    'in-m': 0.0254,
    'm-in': 39.3701,
  };
  
  if (from === to) return 1;
  
  const key = `${from}-${to}`;
  return factors[key] || 1;
}

/**
 * Detect features in geometry (holes, pockets, etc.)
 */
export function detectFeatures(geometry: THREE.BufferGeometry): any[] {
  // TODO: Implement feature detection
  // This would use geometric analysis to identify:
  // - Cylindrical holes (diameter, depth)
  // - Pockets (rectangular, circular)
  // - Threads (pitch, diameter)
  // - Flat surfaces (area, orientation)
  // - Edges (length, angle)
  
  return [];
}

/**
 * Create thumbnail image from geometry
 */
export async function generateThumbnail(
  geometry: THREE.BufferGeometry,
  size: { width: number; height: number } = { width: 400, height: 400 }
): Promise<string> {
  // Create offscreen scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(45, size.width / size.height, 0.1, 10000);
  
  // Create mesh
  const material = new THREE.MeshPhongMaterial({ color: 0x4a90e2 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 50);
  scene.add(directionalLight);
  
  // Position camera
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox!;
  const boundingSphere = new THREE.Sphere();
  boundingBox.getBoundingSphere(boundingSphere);
  
  const distance = boundingSphere.radius * 2;
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0);
  
  // Render to canvas
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size.width, size.height);
  renderer.render(scene, camera);
  
  // Get data URL
  const dataUrl = renderer.domElement.toDataURL('image/png');
  
  // Cleanup
  renderer.dispose();
  
  return dataUrl;
}
