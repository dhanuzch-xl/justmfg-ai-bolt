"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader"
import type { ViewerProps } from "@/lib/types"

export default function ThreeMfViewer({ file }: ViewerProps) {
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

    // Load 3MF file
    const loader = new ThreeMFLoader()
    const fileURL = file.preview

    loader.load(
      fileURL,
      (object) => {
        // Center the object around origin
        const box = new THREE.Box3().setFromObject(object)
        const center = new THREE.Vector3()
        box.getCenter(center)
        object.position.sub(center)

        // Ensure we can see the entire object using bounding sphere
        const sphere = new THREE.Sphere()
        box.getBoundingSphere(sphere)

        // Configure camera's near/far based on the model size
        camera.near = sphere.radius / 10
        camera.far = sphere.radius * 100
        camera.updateProjectionMatrix()

        // Position camera so model is fully visible
        camera.position.set(0, 0, sphere.radius * 2)

        scene.add(object)
        controls.update()
      },
      (xhr) => {
        // Progress callback if needed
      },
      (error) => {
        console.error("Error loading 3MF file:", error)
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