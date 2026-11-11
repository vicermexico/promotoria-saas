import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, UploadCloud, Trash2, ArrowUp, ArrowDown, Pencil, X, Save } from "lucide-react"

import { addPersonaje, updatePersonaje, deletePersonaje, reordenarPortada } from "@/Fetch/portada"
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, ConfirmModal, Input, Label } from "@/components"
import { esVideoPersonaje, type Personaje } from "@/modules/landing/tipos"
import { VideoPersonaje } from "@/modules/landing/components/VideoPersonaje"
import { cargarImagen, dibujarRecorte, canvasAPng } from "./quitarFondo"

const MAX_MB_VIDEO = 50
const DAMERO = "repeating-conic-gradient(#d4d4d8 0% 25%, #f4f4f5 0% 50%) 50% / 16px 16px"

export default function SeccionPersonajes({ personajes, onChanged }: { personajes: Personaje[]; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [editando, setEditando] = useState<Personaje | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null)
  const [quitarVerde, setQuitarVerde] = useState(true)
  const [sensibilidad, setSensibilidad] = useState(60)
  const [nombre, setNombre] = useState("")
  const [puesto, setPuesto] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [porBorrar, setPorBorrar] = useState<Personaje | null>(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (img && canvasRef.current) dibujarRecorte(img, canvasRef.current, quitarVerde, sensibilidad)
  }, [img, quitarVerde, sensibilidad, abierto])

  const soltarVideo = () => setVideo((v) => { if (v) URL.revokeObjectURL(v.url); return null })
  const cerrar = () => {
    soltarVideo()
    setAbierto(false); setEditando(null); setImg(null)
    setNombre(""); setPuesto(""); setQuitarVerde(true); setSensibilidad(60)
  }
  const nuevo = () => { cerrar(); setAbierto(true) }
  const editar = (p: Personaje) => {
    cerrar(); setAbierto(true); setEditando(p); setNombre(p.nombre ?? ""); setPuesto(p.puesto ?? "")
  }

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_MB_VIDEO * 1024 * 1024) return toast.error(`El video no debe superar los ${MAX_MB_VIDEO}MB`)
      soltarVideo()
      setImg(null)
      setVideo({ file, url: URL.createObjectURL(file) })
      return
    }
    if (!file.type.startsWith("image/")) return toast.error("El archivo debe ser una foto o un video")
    try {
      soltarVideo()
      setImg(await cargarImagen(file))
      // un PNG que ya trae transparencia no necesita recorte
      setQuitarVerde(file.type !== "image/png")
    } catch {
      toast.error("No se pudo leer la imagen")
    }
  }

  const guardar = async () => {
    if (!editando && !img && !video) return toast.error("Elige una foto o un video")
    setGuardando(true)
    try {
      let blob: Blob | undefined
      let nombreArchivo = "personaje.png"
      if (video) { blob = video.file; nombreArchivo = video.file.name }
      else if (img && canvasRef.current) blob = await canvasAPng(canvasRef.current)
      if (editando) {
        await updatePersonaje(editando.id, { nombre: nombre.trim(), puesto: puesto.trim() }, blob, nombreArchivo)
        toast.success("Personaje actualizado exitosamente")
      } else {
        await addPersonaje(blob!, nombre.trim(), puesto.trim(), nombreArchivo)
        toast.success("Personaje agregado exitosamente")
      }
      cerrar()
      onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al guardar el personaje")
    } finally {
      setGuardando(false)
    }
  }

  const mover = async (index: number, delta: -1 | 1) => {
    const ids = personajes.map((p) => p.id)
    const destino = index + delta
    if (destino < 0 || destino >= ids.length) return
    ;[ids[index], ids[destino]] = [ids[destino], ids[index]]
    setMoviendo(true)
    try { await reordenarPortada("personajes", ids); onChanged() }
    catch (err) { toast.error((err as Error)?.message || "Error al reordenar") }
    finally { setMoviendo(false) }
  }

  const confirmarBorrado = async () => {
    if (!porBorrar) return
    setBorrando(true)
    try {
      await deletePersonaje(porBorrar.id)
      toast.success("Personaje eliminado exitosamente")
      setPorBorrar(null); onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al eliminar el personaje")
    } finally { setBorrando(false) }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Personajes</CardTitle>
        <CardDescription>Las personas que aparecen junto al login. Sube una foto o un video con fondo verde y el panel quita el verde solo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!abierto && (
          <Button onClick={nuevo}><UploadCloud className="w-4 h-4 mr-2" />Nuevo personaje</Button>
        )}

        {abierto && (
          <div className="rounded-lg border p-4 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{editando ? "Editar personaje" : "Nuevo personaje"}</h3>
              <Button size="icon" variant="ghost" onClick={cerrar} aria-label="Cerrar"><X className="w-4 h-4" /></Button>
            </div>

            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={elegirFoto} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  <UploadCloud className="w-4 h-4 mr-2" />{img || video || editando ? "Cambiar archivo" : "Elegir foto o video"}
                </Button>
                {video && (
                  <p className="text-xs text-muted-foreground">
                    Video con fondo verde: el verde se quita solo al reproducirlo en la portada (aquí ves cómo queda).
                    Sale de lado a lado, pegado abajo. Usa un verde parejo y que la persona no lleve verde.
                  </p>
                )}
                {img && (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={quitarVerde} onChange={(e) => setQuitarVerde(e.target.checked)} />
                      Quitar fondo verde
                    </label>
                    {quitarVerde && (
                      <div className="space-y-1">
                        <Label className="text-xs">Fuerza del recorte ({sensibilidad})</Label>
                        <input type="range" min={10} max={120} value={sensibilidad} onChange={(e) => setSensibilidad(Number(e.target.value))} className="w-full" />
                        <p className="text-xs text-muted-foreground">Si quedan restos verdes, súbela. Si se come la persona, bájala.</p>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Puesto</Label>
                  <Input value={puesto} maxLength={100} onChange={(e) => setPuesto(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden flex items-center justify-center min-h-48" style={{ background: DAMERO }}>
                {video ? (
                  <VideoPersonaje key={video.url} url={video.url} modo="vista" />
                ) : img ? (
                  <canvas ref={canvasRef} className="max-h-80 max-w-full object-contain" />
                ) : editando ? (
                  esVideoPersonaje(editando)
                    ? <video src={editando.url} className="max-h-80" muted loop autoPlay playsInline />
                    : <img src={editando.url} alt="" className="max-h-80 object-contain" />
                ) : (
                  <span className="text-sm text-muted-foreground p-6 text-center">Aquí verás cómo queda el recorte</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Guardar
              </Button>
              <Button variant="outline" onClick={cerrar} disabled={guardando}>Cancelar</Button>
            </div>
          </div>
        )}

        {personajes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay personajes.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personajes.map((p, i) => (
              <div key={p.id} className="rounded-lg border overflow-hidden bg-card">
                <div className="aspect-[4/5] flex items-end justify-center" style={{ background: DAMERO }}>
                  {esVideoPersonaje(p)
                    ? <video src={p.url} className="max-h-full max-w-full object-contain" muted loop autoPlay playsInline />
                    : <img src={p.url} alt={p.nombre ?? ""} className="max-h-full object-contain" />}
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-sm font-medium truncate">{p.nombre || "Sin nombre"}</div>
                  <div className="text-xs text-muted-foreground truncate">{esVideoPersonaje(p) ? "Video con fondo verde" : (p.puesto || "Sin puesto")}</div>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" disabled={moviendo || i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={moviendo || i === personajes.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar"><ArrowDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => editar(p)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setPorBorrar(p)} aria-label="Eliminar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
        title="Eliminar personaje"
        description="Dejará de mostrarse en la portada."
        confirmLabel="Eliminar"
      />
    </Card>
  )
}
