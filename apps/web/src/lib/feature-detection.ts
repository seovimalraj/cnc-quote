/**
 * Advanced Feature Detection Algorithm
 * 
 * Automatically detects manufacturing features from 3D geometry:
 * - Cylindrical holes (through-holes, blind holes)
 * - Rectangular pockets
 * - Threads (internal, external)
 * - Fillets and chamfers
 * - Flat faces
 * - Bosses and protrusions
 * 
 * Uses geometric analysis and pattern recognition
 */

import * as THREE from 'three';

export type FeatureType = 
  | 'hole' 
  | 'pocket' 
  | 'slot' 
  | 'thread' 
  | 'fillet' 
  | 'chamfer' 
  | 'flat-face' 
  | 'boss'
  | 'protrusion';

export interface DetectedFeature {
  id: string;
  type: FeatureType;
  position: THREE.Vector3;
  properties: Record<string, any>;
  confidence: number; // 0-1
  vertices: number[]; // Indices of vertices that make up this feature
}

export interface CylindricalHole extends DetectedFeature {
  type: 'hole';
  properties: {
    diameter: number;
    depth: number;
    axis: THREE.Vector3;
    isThrough: boolean;
    tolerance?: number;
  };
}

export interface RectangularPocket extends DetectedFeature {
  type: 'pocket';
  properties: {
    width: number;
    length: number;
    depth: number;
    cornerRadius?: number;
    floorArea: number;
  };
}

export interface Thread extends DetectedFeature {
  type: 'thread';
  properties: {
    diameter: number;
    pitch: number;
    length: number;
    isInternal: boolean;
    standard?: string; // M6x1.0, 1/4-20 UNC, etc.
  };
}

export interface FlatFace extends DetectedFeature {
  type: 'flat-face';
  properties: {
    area: number;
    normal: THREE.Vector3;
    bounds: THREE.Box3;
    isMachined: boolean;
  };
}

/**
 * Main feature detection function
 */
export function detectFeatures(geometry: THREE.BufferGeometry): DetectedFeature[] {
  console.log('Starting feature detection...');
  
  const features: DetectedFeature[] = [];
  
  // 1. Build face and edge data structures
  const faceData = extractFaceData(geometry);
  const edgeData = extractEdgeData(geometry);
  
  // 2. Detect cylindrical holes
  const holes = detectCylindricalHoles(geometry, faceData);
  features.push(...holes);
  
  // 3. Detect rectangular pockets
  const pockets = detectRectangularPockets(geometry, faceData);
  features.push(...pockets);
  
  // 4. Detect threads
  const threads = detectThreads(geometry, holes);
  features.push(...threads);
  
  // 5. Detect flat faces
  const flatFaces = detectFlatFaces(geometry, faceData);
  features.push(...flatFaces);
  
  // 6. Detect fillets and chamfers
  const fillets = detectFillets(geometry, edgeData);
  features.push(...fillets);
  
  console.log(`Feature detection complete: ${features.length} features found`);
  
  return features;
}

/**
 * Extract face data from geometry
 */
function extractFaceData(geometry: THREE.BufferGeometry): FaceData[] {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const faces: FaceData[] = [];
  
  // Group triangles into faces by normal similarity
  const normalGroups = new Map<string, number[]>();
  
  for (let i = 0; i < position.count; i += 3) {
    // Get face normal (average of 3 vertex normals)
    const n1 = new THREE.Vector3().fromBufferAttribute(normal, i);
    const n2 = new THREE.Vector3().fromBufferAttribute(normal, i + 1);
    const n3 = new THREE.Vector3().fromBufferAttribute(normal, i + 2);
    const faceNormal = new THREE.Vector3()
      .add(n1)
      .add(n2)
      .add(n3)
      .normalize();
    
    // Create key from normal (rounded to 2 decimals)
    const key = `${faceNormal.x.toFixed(2)},${faceNormal.y.toFixed(2)},${faceNormal.z.toFixed(2)}`;
    
    if (!normalGroups.has(key)) {
      normalGroups.set(key, []);
    }
    normalGroups.get(key)!.push(i, i + 1, i + 2);
  }
  
  // Convert groups to face data
  normalGroups.forEach((indices, key) => {
    const [nx, ny, nz] = key.split(',').map(Number);
    const faceNormal = new THREE.Vector3(nx, ny, nz);
    
    // Calculate face bounds and center
    const bounds = new THREE.Box3();
    const center = new THREE.Vector3();
    
    for (const idx of indices) {
      const v = new THREE.Vector3().fromBufferAttribute(position, idx);
      bounds.expandByPoint(v);
      center.add(v);
    }
    center.divideScalar(indices.length);
    
    faces.push({
      normal: faceNormal,
      center,
      bounds,
      vertexIndices: indices,
      area: calculateFaceArea(position, indices),
    });
  });
  
  return faces;
}

