import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react"

import { Button, Card, CardContent, Input } from "@/components"
import { getFaqScreens, createFaqScreen, deleteFaqScreen, FaqScreen } from "@/Fetch/faq"
import { FaqScreenEditorDialog } from "./FaqScreenEditorDialog"

const FAQ_APP_ROUTES = [
  { value: "", label: "Sin asignar" },
  { value: "/home", label: "Finanzas" },
  { value: "/tasks", label: "Tareas" },
  { value: "/results", label: "Resultados" },
  { value: "/affiliation", label: "Invitar" },
  { value: "/profile", label: "Perfil" },
  { value: "/finance", label: "Finanzas (detalle)" },
  { value: "/payment-method", label: "Metodo de pago" },
]

export function FaqPantallasTab() {
  const [screens, setScreens] = useState<FaqScreen[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tituloNuevo, setTituloNuevo] = useState("")
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [rutaNueva, setRutaNueva] = useState("")
  const [screenEditorId, setScreenEditorId] = useState<number | null>(null)

  const fetchScreens = async () => {
    try {
      const res = await getFaqScreens()
      setScreens(res.data)
    } catch (error) {
      console.error("Error al cargar las pantallas:", error)
      toast.error("Error al cargar las pantallas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreens()
  }, [])

  const handleSubir = async () => {
    if (!tituloNuevo.trim()) {
      toast.error("Ponle un titulo a la pantalla")
      return
    }
    if (!archivoNuevo) {
      toast.error("Selecciona una imagen")
      return
    }
    try {
      setUploading(true)
      await createFaqScreen(tituloNuevo.trim(), archivoNuevo, rutaNueva || undefined)
      toast.success("Pantalla agregada")
      setTituloNuevo("")
      setArchivoNuevo(null)
      setRutaNueva("")
      fetchScreens()
    } catch (error: any) {
      toast.error(error?.message || "Error al subir la pantalla")
    } finally {
      setUploading(false)
    }
  }

  const handleEliminar = async (screen: FaqScreen) => {
    if (!window.confirm(`Eliminar la pantalla "${screen.vc_title}" y todos sus botones marcados?`)) return
    try {
      await deleteFaqScreen(screen.id_faq_screen)
      toast.success("Pantalla eliminada")
      fetchScreens()
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar la pantalla")
    }
  }

  const screenEnEdicion = screens.find((s) => s.id_faq_screen === screenEditorId) || null

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Subir una nueva captura de pantalla</h3>
          <p className="text-sm text-muted-foreground">
            Sube una captura de la app (ej. la pantalla de Tareas) y despues marca con rectangulos los botones que quieras poder resaltar en las respuestas.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Titulo, ej: Pantalla de Tareas"
              value={tituloNuevo}
              onChange={(e) => setTituloNuevo(e.target.value)}
              className="sm:max-w-[280px]"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setArchivoNuevo(e.target.files?.[0] || null)}
              className="sm:max-w-[280px]"
            />
            <select
              value={rutaNueva}
              onChange={(e) => setRutaNueva(e.target.value)}
              className="sm:max-w-[220px] h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {FAQ_APP_ROUTES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button onClick={handleSubir} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Subir pantalla
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Cargando...
        </div>
      ) : screens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <ImagePlus size={32} />
          <p className="text-sm">Aun no subes ninguna pantalla</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {screens.map((screen) => (
            <div key={screen.id_faq_screen} className="group relative rounded-lg border overflow-hidden">
              <div className="block w-full">
                <img src={screen.vc_screenshot_url} alt={screen.vc_title} className="w-full h-40 object-cover" />
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{screen.vc_title}</p>
                  <p className="text-xs text-muted-foreground">{screen.elements.length} boton(es) marcado(s)</p>
                  <p className="text-xs text-muted-foreground">
                    {FAQ_APP_ROUTES.find((r) => r.value === screen.vc_app_route)?.label || "Sin asignar"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleEliminar(screen)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FaqScreenEditorDialog
        open={screenEditorId !== null}
        onOpenChange={(open) => !open && setScreenEditorId(null)}
        screen={screenEnEdicion}
        onChanged={fetchScreens}
      />
    </div>
  )
}
