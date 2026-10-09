import { useEffect, useRef, useState } from "react"

import { FaqScreenElement } from "@/Fetch/faq"

interface PendingPoint {
  x: number
  y: number
  rotacion: number
}

interface FaqScreenCanvasProps {
  imageUrl: string
  elements: FaqScreenElement[]
  editable?: boolean
  selectedIds?: number[]
  onCreateElement?: (coords: { f_x: number; f_y: number; f_rotation_deg: number }) => void
  onDeleteElement?: (element: FaqScreenElement) => void
  onElementClick?: (element: FaqScreenElement) => void
}

const RADIO_MANIJA = 50
const MANITA = "👆"

export function FaqScreenCanvas({
  imageUrl,
  elements,
  editable = false,
  selectedIds = [],
  onCreateElement,
  onDeleteElement,
  onElementClick,
}: FaqScreenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pendiente, setPendiente] = useState<PendingPoint | null>(null)
  const arrastrandoRef = useRef(false)
  const acabaDeArrastrarRef = useRef(false)

  useEffect(() => {
    setPendiente(null)
  }, [imageUrl])

  const getRelativePos = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1)
    return { x, y }
  }

  const calcularAngulo = (clientX: number, clientY: number, punto: { x: number; y: number }) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const puntoPxX = punto.x * rect.width
    const puntoPxY = punto.y * rect.height
    const dx = clientX - rect.left - puntoPxX
    const dy = clientY - rect.top - puntoPxY
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
    if (deg < 0) deg += 360
    return deg
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!editable) return
    if (acabaDeArrastrarRef.current) {
      acabaDeArrastrarRef.current = false
      return
    }
    const target = e.target as HTMLElement
    if (target.closest("[data-faq-skip]")) return
    const pos = getRelativePos(e.clientX, e.clientY)
    setPendiente({ x: pos.x, y: pos.y, rotacion: 0 })
  }

  const handleManijaMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!pendiente) return
    arrastrandoRef.current = true

    const onMove = (ev: MouseEvent) => {
      if (!arrastrandoRef.current) return
      setPendiente((prev) => (prev ? { ...prev, rotacion: calcularAngulo(ev.clientX, ev.clientY, prev) } : prev))
    }
    const onUp = () => {
      arrastrandoRef.current = false
      acabaDeArrastrarRef.current = true
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const confirmarPendiente = () => {
    if (!pendiente) return
    onCreateElement?.({ f_x: pendiente.x, f_y: pendiente.y, f_rotation_deg: pendiente.rotacion })
    setPendiente(null)
  }

  const cancelarPendiente = () => setPendiente(null)

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none rounded-md overflow-hidden border bg-muted"
      style={{ cursor: editable ? "crosshair" : "default" }}
      onClick={handleClick}
    >
      <img src={imageUrl} alt="Pantalla" className="w-full h-auto block pointer-events-none" draggable={false} />

      {elements.map((el) => {
        const isSelected = selectedIds.includes(el.id_faq_screen_element)
        const deg = el.f_rotation_deg ?? 0
        return (
          <div
            key={el.id_faq_screen_element}
            data-faq-skip="1"
            onClick={(e) => {
              e.stopPropagation()
              if (editable && onDeleteElement) {
                if (window.confirm("Eliminar este boton marcado?")) onDeleteElement(el)
              } else if (onElementClick) {
                onElementClick(el)
              }
            }}
            className="absolute cursor-pointer"
            style={{
              left: `${el.f_x * 100}%`,
              top: `${el.f_y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              fontSize: 34,
              lineHeight: 1,
              filter: isSelected
                ? "drop-shadow(0 0 3px #10b981) drop-shadow(0 0 3px #10b981)"
                : "drop-shadow(0 0 2px rgba(0,0,0,0.6))",
            }}
            title="Boton marcado"
          >
            {MANITA}
          </div>
        )
      })}

      {pendiente && (
        <>
          <div
            data-faq-skip="1"
            className="absolute pointer-events-none"
            style={{
              left: `${pendiente.x * 100}%`,
              top: `${pendiente.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${pendiente.rotacion}deg)`,
              fontSize: 34,
              lineHeight: 1,
              filter: "drop-shadow(0 0 3px #f59e0b) drop-shadow(0 0 3px #f59e0b)",
            }}
          >
            {MANITA}
          </div>

          <div
            data-faq-skip="1"
            onMouseDown={handleManijaMouseDown}
            className="absolute w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow cursor-grab active:cursor-grabbing"
            style={{
              left: `calc(${pendiente.x * 100}% + ${RADIO_MANIJA * Math.sin((pendiente.rotacion * Math.PI) / 180)}px)`,
              top: `calc(${pendiente.y * 100}% + ${-RADIO_MANIJA * Math.cos((pendiente.rotacion * Math.PI) / 180)}px)`,
              transform: "translate(-50%, -50%)",
            }}
            title="Arrastra para rotar la manita"
          />

          <div
            data-faq-skip="1"
            className="absolute flex gap-2 bg-white/95 rounded-md shadow px-2 py-1"
            style={{
              left: `${pendiente.x * 100}%`,
              top: `calc(${pendiente.y * 100}% + 90px)`,
              transform: "translate(-50%, 0)",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                confirmarPendiente()
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                cancelarPendiente()
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-600"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