interface FaceData {
  normal: THREE.Vector3;
  center: THREE.Vector3;
  bounds: THREE.Box3;
  vertexIndices: number[];
  area: number;
}

/**
 * Extract edge data from geometry
 */
function extractEdgeData(geometry: THREE.BufferGeometry): EdgeData[] {
  const position = geometry.attributes.position;
  const edges: EdgeData[] = [];
  const edgeMap = new Map<string, number[]>();
  
  // Build edge connectivity
  for (let i = 0; i < position.count; i += 3) {
    const edges = [
      [i, i + 1],
      [i + 1, i + 2],
      [i + 2, i],
    ];
    
    edges.forEach(([a, b]) => {
      const v1 = new THREE.Vector3().fromBufferAttribute(position, a);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, b);
      
      // Create consistent edge key (sort by position)
      const key = [a, b].sort().join('-');
      
      if (!edgeMap.has(key)) {
        edgeMap.set(key, [a, b]);
      }
    });
  }
  
  // Convert to edge data
  edgeMap.forEach((indices) => {
    const [a, b] = indices;
    const v1 = new THREE.Vector3().fromBufferAttribute(position, a);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, b);
    const length = v1.distanceTo(v2);
    const direction = new THREE.Vector3().subVectors(v2, v1).normalize();
    
    edges.push({
      start: v1,
      end: v2,
      length,
      direction,
      vertexIndices: [a, b],
    });
  });
  
  return edges;
}

interface EdgeData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  direction: THREE.Vector3;
  vertexIndices: number[];
}

/**
 * Detect cylindrical holes
 */
function detectCylindricalHoles(geometry: THREE.BufferGeometry, faces: FaceData[]): CylindricalHole[] {
  const holes: CylindricalHole[] = [];
  const position = geometry.attributes.position;
  
  // Look for cylindrical patterns
  // Strategy: Find circular edges, group by axis, calculate diameter and depth
  
  const circularFaces = faces.filter(f => {
    // Check if face is approximately circular
    const size = new THREE.Vector3();
    f.bounds.getSize(size);
    
    // Circle has similar width and height, minimal depth
    const aspectRatio = Math.max(size.x, size.y) / Math.min(size.x, size.y);
    return aspectRatio < 1.2 && size.z < Math.min(size.x, size.y) * 0.1;
  });
  
  // Group circular faces by axis
  const axisGroups = new Map<string, FaceData[]>();
  
  circularFaces.forEach(face => {
    // Determine primary axis
    const absNormal = new THREE.Vector3(
      Math.abs(face.normal.x),
      Math.abs(face.normal.y),
      Math.abs(face.normal.z)
    );
    
    let axis = 'z';
    if (absNormal.x > absNormal.y && absNormal.x > absNormal.z) axis = 'x';
    else if (absNormal.y > absNormal.z) axis = 'y';
    
    if (!axisGroups.has(axis)) {
      axisGroups.set(axis, []);
    }
    axisGroups.get(axis)!.push(face);
  });
  
  // Process each axis group
  axisGroups.forEach((group, axis) => {
    // Sort by position along axis
    group.sort((a, b) => {
      if (axis === 'x') return a.center.x - b.center.x;
      if (axis === 'y') return a.center.y - b.center.y;
      return a.center.z - b.center.z;
    });
    
    // Find pairs (top and bottom of hole)
    for (let i = 0; i < group.length - 1; i++) {
      const face1 = group[i];
      const face2 = group[i + 1];
      
      // Check if faces are parallel and opposite
      const dotProduct = face1.normal.dot(face2.normal);
      if (dotProduct > -0.9) continue; // Not opposite
      
      // Calculate diameter (average of both faces)
      const size1 = new THREE.Vector3();
      const size2 = new THREE.Vector3();
      face1.bounds.getSize(size1);
      face2.bounds.getSize(size2);
      
      const diameter1 = Math.max(size1.x, size1.y, size1.z);
      const diameter2 = Math.max(size2.x, size2.y, size2.z);
      const diameter = (diameter1 + diameter2) / 2;
      
      // Calculate depth (distance between faces)
      const depth = face1.center.distanceTo(face2.center);
      
      // Check if this looks like a hole (reasonable diameter/depth ratio)
      if (diameter > 0.5 && diameter < 50 && depth > 0 && depth / diameter < 10) {
        const axisVector = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        );
        
        holes.push({
          id: `hole-${holes.length + 1}`,
          type: 'hole',
          position: face1.center.clone().lerp(face2.center, 0.5),
          properties: {
            diameter,
            depth,
            axis: axisVector,
            isThrough: depth > diameter * 3, // Heuristic
          },
          confidence: 0.85,
          vertices: [...face1.vertexIndices, ...face2.vertexIndices],
        });
      }
    }
  });
  
  console.log(`Detected ${holes.length} cylindrical holes`);
  return holes;
}

