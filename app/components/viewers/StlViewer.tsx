"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import type { ViewerProps } from "@/lib/types"

export default function StlViewer({ file }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

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
        // Center the geometry
        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)
        geometry.translate(-center.x, -center.y, -center.z)

        // Scale the model to fit the view
        const maxDim = Math.max(
          boundingBox.max.x - boundingBox.min.x,
          boundingBox.max.y - boundingBox.min.y,
          boundingBox.max.z - boundingBox.min.z,
        )
        const scale = 4 / maxDim
        geometry.scale(scale, scale, scale)

        // Create material and mesh
        const material = new THREE.MeshPhongMaterial({
          color: 0x3f88c5,
          specular: 0x111111,
          shininess: 200,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // Add wireframe
        const wireframe = new THREE.LineSegments(
          new THREE.WireframeGeometry(geometry),
          new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true }),
        )
        scene.add(wireframe)

        // Position camera to view the model
        camera.position.z = 5
        controls.update()
      },
      (xhr) => {
        // Progress callback
      },
      (error) => {
        console.error("Error loading STL file:", error)
      },
    )

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && rendererRef.current && cameraRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        rendererRef.current.setSize(width, height)
        cameraRef.current.aspect = width / height
        cameraRef.current.updateProjectionMatrix()
      }
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, [file])

  return <div ref={containerRef} className="w-full h-full min-h-[400px]" />
}