import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, UploadCloud, Trash2, ArrowUp, ArrowDown, Video } from "lucide-react"

import { addFondo, deleteFondo, reordenarPortada } from "@/Fetch/portada"
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, ConfirmModal } from "@/components"
import type { Fondo } from "@/modules/landing/tipos"

const MAX_MB = 50

export default function SeccionFondos({ fondos, onChanged }: { fondos: Fondo[]; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [porBorrar, setPorBorrar] = useState<Fondo | null>(null)
  const [borrando, setBorrando] = useState(false)

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return toast.error("El archivo debe ser una imagen o un video")
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`El archivo no debe superar los ${MAX_MB}MB`)
    setSubiendo(true)
    try {
      await addFondo(file)
      toast.success("Fondo agregado exitosamente")
      onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al subir el fondo")
    } finally {
      setSubiendo(false)
    }
  }

  const mover = async (index: number, delta: -1 | 1) => {
    const ids = fondos.map((f) => f.id)
    const destino = index + delta
    if (destino < 0 || destino >= ids.length) return
    ;[ids[index], ids[destino]] = [ids[destino], ids[index]]
    setMoviendo(true)
    try {
      await reordenarPortada("fondos", ids)
      onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al reordenar")
    } finally {
      setMoviendo(false)
    }
  }

  const confirmarBorrado = async () => {
    if (!porBorrar) return
    setBorrando(true)
    try {
      await deleteFondo(porBorrar.id)
      toast.success("Fondo eliminado exitosamente")
      setPorBorrar(null)
      onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al eliminar el fondo")
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Fondos del héroe</CardTitle>
        <CardDescription>Imágenes o videos de fondo de la portada (máx. {MAX_MB} MB cada uno). El orden es el de aparición.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleArchivo} />
        <Button onClick={() => inputRef.current?.click()} disabled={subiendo}>
          {subiendo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
          Subir fondo
        </Button>

        {fondos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fondos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fondos.map((f, i) => (
              <div key={f.id} className="rounded-lg border overflow-hidden bg-card">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {f.tipo === "video"
                    ? <video src={f.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    : <img src={f.url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {f.tipo === "video" && <Video className="w-3.5 h-3.5" />} #{i + 1} · {f.tipo}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" disabled={moviendo || i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={moviendo || i === fondos.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar"><ArrowDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setPorBorrar(f)} aria-label="Eliminar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmModal
        open={!!porBorrar}
        onClose={() => setPorBorrar(null)}
        onConfirm={confirmarBorrado}
        loading={borrando}
        variant="danger"
        title="Eliminar fondo"
        description="El fondo dejará de mostrarse en la portada."
        confirmLabel="Eliminar"
      />
    </Card>
  )
}
