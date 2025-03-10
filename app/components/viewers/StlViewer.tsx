"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { MeasureButton } from "@/components/ui/measure-button"
import { MeasurementControls } from "@/lib/measurement"
import type { ViewerProps } from "@/lib/types"

export default function StlViewer({ 
  file, 
  isMeasuring, 
  onMeasureStart, 
  onMeasureEnd,
  onMeasurementUpdate 
}: ViewerProps & {
  isMeasuring?: boolean;
  onMeasureStart?: () => void;
  onMeasureEnd?: () => void;
  onMeasurementUpdate?: (data: { length?: number; angle?: number; message?: string }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const measurementControlsRef = useRef<MeasurementControls | null>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const isInitializedRef = useRef(false)
  
  // Track internal measuring state
  const [internalMeasuring, setInternalMeasuring] = useState(false)
  
  // Determine if measuring is active (either internal or external)
  const measuringActive = isMeasuring !== undefined ? isMeasuring : internalMeasuring

  // Effect to initialize and manage the 3D scene - only run once for the file
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return
    
    isInitializedRef.current = true
    console.log("Initializing STL viewer")

    // Initialize scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f5f5)
    sceneRef.current = scene

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = 5
    cameraRef.current = camera

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Initialize measurement controls with callback for measurement data
    const measurementControls = new MeasurementControls(scene, camera)
    measurementControls.onMeasurement = (data) => {
      if (onMeasurementUpdate) {
        onMeasurementUpdate({
          length: data.pointsDistance || undefined,
          angle: data.facesAngle ? (data.facesAngle * 180 / Math.PI) : undefined,
          message: data.message
        });
      }
    }
    measurementControlsRef.current = measurementControls
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight1.position.set(1, 1, 1)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight2.position.set(-1, -1, -1)
    scene.add(directionalLight2)

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controlsRef.current = controls

    // Load STL file
    const loader = new STLLoader()
    const fileURL = file.preview

    loader.load(
      fileURL,
      (geometry) => {
        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const geometryCenter = new THREE.Vector3()
        boundingBox.getCenter(geometryCenter)
        geometry.translate(-geometryCenter.x, -geometryCenter.y, -geometryCenter.z)

        const maxDim = Math.max(
          boundingBox.max.x - boundingBox.min.x,
          boundingBox.max.y - boundingBox.min.y,
          boundingBox.max.z - boundingBox.min.z,
        )
        const scale = 4 / maxDim
        geometry.scale(scale, scale, scale)

        const material = new THREE.MeshPhongMaterial({
          color: 0x3f88c5,
          specular: 0x111111,
          shininess: 200,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshesRef.current = [mesh]

        // Adjust camera to fit the model
        const box = new THREE.Box3().setFromObject(mesh)
        const size = box.getSize(new THREE.Vector3())
        const meshCenter = box.getCenter(new THREE.Vector3())

        const maxSize = Math.max(size.x, size.y, size.z)
        const fitHeightDistance = maxSize / (2 * Math.tan(Math.PI * camera.fov / 360))
        const fitWidthDistance = fitHeightDistance / camera.aspect
        const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance)

        camera.near = distance / 100
        camera.far = distance * 100
        camera.updateProjectionMatrix()

        camera.position.copy(meshCenter)
        camera.position.z += distance
        controls.target.copy(meshCenter)
        controls.update()

        // Start animation loop
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded")
      },
      (error) => {
        console.error("An error happened", error)
      },
    )

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      
      renderer.setSize(width, height)
    }
    
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      console.log("Cleaning up STL viewer")
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      window.removeEventListener("resize", handleResize)
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      
      renderer.dispose()
      isInitializedRef.current = false
    }
  }, [file, onMeasurementUpdate])

  // Set up event listeners for mouse movement and clicks
  useEffect(() => {
    if (!rendererRef.current || !measurementControlsRef.current) return;
    
    const renderer = rendererRef.current;
    const measurementControls = measurementControlsRef.current;
    
    // Event listeners for measurement
    const handleMouseMove = (event: MouseEvent) => {
      if (measuringActive) {
        console.log("Mouse move with measuring active");
        measurementControls.onMouseMove(event, renderer.domElement);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (measuringActive) {
        console.log("Click with measuring active");
        measurementControls.onClick(event, renderer.domElement, meshesRef.current);
      }
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleClick);
    
    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("click", handleClick);
    };
  }, [measuringActive]);

  // Effect to update measurement controls when measuring state changes
  useEffect(() => {
    if (!measurementControlsRef.current) return;
    
    console.log("Measuring state changed:", measuringActive);
    
    if (measuringActive) {
      measurementControlsRef.current.start();
    } else {
      measurementControlsRef.current.stop();
    }
  }, [measuringActive]);

  const handleMeasureStart = () => {
    console.log("Measure start");
    setInternalMeasuring(true);
    if (onMeasureStart) onMeasureStart();
  };

  const handleMeasureEnd = () => {
    console.log("Measure end");
    setInternalMeasuring(false);
    if (onMeasureEnd) onMeasureEnd();
  };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Only show the internal measure button if not controlled externally */}
      {isMeasuring === undefined && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-1">
          <MeasureButton 
            active={internalMeasuring}
            onMeasureStart={handleMeasureStart} 
            onMeasureEnd={handleMeasureEnd} 
          />
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}