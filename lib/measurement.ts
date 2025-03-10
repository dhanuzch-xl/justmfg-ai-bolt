import * as THREE from 'three';

interface MeasurementValues {
  pointsDistance: number | null;
  parallelFacesDistance: number | null;
  facesAngle: number | null;
  unit: string;
  message?: string;
}

// Define a callback type for measurement updates
export type MeasurementCallback = (data: MeasurementValues) => void;

// Simplified Marker class
class Marker {
  protected intersection: THREE.Intersection;
  private markerObject: THREE.Object3D;
  private radius: number;

  constructor(intersection: THREE.Intersection, radius: number) {
    this.intersection = intersection;
    this.markerObject = new THREE.Object3D();
    this.radius = radius;
    
    this.createMarkerGeometry();
    this.updatePosition();
  }

  private createMarkerGeometry() {
    // Create a simple circle marker
    const segments = 32;
    const circleGeometry = new THREE.CircleGeometry(this.radius, segments);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x263238,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    
    // Create cross lines
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xFFFFFF,
      depthTest: false,
      linewidth: 2
    });
    
    const crossGeometry1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-this.radius, 0, 0),
      new THREE.Vector3(this.radius, 0, 0)
    ]);
    
    const crossGeometry2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -this.radius, 0),
      new THREE.Vector3(0, this.radius, 0)
    ]);
    
    const line1 = new THREE.Line(crossGeometry1, lineMaterial);
    const line2 = new THREE.Line(crossGeometry2, lineMaterial);
    
    // Add all elements to the marker object
    this.markerObject.add(circle);
    this.markerObject.add(line1);
    this.markerObject.add(line2);
    
    // Set high render order
    this.markerObject.renderOrder = 999;
  }

  protected updatePosition() {
    if (!this.intersection.face) return;
    
    // Position the marker at the intersection point
    this.markerObject.position.copy(this.intersection.point);
    
    // Get the face normal
    const normal = this.getFaceNormal();
    
    // Offset slightly along normal to prevent z-fighting
    this.markerObject.position.addScaledVector(normal, 0.01);
    
    // Orient the marker to face the camera
    this.markerObject.lookAt(
      this.markerObject.position.clone().add(normal)
    );
  }

  protected getFaceNormal(): THREE.Vector3 {
    if (!this.intersection.face) {
      return new THREE.Vector3(0, 1, 0);
    }
    
    const normalMatrix = new THREE.Matrix4();
    this.intersection.object.updateWorldMatrix(true, false);
    normalMatrix.extractRotation(this.intersection.object.matrixWorld);
    
    return this.intersection.face.normal.clone().applyMatrix4(normalMatrix);
  }

  public getObject(): THREE.Object3D {
    return this.markerObject;
  }

  public getIntersection(): THREE.Intersection {
    return this.intersection;
  }
}

// Hover marker with different color
class HoverMarker extends Marker {
  constructor(intersection: THREE.Intersection, radius: number) {
    super(intersection, radius);
    
    // Change color of the hover marker
    this.getObject().children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).color.set(0xFF0000);
        (child.material as THREE.MeshBasicMaterial).opacity = 0.6;
      }
      if (child instanceof THREE.Line) {
        (child.material as THREE.LineBasicMaterial).color.set(0xFFFFFF);
        (child.material as THREE.LineBasicMaterial).linewidth = 3;
      }
    });
    
    // Ensure it's visible and on top
    this.getObject().visible = true;
    this.getObject().renderOrder = 1000;
  }

  public update(intersection: THREE.Intersection | null) {
    if (intersection && intersection.face) {
      this.getObject().visible = true;
      this.intersection = intersection;
      this.updatePosition();
    } else {
      this.getObject().visible = false;
    }
  }
}

export class MeasurementControls {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private measuring: boolean;
  private markers: Marker[];
  private hoverMarker: HoverMarker | null;
  private measurementLine: THREE.Line | null;
  private domElement: HTMLElement | null;
  private sourceUnit: string;
  private displayUnit: string;
  private conversionFactor: number;
  
