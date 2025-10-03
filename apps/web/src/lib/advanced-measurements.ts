/**
 * Advanced Measurement Tools
 * 
 * Provides angle, radius, and area measurement capabilities
 * for 3D CAD models with raycasting and visual indicators
 */

import * as THREE from 'three';

export type MeasurementType = 'distance' | 'angle' | 'radius' | 'area';

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  points: THREE.Vector3[];
  label: string;
}

export interface AngleMeasurement extends Measurement {
  type: 'angle';
  value: number; // degrees
  unit: '°';
  points: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; // vertex, point1, point2
  arc?: THREE.Line; // Visual arc
}

export interface RadiusMeasurement extends Measurement {
  type: 'radius';
  value: number; // mm
  unit: 'mm';
  points: [THREE.Vector3, THREE.Vector3]; // center, edge
  circle?: THREE.Line; // Visual circle
}

export interface AreaMeasurement extends Measurement {
  type: 'area';
  value: number; // mm²
  unit: 'mm²';
  points: THREE.Vector3[]; // Polygon vertices
  mesh?: THREE.Mesh; // Visual polygon
}

/**
 * Angle Measurement Tool
 */
export class AngleMeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private tempMarkers: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }
  
  /**
   * Handle click for angle measurement
   * Requires 3 clicks: vertex, point1, point2
   */
  onClick(event: MouseEvent, mesh: THREE.Mesh): AngleMeasurement | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera({ x, y }, this.camera);
    const intersects = this.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      this.points.push(point);
      
      // Add temporary marker
      const marker = this.createMarker(point);
      this.tempMarkers.push(marker);
      this.scene.add(marker);
      
      // If we have 3 points, calculate angle
      if (this.points.length === 3) {
        const measurement = this.calculateAngle();
        this.cleanup();
        return measurement;
      }
    }
    
    return null;
  }
  
  /**
   * Calculate angle from 3 points
   */
  private calculateAngle(): AngleMeasurement {
    const [vertex, point1, point2] = this.points;
    
    // Create vectors from vertex to each point
    const v1 = new THREE.Vector3().subVectors(point1, vertex).normalize();
    const v2 = new THREE.Vector3().subVectors(point2, vertex).normalize();
    
    // Calculate angle using dot product
    const dotProduct = v1.dot(v2);
    const angleRadians = Math.acos(THREE.MathUtils.clamp(dotProduct, -1, 1));
    const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);
    
    // Create visual arc
    const arc = this.createArc(vertex, point1, point2, angleRadians);
    
    return {
      id: `angle-${Date.now()}`,
      type: 'angle',
      value: angleDegrees,
      unit: '°',
      points: [vertex, point1, point2],
      label: `${angleDegrees.toFixed(1)}°`,
      arc,
    };
  }
  
  /**
   * Create visual arc for angle
   */
  private createArc(
    vertex: THREE.Vector3,
    point1: THREE.Vector3,
    point2: THREE.Vector3,
    angleRadians: number
  ): THREE.Line {
    const radius = Math.min(
      vertex.distanceTo(point1),
      vertex.distanceTo(point2)
    ) * 0.3;
    
    const v1 = new THREE.Vector3().subVectors(point1, vertex).normalize();
    const v2 = new THREE.Vector3().subVectors(point2, vertex).normalize();
    
    // Create arc curve
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius, radius,
      0, angleRadians,
      false,
      0
    );
    
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => {
        // Transform to 3D
        const point3d = v1.clone().multiplyScalar(radius);
        // Rotate around axis perpendicular to v1 and v2
        const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
        point3d.applyAxisAngle(axis, (p.x / radius));
        return point3d.add(vertex);
      })
    );
    
    const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    const arc = new THREE.Line(geometry, material);
    this.scene.add(arc);
    
    return arc;
  }
  
  private createMarker(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    return marker;
  }
  
  private cleanup(): void {
    this.tempMarkers.forEach(marker => this.scene.remove(marker));
    this.tempMarkers = [];
    this.points = [];
  }
  
  reset(): void {
    this.cleanup();
  }
}

/**
 * Radius Measurement Tool
 */
