import { useState } from "react"
import type { ViewerProps } from "@/lib/types"

export default function PdfViewer({ file }: ViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full w-full bg-background/50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-4">
            <p className="text-destructive font-medium">Error loading PDF</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <iframe
          src={`${file.preview}#toolbar=0&navpanes=0`}
          className="flex-1 w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setError("Failed to load PDF")
          }}
          title={file.name}
        />
      )}
    </div>
  )
}