  // Add callback for measurement updates
  public onMeasurement: MeasurementCallback | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.measuring = false;
    this.markers = [];
    this.hoverMarker = null;
    this.measurementLine = null;
    this.domElement = null;
    this.sourceUnit = 'mm';
    this.displayUnit = 'mm';
    this.conversionFactor = 1;
  }

  // Replace panel with callback
  private updateMeasurementInfo(values: MeasurementValues) {
    if (this.onMeasurement) {
      this.onMeasurement(values);
    }
  }

  private calculateMeasurements(): MeasurementValues {
    if (this.markers.length !== 2) {
      return {
        pointsDistance: null,
        parallelFacesDistance: null,
        facesAngle: null,
        unit: this.displayUnit,
        message: this.markers.length === 0 ? 'Select a point' : 'Select another point'
      };
    }

    const intersection1 = this.markers[0].getIntersection();
    const intersection2 = this.markers[1].getIntersection();
    
    if (!intersection1.face || !intersection2.face) {
      return {
        pointsDistance: null,
        parallelFacesDistance: null,
        facesAngle: null,
        unit: this.displayUnit,
        message: 'Invalid measurement'
      };
    }

    const point1 = intersection1.point;
    const point2 = intersection2.point;
    const distance = point1.distanceTo(point2);

    // Get face normals
    const normal1Matrix = new THREE.Matrix4();
    const normal2Matrix = new THREE.Matrix4();
    intersection1.object.updateWorldMatrix(true, false);
    intersection2.object.updateWorldMatrix(true, false);
    normal1Matrix.extractRotation(intersection1.object.matrixWorld);
    normal2Matrix.extractRotation(intersection2.object.matrixWorld);
    
    const normal1 = intersection1.face.normal.clone().applyMatrix4(normal1Matrix);
    const normal2 = intersection2.face.normal.clone().applyMatrix4(normal2Matrix);

    const angle = normal1.angleTo(normal2);
    
    let parallelDistance: number | null = null;
    if (Math.abs(angle) < 0.01 || Math.abs(angle - Math.PI) < 0.01) {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal1, point1);
      parallelDistance = Math.abs(plane.distanceToPoint(point2));
    }

    return {
      pointsDistance: distance,
      parallelFacesDistance: parallelDistance,
      facesAngle: angle,
      unit: this.displayUnit
    };
  }

  private updateMeasurementLine() {
    if (this.measurementLine) {
      this.scene.remove(this.measurementLine);
    }

    if (this.markers.length === 2) {
      const point1 = this.markers[0].getIntersection().point;
      const point2 = this.markers[1].getIntersection().point;
      
      const geometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
      const material = new THREE.LineBasicMaterial({ 
        color: 0x263238,
        depthTest: false,
        linewidth: 2
      });
      
      this.measurementLine = new THREE.Line(geometry, material);
      this.measurementLine.renderOrder = 998;
      this.scene.add(this.measurementLine);
    }
  }

  public start() {
    this.measuring = true;
    this.clear();
    
    // Create a dummy intersection for the hover marker
    const dummyIntersection = {
      point: new THREE.Vector3(),
      face: {
        normal: new THREE.Vector3(0, 1, 0),
        materialIndex: 0
      },
      object: new THREE.Object3D()
    } as THREE.Intersection;
    
    // Create hover marker with larger radius
    this.hoverMarker = new HoverMarker(dummyIntersection, 0.1);
    this.scene.add(this.hoverMarker.getObject());
    
    // Send initial message
    this.updateMeasurementInfo({
      pointsDistance: null,
      parallelFacesDistance: null,
      facesAngle: null,
      unit: this.displayUnit,
      message: 'Select a point'
    });
  }

  public stop() {
    this.measuring = false;
    this.clear();
    
    if (this.hoverMarker) {
      this.scene.remove(this.hoverMarker.getObject());
      this.hoverMarker = null;
    }
  }

  public clear() {
    if (this.measurementLine) {
      this.scene.remove(this.measurementLine);
      this.measurementLine = null;
    }
    
    for (const marker of this.markers) {
      this.scene.remove(marker.getObject());
    }
    this.markers = [];
  }

  public onMouseMove(event: MouseEvent, domElement: HTMLElement) {
    if (!this.measuring) return;

    this.domElement = domElement;
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Use scene.children to get all objects including the loaded model
    const intersects = this.raycaster.intersectObjects(this.scene.children, true)
      .filter(intersect => intersect.face);

    if (this.hoverMarker) {
      this.hoverMarker.update(intersects.length > 0 ? intersects[0] : null);
    }
  }

  public onClick(event: MouseEvent, domElement: HTMLElement, meshes: THREE.Mesh[]) {
    if (!this.measuring) return;

    this.domElement = domElement;
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Use meshes parameter to ensure we're only intersecting with the model
    const intersects = this.raycaster.intersectObjects(meshes)
      .filter(intersect => intersect.face);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      
      // Calculate marker radius based on model size
      const boundingBox = new THREE.Box3();
      meshes.forEach(mesh => boundingBox.expandByObject(mesh));
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const radius = Math.min(size.x, size.y, size.z) * 0.02;

      const marker = new Marker(intersection, radius);
      this.markers.push(marker);
      this.scene.add(marker.getObject());

      this.updateMeasurementLine();
      
      // Update measurement info based on number of markers
      if (this.markers.length === 1) {
        this.updateMeasurementInfo({
          pointsDistance: null,
          parallelFacesDistance: null,
          facesAngle: null,
          unit: this.displayUnit,
          message: 'Select another point'
        });
      } else if (this.markers.length === 2) {
        const measurements = this.calculateMeasurements();
        this.updateMeasurementInfo(measurements);
      } else if (this.markers.length > 2) {
        this.clear();
        this.updateMeasurementInfo({
          pointsDistance: null,
          parallelFacesDistance: null,
          facesAngle: null,
          unit: this.displayUnit,
          message: 'Select a point'
        });
      }
    }
  }

  public update() {
    if (!this.measuring) return;

    if (this.markers.length === 2) {
      const measurements = this.calculateMeasurements();
      this.updateMeasurementInfo(measurements);
    }
  }

  public isMeasuring() {
    return this.measuring;
  }
}