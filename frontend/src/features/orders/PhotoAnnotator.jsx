import { useRef, useState, useEffect } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Undo2, Eraser, Trash2 } from 'lucide-react'

const COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#ffffff']

export default function PhotoAnnotator({ photo, open, onClose, onSave, saving }) {
  const canvasRef = useRef(null)
  const [color, setColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [bgUrl, setBgUrl] = useState(null)
  const [naturalSize, setNaturalSize] = useState(null)

  useEffect(() => {
    if (!open || !photo?.image_url) { setBgUrl(null); setNaturalSize(null); return }
    let objectUrl
    let cancelled = false
    fetch(photo.image_url)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          if (!cancelled) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
        }
        img.src = objectUrl
        setBgUrl(objectUrl)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, photo?.image_url])

  function handleClose() {
    canvasRef.current?.clearCanvas()
    setEraser(false)
    onClose()
  }

  async function handleSave() {
    // Export only the sketch strokes as transparent PNG
    const sketchDataUrl = await canvasRef.current.exportImage('png')

    // Load the sketch result
    const sketchImg = new Image()
    await new Promise((res) => { sketchImg.onload = res; sketchImg.src = sketchDataUrl })

    // Load the original (using blob URL — already fetched, no CORS issues)
    const origImg = new Image()
    await new Promise((res) => { origImg.onload = res; origImg.src = bgUrl })

    // Composite at original image resolution
    const canvas = document.createElement('canvas')
    canvas.width = origImg.naturalWidth
    canvas.height = origImg.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(origImg, 0, 0)
    // Sketch was drawn on a container with the same aspect ratio as the image,
    // so scaling it uniformly to the output canvas is correct
    ctx.drawImage(sketchImg, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      const file = new File([blob], `anotacion-${photo.id}.jpg`, { type: 'image/jpeg' })
      onSave(file)
    }, 'image/jpeg', 0.92)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex flex-col max-w-2xl h-[90vh] sm:h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm">Anotar foto</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setEraser(false) }}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full border-2 shrink-0 transition-transform ${!eraser && color === c ? 'border-primary scale-110' : 'border-border'}`}
            />
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => setStrokeWidth(3)}
            className={`px-2 py-1 rounded text-xs shrink-0 ${strokeWidth === 3 && !eraser ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            Fino
          </button>
          <button
            type="button"
            onClick={() => setStrokeWidth(7)}
            className={`px-2 py-1 rounded text-xs shrink-0 ${strokeWidth === 7 && !eraser ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            Grueso
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => setEraser((e) => !e)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 ${eraser ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <Eraser className="h-3.5 w-3.5" />
            Borrador
          </button>

          <button
            type="button"
            onClick={() => canvasRef.current?.undo()}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 hover:bg-muted"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Deshacer
          </button>

          <button
            type="button"
            onClick={() => canvasRef.current?.clearCanvas()}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar
          </button>
        </div>

        {/* Canvas area — image sets the aspect ratio, no letterboxing */}
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {bgUrl && naturalSize ? (
            <div
              className="relative"
              style={{
                aspectRatio: `${naturalSize.w}/${naturalSize.h}`,
                maxWidth: '100%',
                maxHeight: '100%',
                width: naturalSize.w > naturalSize.h ? '100%' : 'auto',
                height: naturalSize.h >= naturalSize.w ? '100%' : 'auto',
              }}
            >
              {/* Background photo */}
              <img
                src={bgUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                draggable={false}
              />
              {/* Drawing canvas — transparent overlay */}
              <div className="absolute inset-0">
                <ReactSketchCanvas
                  ref={canvasRef}
                  strokeColor={color}
                  strokeWidth={strokeWidth}
                  eraserWidth={strokeWidth * 4}
                  eraseMode={eraser}
                  canvasColor="transparent"
                  style={{ width: '100%', height: '100%', background: 'transparent' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !bgUrl}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Guardando…
              </span>
            ) : 'Guardar anotación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