export class RadiusMeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private tempMarkers: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }
  
  /**
   * Handle click for radius measurement
   * Requires 2 clicks: center, edge
   */
  onClick(event: MouseEvent, mesh: THREE.Mesh): RadiusMeasurement | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera({ x, y }, this.camera);
    const intersects = this.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      this.points.push(point);
      
      // Add temporary marker
      const marker = this.createMarker(point);
      this.tempMarkers.push(marker);
      this.scene.add(marker);
      
      // If we have 2 points, calculate radius
      if (this.points.length === 2) {
        const measurement = this.calculateRadius();
        this.cleanup();
        return measurement;
      }
    }
    
    return null;
  }
  
  /**
   * Calculate radius from 2 points
   */
  private calculateRadius(): RadiusMeasurement {
    const [center, edge] = this.points;
    const radius = center.distanceTo(edge);
    
    // Create visual circle
    const circle = this.createCircle(center, edge, radius);
    
    return {
      id: `radius-${Date.now()}`,
      type: 'radius',
      value: radius,
      unit: 'mm',
      points: [center, edge],
      label: `R${radius.toFixed(2)}`,
      circle,
    };
  }
  
  /**
   * Create visual circle for radius
   */
  private createCircle(
    center: THREE.Vector3,
    edge: THREE.Vector3,
    radius: number
  ): THREE.Line {
    // Calculate circle normal (perpendicular to center-edge vector)
    const toEdge = new THREE.Vector3().subVectors(edge, center).normalize();
    
    // Create circle in XY plane, then orient it
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius, radius,
      0, 2 * Math.PI,
      false,
      0
    );
    
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => {
        // Create 3D point
        const point3d = new THREE.Vector3(p.x, p.y, 0);
        
        // Orient to match edge direction
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(
          new THREE.Vector3(1, 0, 0),
          toEdge
        );
        point3d.applyQuaternion(quaternion);
        
        return point3d.add(center);
      })
    );
    
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const circle = new THREE.Line(geometry, material);
    this.scene.add(circle);
    
    // Add radius line
    const radiusGeometry = new THREE.BufferGeometry().setFromPoints([center, edge]);
    const radiusLine = new THREE.Line(radiusGeometry, material);
    this.scene.add(radiusLine);
    
    return circle;
  }
  
  /**
   * Auto-detect circular features and measure radius
   */
  detectCircularFeature(mesh: THREE.Mesh, clickPoint: THREE.Vector3): RadiusMeasurement | null {
    // Analyze local geometry around click point
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position;
    
    // Find nearby vertices
    const nearbyVertices: THREE.Vector3[] = [];
    for (let i = 0; i < position.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(position, i);
      if (v.distanceTo(clickPoint) < 20) {
        nearbyVertices.push(v);
      }
    }
    
    if (nearbyVertices.length < 10) return null;
    
    // Calculate centroid
    const center = new THREE.Vector3();
    nearbyVertices.forEach(v => center.add(v));
    center.divideScalar(nearbyVertices.length);
    
    // Calculate average radius
    let totalRadius = 0;
    nearbyVertices.forEach(v => {
      totalRadius += center.distanceTo(v);
    });
    const radius = totalRadius / nearbyVertices.length;
    
    // Check if it's actually circular (low standard deviation)
    let variance = 0;
    nearbyVertices.forEach(v => {
      const r = center.distanceTo(v);
      variance += Math.pow(r - radius, 2);
    });
    const stdDev = Math.sqrt(variance / nearbyVertices.length);
    
    // If standard deviation is low, it's a circle
    if (stdDev / radius < 0.1) {
      const circle = this.createCircle(center, nearbyVertices[0], radius);
      
      return {
        id: `radius-auto-${Date.now()}`,
        type: 'radius',
        value: radius,
        unit: 'mm',
        points: [center, nearbyVertices[0]],
        label: `R${radius.toFixed(2)} (auto)`,
        circle,
      };
    }
    
    return null;
  }
  
  private createMarker(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    return marker;
  }
  
  private cleanup(): void {
    this.tempMarkers.forEach(marker => this.scene.remove(marker));
    this.tempMarkers = [];
    this.points = [];
  }
  
  reset(): void {
    this.cleanup();
  }
}

/**
 * Area Measurement Tool
 */
export class AreaMeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[] = [];
  private tempMarkers: THREE.Mesh[] = [];
  private tempLines: THREE.Line[] = [];
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }
  
  /**
   * Handle click for area measurement
   * Requires 3+ clicks to define polygon, double-click to finish
   */
  onClick(event: MouseEvent, mesh: THREE.Mesh, isDoubleClick: boolean = false): AreaMeasurement | null {
    if (isDoubleClick && this.points.length >= 3) {
      const measurement = this.calculateArea();
      this.cleanup();
      return measurement;
    }
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera({ x, y }, this.camera);
    const intersects = this.raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      this.points.push(point);
      
      // Add temporary marker
      const marker = this.createMarker(point);
      this.tempMarkers.push(marker);
      this.scene.add(marker);
      
      // Add line from previous point
      if (this.points.length > 1) {
        const line = this.createLine(
          this.points[this.points.length - 2],
          this.points[this.points.length - 1]
        );
        this.tempLines.push(line);
        this.scene.add(line);
      }
    }
    
    return null;
  }
  
  /**
   * Calculate area of polygon
   */
  private calculateArea(): AreaMeasurement {
    // Use Shoelace formula for polygon area
    let area = 0;
    const n = this.points.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += this.points[i].x * this.points[j].y;
      area -= this.points[j].x * this.points[i].y;
    }
    
    area = Math.abs(area) / 2;
    
    // Create visual mesh
    const meshVisual = this.createPolygonMesh(this.points);
    
    return {
      id: `area-${Date.now()}`,
      type: 'area',
      value: area,
      unit: 'mm²',
      points: [...this.points],
      label: `${area.toFixed(2)} mm²`,
      mesh: meshVisual,
    };
  }
  
  /**
   * Create visual polygon mesh
   */
  private createPolygonMesh(points: THREE.Vector3[]): THREE.Mesh {
    const shape = new THREE.Shape();
    
    // Project to 2D (use XY plane)
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.lineTo(points[0].x, points[0].y);
    
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    
    return mesh;
  }
  
  private createMarker(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    return marker;
  }
  
  private createLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
    return new THREE.Line(geometry, material);
  }
  
  private cleanup(): void {
    this.tempMarkers.forEach(marker => this.scene.remove(marker));
    this.tempLines.forEach(line => this.scene.remove(line));
    this.tempMarkers = [];
    this.tempLines = [];
    this.points = [];
  }
  
  reset(): void {
    this.cleanup();
  }
}
