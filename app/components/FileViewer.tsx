"use client"

import { useEffect, useState, useRef } from "react"
import { FileItem } from "../types"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { captureViewerImage } from "@/lib/screenshot"
import type { ChatPanelHandle } from "./ChatPanel"

// Dynamically import viewers to reduce initial bundle size
const ImageViewer = dynamic(() => import("./viewers/ImageViewer"), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

const PdfViewer = dynamic(() => import("./viewers/PdfViewer"), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

const StepViewer = dynamic(() => import("./viewers/StepViewer"), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

const StlViewer = dynamic(() => import("./viewers/StlViewer"), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

const ThreeMfViewer = dynamic(() => import("./viewers/ThreeMfViewer"), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

const DxfViewer = dynamic(() => import("./viewers/DxfViewer").then(mod => mod.DxfViewer), {
  loading: () => <ViewerSkeleton />,
  ssr: false,
})

interface FileViewerProps {
  file: FileItem | null
  className?: string
  chatPanel?: {
    addImageMessage: (image: string) => void
  }
}

export function FileViewer({ file, className, chatPanel }: FileViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCaptureView = async () => {
    if (!viewerRef.current || !chatPanel) return

    setIsCapturing(true)
    try {
      // Get the viewer container
      const viewerContainer = viewerRef.current.querySelector('.viewer-container');
      if (!viewerContainer) {
        console.error('Viewer container not found');
        return;
      }

      // Capture the image
      const imageData = await captureViewerImage(viewerContainer as HTMLElement)
      
      if (imageData) {
        chatPanel.addImageMessage(imageData)
      } else {
        console.error('Failed to capture viewer image');
      }
    } catch (error) {
      console.error('Error capturing view:', error)
    } finally {
      setIsCapturing(false)
    }
  }

  if (!file) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">Select a file to view</p>
      </div>
    )
  }

  return (
    <div className="relative h-full" ref={viewerRef}>
      {/* AI Capture button */}
      <Button
        variant="outline"
        className="absolute bottom-4 right-4 z-10 bg-gradient-to-r from-amber-200 to-yellow-400 hover:from-amber-300 hover:to-yellow-500 text-black font-semibold border-amber-300 hover:border-amber-400 shadow-lg hover:shadow-xl transition-all duration-200"
        onClick={handleCaptureView}
        disabled={isCapturing}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        AI
      </Button>

      {/* Viewer content */}
      <div className="viewer-container h-full">
        {(() => {
          switch (file.type) {
            case "image":
              return <ImageViewer file={file} className={className} />
            case "pdf":
              return <PdfViewer file={file} className={className} />
            case "step":
              return <StepViewer fileUrl={file.preview} fileName={file.name} className={className} />
            case "stl":
              return <StlViewer file={file} className={className} />
            case "3mf":
              return <ThreeMfViewer file={file} className={className} />
            case "dxf":
              return <DxfViewer file={file} className={className} />
            default:
              return (
                <div className={cn("flex items-center justify-center h-full", className)}>
                  <p className="text-muted-foreground">
                    Preview not available for this file type
                  </p>
                </div>
              )
          }
        })()}
      </div>
    </div>
  )
}

function ViewerSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  )
}