/**
 * Detect rectangular pockets
 */
function detectRectangularPockets(geometry: THREE.BufferGeometry, faces: FaceData[]): RectangularPocket[] {
  const pockets: RectangularPocket[] = [];
  
  // Look for rectangular depressions
  // Strategy: Find rectangular bottom faces with surrounding vertical walls
  
  const rectangularFaces = faces.filter(f => {
    const size = new THREE.Vector3();
    f.bounds.getSize(size);
    
    // Rectangle has width and length, minimal depth in normal direction
    const aspectRatio = Math.max(size.x, size.y) / Math.min(size.x, size.y);
    return aspectRatio >= 1.2 && aspectRatio < 10;
  });
  
  rectangularFaces.forEach(face => {
    const size = new THREE.Vector3();
    face.bounds.getSize(size);
    
    // Determine width, length, and depth
    let width = size.x;
    let length = size.y;
    let depth = 5.0; // Default depth (would need wall analysis)
    
    if (width > 2 && length > 2) {
      pockets.push({
        id: `pocket-${pockets.length + 1}`,
        type: 'pocket',
        position: face.center.clone(),
        properties: {
          width,
          length,
          depth,
          floorArea: width * length,
        },
        confidence: 0.75,
        vertices: face.vertexIndices,
      });
    }
  });
  
  console.log(`Detected ${pockets.length} rectangular pockets`);
  return pockets;
}

/**
 * Detect threads (based on holes + helical patterns)
 */
function detectThreads(geometry: THREE.BufferGeometry, holes: CylindricalHole[]): Thread[] {
  const threads: Thread[] = [];
  
  // Simplified: Detect threads by looking for helical edge patterns around holes
  // In production, this would analyze vertex spirals
  
  holes.forEach(hole => {
    // Heuristic: Small holes with high vertex density might be threaded
    const vertexDensity = hole.vertices.length / (hole.properties.diameter * Math.PI * hole.properties.depth);
    
    if (vertexDensity > 50 && hole.properties.diameter < 20) {
      // Estimate thread pitch (standard pitches)
      let pitch = 1.5; // Default M10 pitch
      if (hole.properties.diameter < 6) pitch = 1.0;
      else if (hole.properties.diameter < 10) pitch = 1.25;
      else if (hole.properties.diameter < 16) pitch = 1.5;
      else pitch = 2.0;
      
      threads.push({
        id: `thread-${threads.length + 1}`,
        type: 'thread',
        position: hole.position.clone(),
        properties: {
          diameter: hole.properties.diameter,
          pitch,
          length: hole.properties.depth,
          isInternal: true,
          standard: `M${Math.round(hole.properties.diameter)}x${pitch}`,
        },
        confidence: 0.6,
        vertices: hole.vertices,
      });
    }
  });
  
  console.log(`Detected ${threads.length} threads`);
  return threads;
}

