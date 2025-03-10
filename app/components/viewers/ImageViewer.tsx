"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import type { ViewerProps } from "@/lib/types"

export default function ImageViewer({ file }: ViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.1))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  return (
    <div className={cn("relative h-full")}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-1">
        <Button variant="ghost" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Image container */}
      <div className="w-full h-full flex items-center justify-center overflow-auto">
        <div
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.2s ease-out",
          }}
          className="relative"
        >
          <Image
            src={file.preview}
            alt={file.name}
            width={800}
            height={600}
            className="max-w-none object-contain"
            style={{ transformOrigin: "center" }}
          />
        </div>
      </div>
    </div>
  )
}