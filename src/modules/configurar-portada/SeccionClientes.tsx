import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, UploadCloud, Trash2, ArrowUp, ArrowDown, Pencil, X, Save, Video } from "lucide-react"

import { addCliente, updateCliente, deleteCliente, reordenarPortada } from "@/Fetch/portada"
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, ConfirmModal, Input, Label } from "@/components"
import type { Cliente } from "@/modules/landing/tipos"

const MAX_MB = 50

export default function SeccionClientes({ clientes, onChanged }: { clientes: Cliente[]; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [enlace, setEnlace] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [porBorrar, setPorBorrar] = useState<Cliente | null>(null)
  const [borrando, setBorrando] = useState(false)

  const cerrar = () => {
    if (vista) URL.revokeObjectURL(vista)
    setAbierto(false); setEditando(null); setArchivo(null); setVista(null); setNombre(""); setEnlace("")
  }
  const nuevo = () => { cerrar(); setAbierto(true) }
  const editar = (c: Cliente) => { cerrar(); setAbierto(true); setEditando(c); setNombre(c.nombre); setEnlace(c.enlace ?? "") }

  const elegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return toast.error("El archivo debe ser una imagen o un video")
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`El archivo no debe superar los ${MAX_MB}MB`)
    if (vista) URL.revokeObjectURL(vista)
    setArchivo(file); setVista(URL.createObjectURL(file))
  }

  const guardar = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre del cliente")
    if (!editando && !archivo) return toast.error("Elige el logo del cliente")
    const url = enlace.trim()
    if (url && !/^https?:\/\//i.test(url)) return toast.error("El enlace debe empezar con http:// o https://")
    setGuardando(true)
    try {
      if (editando) {
        await updateCliente(editando.id, { nombre: nombre.trim(), enlace: url }, archivo ?? undefined)
        toast.success("Cliente actualizado exitosamente")
      } else {
        await addCliente(archivo!, nombre.trim(), url)
        toast.success("Cliente agregado exitosamente")
      }
      cerrar(); onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al guardar el cliente")
    } finally { setGuardando(false) }
  }

  const mover = async (index: number, delta: -1 | 1) => {
    const ids = clientes.map((c) => c.id)
    const destino = index + delta
    if (destino < 0 || destino >= ids.length) return
    ;[ids[index], ids[destino]] = [ids[destino], ids[index]]
    setMoviendo(true)
    try { await reordenarPortada("clientes", ids); onChanged() }
    catch (err) { toast.error((err as Error)?.message || "Error al reordenar") }
    finally { setMoviendo(false) }
  }

  const confirmarBorrado = async () => {
    if (!porBorrar) return
    setBorrando(true)
    try {
      await deleteCliente(porBorrar.id)
      toast.success("Cliente eliminado exitosamente")
      setPorBorrar(null); onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al eliminar el cliente")
    } finally { setBorrando(false) }
  }

  const actual = vista ?? editando?.url ?? null
  const esVideo = archivo ? archivo.type.startsWith("video/") : editando?.tipo === "video"

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Nuestros clientes</CardTitle>
        <CardDescription>Logos que se muestran en la portada. El orden es el de aparición.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!abierto && <Button onClick={nuevo}><UploadCloud className="w-4 h-4 mr-2" />Nuevo cliente</Button>}

        {abierto && (
          <div className="rounded-lg border p-4 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{editando ? "Editar cliente" : "Nuevo cliente"}</h3>
              <Button size="icon" variant="ghost" onClick={cerrar} aria-label="Cerrar"><X className="w-4 h-4" /></Button>
            </div>
            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={elegir} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Enlace (opcional)</Label>
                  <Input value={enlace} maxLength={300} placeholder="https://" onChange={(e) => setEnlace(e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  <UploadCloud className="w-4 h-4 mr-2" />{actual ? "Cambiar logo" : "Elegir logo"}
                </Button>
              </div>
              <div className="rounded-lg border bg-muted flex items-center justify-center min-h-40 p-4">
                {actual ? (esVideo
                  ? <video src={actual} className="max-h-40" muted playsInline controls />
                  : <img src={actual} alt="" className="max-h-40 object-contain" />)
                  : <span className="text-sm text-muted-foreground">Vista previa del logo</span>}
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

        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay clientes.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {clientes.map((c, i) => (
              <div key={c.id} className="rounded-lg border overflow-hidden bg-card">
                <div className="aspect-video bg-muted flex items-center justify-center p-3">
                  {c.tipo === "video"
                    ? <video src={c.url} className="max-h-full" muted playsInline preload="metadata" />
                    : <img src={c.url} alt={c.nombre} className="max-h-full max-w-full object-contain" />}
                </div>
                <div className="p-2 space-y-1">
                  <div className="text-sm font-medium truncate flex items-center gap-1">{c.tipo === "video" && <Video className="w-3.5 h-3.5" />}{c.nombre}</div>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" disabled={moviendo || i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={moviendo || i === clientes.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar"><ArrowDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => editar(c)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setPorBorrar(c)} aria-label="Eliminar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
        title="Eliminar cliente"
        description="Dejará de mostrarse en la portada."
        confirmLabel="Eliminar"
      />
    </Card>
  )
}
