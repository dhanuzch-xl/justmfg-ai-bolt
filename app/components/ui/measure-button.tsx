import { Button } from "@/components/ui/button"
import { Ruler } from "lucide-react"
import { useState } from "react"

interface MeasureButtonProps {
  onMeasureStart?: () => void
  onMeasureEnd?: () => void
}

export function MeasureButton({ onMeasureStart, onMeasureEnd }: MeasureButtonProps) {
  const [measuring, setMeasuring] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    // Prevent event propagation
    e.preventDefault()
    e.stopPropagation()

    setMeasuring(!measuring)
    if (!measuring) {
      onMeasureStart?.()
    } else {
      onMeasureEnd?.()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={measuring ? "bg-secondary" : ""}
    >
      <Ruler className="h-4 w-4" />
    </Button>
  )
}