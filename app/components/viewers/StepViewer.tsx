"use client"

import { useEffect, memo, useState, useRef, Suspense } from "react"
import { useProgress, OrbitControls, Html, Environment } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { cn } from "@/lib/utils"
import * as THREE from "three"
import type { Object3D } from "three"
import { Button } from "@/components/ui/button"
import { Grid, RotateCcw, Boxes } from "lucide-react"
import {LoadStep} from "./StepLoader"

interface StepModelProps {
  url: string
  fileName: string
  onAssemblyDetected?: (assemblyName: string, partNames?: string[]) => void
}

function StepModel({ url, fileName, onAssemblyDetected, ...props }: StepModelProps) {
  const [obj, setObj] = useState<Object3D | null>(null)
  const [loading, setLoading] = useState(true)
  const [assemblyNotified, setAssemblyNotified] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const mainObject = await LoadStep(url)
        setObj(mainObject)
        setLoading(false)
      } catch (error) {
        console.error("Error loading model:", error)
        setLoading(false)
      }
    }
    load()
  }, [url])

  if (loading) {
    return (
      <Html center>
        <div className="flex flex-col items-center justify-center">
          <p className="text-gray-600">Loading model...</p>
        </div>
      </Html>
    )
  }

  if (!obj) {
    return (
      <Html center>
        <p className="text-red-500">Error loading model</p>
      </Html>
    )
  }

  // If multiple parts are detected, treat the file as an assembly.
  if (obj && obj.children.length > 1 && !assemblyNotified) {
    // Extract part names from the object children, ensuring we get proper names
    const partNames = obj.children.map((child, index) => {
      // Try to get a meaningful name from the object
      let name = child.name;
      
      // If name is empty or just a number, try to extract a better name
      if (!name || /^\d+$/.test(name)) {
        // Check if there's userData with product information (common in STEP files)
        if (child.userData && child.userData.product) {
          name = child.userData.product;
        } else if (child.userData && child.userData.name) {
          name = child.userData.name;
        } else {
          // If we still don't have a name, check if it's a mesh with geometry name
          if (child.type === 'Mesh' && child.geometry && child.geometry.name) {
            name = child.geometry.name;
          } else {
            // Last resort - create a descriptive name based on type and position
            name = `Part_${index+1}`;
          }
        }
      }
      
      return name || `Part_${index+1}`;
    });
    
    // Call the callback to notify parent to create an assembly.
    if (onAssemblyDetected) {
      onAssemblyDetected(fileName, partNames);
      setAssemblyNotified(true); // Mark as notified to prevent repeated calls
    }
    
    return (
      <Html center>
        <div className="flex flex-col items-center justify-center">
          <p className="text-red-500">
            This STEP file contains multiple parts.
          </p>
          <p className="text-red-500">
            An assembly named <span className="font-semibold">{fileName}</span> has been created,
            and this file has been moved under it.
          </p>
          <p className="text-red-500">
            Please upload the remaining parts inside the assembly folder.
          </p>
        </div>
      </Html>
    )
  }

  // Render normally if only one part is found.
  return (
    <mesh {...props} scale={0.2}>
      {obj.children.map((child, index) => (
        <primitive key={index} object={child} />
      ))}
    </mesh>
  )
}

const MemoizedStepModel = memo(StepModel)

const VALID_EXTENSIONS = ["step", "stp"]

interface StepViewerProps {
  fileUrl: string
  fileName: string
  className?: string
  onAssemblyDetected?: (assemblyName: string, partNames?: string[]) => void
}

export default function StepViewer({
  fileUrl,
  fileName,
  className,
  onAssemblyDetected,
  ...props
}: StepViewerProps) {
  const [showGrid, setShowGrid] = useState(false)
  const [showAxes, setShowAxes] = useState(false)
  const orbitControlsRef = useRef<any>(null)

  const resetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset()
    }
  }

  // Check if the file extension is valid
  const extension = fileName.split(".").pop()?.toLowerCase() || "step"

  if (!VALID_EXTENSIONS.includes(extension)) {
    return (
      <div className={cn("h-full", className)} {...props}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center text-gray-600">
            The file format <span className="font-semibold">{extension}</span> is not supported.
            Please upload a <span className="font-semibold">CAD</span> file.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full relative w-full", className)} {...props}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowGrid(prev => !prev)}
          className={showGrid ? "bg-secondary" : ""}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAxes(prev => !prev)}
          className={showAxes ? "bg-secondary" : ""}
        >
          <Boxes className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetCamera}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
        }}
        style={{ width: "100%", height: "100%" }}
        camera={{
          position: [5, 5, 5],
          fov: 50,
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<Loader />}>
          <OrbitControls
            ref={orbitControlsRef}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.75}
            enableDamping
            dampingFactor={0.05}
            minDistance={50}
            maxDistance={400}
          />

          {/* Lighting setup */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-10, -10, -10]} intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Environment preset="warehouse" />

          {/* Helpers */}
          {showGrid && <gridHelper args={[1000, 100]} />}
          {showAxes && <axesHelper args={[500]} />}

          <MemoizedStepModel
            url={fileUrl}
            fileName={fileName}
            onAssemblyDetected={onAssemblyDetected}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

function Loader() {
  const { progress } = useProgress()
  return <Html center>{progress} % loaded</Html>
}