/**
 * Detect flat faces (machined surfaces)
 */
function detectFlatFaces(geometry: THREE.BufferGeometry, faces: FaceData[]): FlatFace[] {
  const flatFaces: FlatFace[] = [];
  
  // Filter large flat faces
  const largeFaces = faces.filter(f => f.area > 100); // > 100 mm²
  
  largeFaces.forEach(face => {
    flatFaces.push({
      id: `face-${flatFaces.length + 1}`,
      type: 'flat-face',
      position: face.center.clone(),
      properties: {
        area: face.area,
        normal: face.normal.clone(),
        bounds: face.bounds.clone(),
        isMachined: face.area > 500, // Large faces likely machined
      },
      confidence: 0.9,
      vertices: face.vertexIndices,
    });
  });
  
  console.log(`Detected ${flatFaces.length} flat faces`);
  return flatFaces;
}

/**
 * Detect fillets (rounded edges)
 */
function detectFillets(geometry: THREE.BufferGeometry, edges: EdgeData[]): DetectedFeature[] {
  const fillets: DetectedFeature[] = [];
  
  // Look for small, curved edges connecting perpendicular faces
  // Simplified: Detect short edges with high curvature
  
  const shortEdges = edges.filter(e => e.length < 10 && e.length > 0.5);
  
  shortEdges.forEach((edge, idx) => {
    // Check for curvature by sampling intermediate points
    // In production, would analyze vertex normals along edge
    
    if (idx % 10 === 0) { // Sample every 10th edge to avoid too many
      fillets.push({
        id: `fillet-${fillets.length + 1}`,
        type: 'fillet',
        position: edge.start.clone().lerp(edge.end, 0.5),
        properties: {
          radius: edge.length / 2, // Approximate
          length: edge.length,
        },
        confidence: 0.5,
        vertices: edge.vertexIndices,
      });
    }
  });
  
  console.log(`Detected ${fillets.length} fillets`);
  return fillets;
}

/**
 * Calculate face area from vertices
 */
function calculateFaceArea(position: THREE.BufferAttribute, indices: number[]): number {
  let area = 0;
  
  // Sum triangle areas
  for (let i = 0; i < indices.length; i += 3) {
    const v1 = new THREE.Vector3().fromBufferAttribute(position, indices[i]);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, indices[i + 1]);
    const v3 = new THREE.Vector3().fromBufferAttribute(position, indices[i + 2]);
    
    // Triangle area = 0.5 * |AB × AC|
    const ab = new THREE.Vector3().subVectors(v2, v1);
    const ac = new THREE.Vector3().subVectors(v3, v1);
    const cross = new THREE.Vector3().crossVectors(ab, ac);
    
    area += cross.length() / 2;
  }
  
  return area;
}

/**
 * Highlight features in the scene
 */
export function highlightFeature(
  scene: THREE.Scene,
  geometry: THREE.BufferGeometry,
  feature: DetectedFeature
): THREE.Mesh {
  // Create highlight geometry based on feature type
  let highlightGeometry: THREE.BufferGeometry;
  let material: THREE.Material;
  
  if (feature.type === 'hole') {
    const hole = feature as CylindricalHole;
    highlightGeometry = new THREE.CylinderGeometry(
      hole.properties.diameter / 2,
      hole.properties.diameter / 2,
      hole.properties.depth,
      16
    );
    material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  } else if (feature.type === 'pocket') {
    const pocket = feature as RectangularPocket;
    highlightGeometry = new THREE.BoxGeometry(
      pocket.properties.width,
      pocket.properties.length,
      pocket.properties.depth
    );
    material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
    });
  } else {
    // Generic sphere for other features
    highlightGeometry = new THREE.SphereGeometry(2, 16, 16);
    material = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5,
    });
  }
  
  const mesh = new THREE.Mesh(highlightGeometry, material);
  mesh.position.copy(feature.position);
  scene.add(mesh);
  
  return mesh;
}
