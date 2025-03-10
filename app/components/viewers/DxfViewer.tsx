"use client"

import { useEffect, useRef, useState, memo } from "react"
import dynamic from "next/dynamic"
import type { FileWithPreview, ViewerProps } from "@/lib/types"
import * as THREE from "three"
import { Layers as LayersIcon } from "lucide-react"

// We'll keep a module-level variable to cache the dxf-viewer class.
let DxfViewerClass: any = null

function DxfViewerComponent({ file }: { file: ViewerProps['file'] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [layers, setLayers] = useState<any[] | null>(null)
  const [showLayers, setShowLayers] = useState(false)

  // First, ensure the dxf-viewer class is dynamically imported and available
  useEffect(() => {
    async function loadDxfViewerClass() {
      try {
        if (!DxfViewerClass) {
          const mod = await import("dxf-viewer")
          // Setup worker if needed
          if (mod?.DxfViewer?.SetupWorker) {
            mod.DxfViewer.SetupWorker()
          }
          DxfViewerClass = mod.DxfViewer
        }
      } catch (err) {
        console.error("Error loading DXF viewer module:", err)
        setError("Failed to initialize DXF viewer")
        setIsLoading(false)
      }
    }

    loadDxfViewerClass()
  }, [])

  // Once we have the class, create a viewer instance in an effect.
  useEffect(() => {
    // If the container or the class isn't ready, do nothing yet.
    if (!containerRef.current || !DxfViewerClass) return

    let viewer: any = null;
    
    // Set up your viewer
    const options = {
      clearColor: new THREE.Color(0xffffff), // White background
      autoResize: true,
      colorCorrection: true,
      sceneOptions: {
        wireframeMesh: true,
      },
    }

    try {
      // Initialize the viewer
      viewer = new DxfViewerClass(containerRef.current, options)
      viewerRef.current = viewer

      // When "loaded" event fires, show all layers/entities and zoom extents
      viewer.Subscribe("loaded", () => {
        setIsLoading(false)
        setError(null)
        
        try {
          // Get ALL layers (pass `false` so it doesn't skip "unused" layers)
          const layerData = viewer.GetLayers(false)
          if (layerData) {
            // Set all layers to visible individually
            layerData.forEach((layer: any) => {
              viewer.ShowLayer(layer.name, true);
            });
            
            setLayers(
              layerData.map((layer: any) => ({
                ...layer,
                isVisible: true,
              }))
            )
          }
          
          // Try different zoom methods that might be available
          if (typeof viewer.ZoomExtents === 'function') {
            viewer.ZoomExtents();
          } else if (typeof viewer.ZoomAll === 'function') {
            viewer.ZoomAll();
          } else if (typeof viewer.FitToView === 'function') {
            viewer.FitToView();
          }
        } catch (err) {
          console.error("Error setting up layers:", err)
          setError("Error setting up layers")
        }
      })

      viewer.Subscribe("error", (e: any) => {
        const errorMessage = e.detail?.message || e.detail || "Unknown error occurred"
        console.error("DXF Viewer error:", errorMessage)
        setError(errorMessage)
        setIsLoading(false)
      })

      // Actually load the file from its preview/url
      loadDxfFile(file.preview)
    } catch (err) {
      console.error("Error initializing DXF viewer:", err)
      setError(err instanceof Error ? err.message : String(err))
      setIsLoading(false)
      viewerRef.current = null
    }

    // Cleanup when unmounting (or when file changes)
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.Destroy()
        } catch (err) {
          console.error("Error destroying DXF viewer:", err)
        }
        viewerRef.current = null
      }
    }
  }, [file, DxfViewerClass])

  // Load a given DXF file by URL
  const loadDxfFile = async (url: string) => {
    if (!viewerRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      await viewerRef.current.Load({
        url,
        progressCbk: handleProgress,
        fonts: [],       // Provide an empty array if you don't have custom fonts
        workerFactory: null,
      })
    } catch (err) {
      console.error("Error loading DXF file:", err)
      setError(err instanceof Error ? err.message : "Failed to load DXF file")
    } finally {
      setIsLoading(false)
      setProgress(null)
      setProgressText(null)
    }
  }

  // Handle loading progress
  const handleProgress = (phase: string, size: number, totalSize: number | null) => {
    let text = "Loading..."
    switch (phase) {
      case "font":
        text = "Fetching fonts..."
        break
      case "fetch":
        text = "Fetching file..."
        break
      case "parse":
        text = "Parsing file..."
        break
      case "prepare":
        text = "Preparing rendering data..."
        break
    }
    setProgressText(text)

    if (totalSize === null) {
      setProgress(-1) // Indeterminate
    } else {
      setProgress(size / totalSize)
    }
  }

  // Toggle a layer's visibility
  const toggleLayer = (layerName: string, visible: boolean) => {
    if (!viewerRef.current || !layers) return
    try {
      viewerRef.current.ShowLayer(layerName, visible)
      setLayers(
        layers.map((layer) =>
          layer.name === layerName ? { ...layer, isVisible: visible } : layer
        )
      )
    } catch (err) {
      console.error("Error toggling layer visibility:", err)
      setError("Failed to toggle layer visibility")
    }
  }

  return (
    <div className="relative w-full h-full flex">
      {/* Viewer container */}
      <div
        ref={containerRef}
        className={`h-full min-w-[100px] min-h-[100px] relative ${showLayers ? 'flex-1' : 'w-full'}`}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex flex-col items-center">
              <div className="loading-spinner mb-2"></div>
              {progressText && (
                <p className="text-sm text-muted-foreground">{progressText}</p>
              )}
              {progress !== null && progress >= 0 && (
                <div className="w-48 mt-2 bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center z-20">
            <div className="bg-background p-4 rounded-md shadow-md">
              <p className="text-destructive font-medium">Error loading DXF file</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {/* Layers toggle button */}
        {layers && layers.length > 0 && (
          <button
            onClick={() => setShowLayers(!showLayers)}
            className="absolute top-2 right-2 bg-background border border-border rounded-md p-1.5 shadow-sm z-10 hover:bg-muted/50"
            title={showLayers ? "Hide layers" : "Show layers"}
          >
            <LayersIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Layer panel - only shown when showLayers is true */}
      {layers && layers.length > 0 && showLayers && (
        <div className="w-64 h-full border-l border-border overflow-y-auto p-2 bg-background">
          <h3 className="font-medium mb-2">Layers</h3>

          {/* Toggle ALL layers */}
          <div className="flex items-center mb-2 p-2 hover:bg-muted/50 rounded">
            <input
              type="checkbox"
              id="toggle-all-layers"
              className="mr-2"
              checked={layers.every((l) => l.isVisible)}
              onChange={(e) => {
                const visible = e.target.checked
                layers.forEach((layer) => toggleLayer(layer.name, visible))
              }}
            />
            <label htmlFor="toggle-all-layers" className="text-sm italic">
              All layers
            </label>
          </div>

          {/* Individual layers */}
          {layers.map((layer) => (
            <div key={layer.name} className="flex items-center p-2 hover:bg-muted/50 rounded">
              <div
                className="w-4 h-4 mr-2"
                style={{
                  backgroundColor: `#${layer.color.toString(16).padStart(6, "0")}`,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="checkbox"
                id={`layer-${layer.name}`}
                className="mr-2"
                checked={layer.isVisible}
                onChange={(e) => toggleLayer(layer.name, e.target.checked)}
              />
              <label htmlFor={`layer-${layer.name}`} className="text-sm truncate">
                {layer.displayName || layer.name}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Export the component *dynamically* so Next.js doesn't SSR it
export const DxfViewer = dynamic(() => Promise.resolve(DxfViewerComponent), {
  ssr: false,
})