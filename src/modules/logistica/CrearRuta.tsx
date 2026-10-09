import { toast } from "sonner"
import { useEffect, useMemo, useState } from "react"
import { GoogleMap } from '@react-google-maps/api'
import { Route as RouteIcon, Plus, Pencil, Trash2, Loader2, Store, Search, ArrowLeft, TrendingUp, AlertTriangle, X } from "lucide-react"

import { useAuthStore } from "@/stores"
import { useJsApiLoader, GOOGLE_MAPS_CONFIG } from "@/lib"
import { MapStoreDTO } from "@/dtos"
import { getStockMapData } from "@/Fetch/stock"
import {
  PageWrapper, PageHeader, Button, Input, Label, Checkbox,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components"
import {
  getRouteTemplates, createRouteTemplate, updateRouteTemplate, deleteRouteTemplate, estimateRouteSales,
  RouteTemplateDTO, RouteSalesEstimateDTO,
} from "@/Fetch/routeTemplates"
import { getRouteSchedules, deleteRouteSchedule, RouteScheduleDTO, describeSchedule } from "@/Fetch/routeSchedules"
import { StoreMarker } from "@/modules/mapa/components/StoreMarker"
import { api, ApiResponse } from "@/lib"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components"

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const DEFAULT_CENTER = { lat: 25.7460, lng: -100.2792 }

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)

export default function CrearRuta() {
  const { user } = useAuthStore()
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG)

  const [templates, setTemplates] = useState<RouteTemplateDTO[]>([])
  const [schedules, setSchedules] = useState<RouteScheduleDTO[]>([])
  const [stores, setStores] = useState<MapStoreDTO[]>([])
  const [loading, setLoading] = useState(true)

  const [building, setBuilding] = useState(false)
  const [editing, setEditing] = useState<RouteTemplateDTO | null>(null)
  const [name, setName] = useState("")
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [storeTurnos, setStoreTurnos] = useState<Record<number, 'MAÑANA' | 'TARDE'>>({})
  const [storeSearch, setStoreSearch] = useState("")
  const [misIds, setMisIds] = useState<Set<number>>(new Set())
  const [mostrarTiendas, setMostrarTiendas] = useState<"todas" | "mias" | "nuevas">("todas")
  const [saving, setSaving] = useState(false)

  const [estimate, setEstimate] = useState<RouteSalesEstimateDTO | null>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  const [toDelete, setToDelete] = useState<RouteTemplateDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    if (!user?.id_client) return
    setLoading(true)
    try {
      const [templatesRes, storesRes, schedulesRes] = await Promise.all([
        getRouteTemplates(user.id_client),
        getStockMapData({ id_client: user.id_client }),
        getRouteSchedules(user.id_client),
      ])
      setTemplates(templatesRes.data ?? [])
      setStores(storesRes.data ?? [])
      setSchedules(schedulesRes.data ?? [])
    } catch {
      toast.error("Error al cargar las rutas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.id_client])

  useEffect(() => {
    api.get<ApiResponse<{ id_store: number }[]>>("/stores/mine/list")
      .then((r) => setMisIds(new Set((r.data ?? []).map((t) => t.id_store))))
      .catch(() => {})
  }, [user?.id_client])

  useEffect(() => {
    if (!building || selectedStoreIds.length === 0) {
      setEstimate(null)
      return
    }
    setLoadingEstimate(true)
    const timeout = setTimeout(() => {
      estimateRouteSales(selectedStoreIds)
        .then((res) => setEstimate(res.data))
        .catch(() => {})
        .finally(() => setLoadingEstimate(false))
    }, 400)
    return () => clearTimeout(timeout)
  }, [selectedStoreIds, building])

  const openCreate = () => {
    setEditing(null)
    setName("")
    setSelectedStoreIds([])
    setStoreTurnos({})
    setStoreSearch("")
    setBuilding(true)
  }

  const openEdit = (t: RouteTemplateDTO) => {
    setEditing(t)
    setName(t.name)
    setSelectedStoreIds(t.stores.map((s) => s.id_store))
    setStoreTurnos(Object.fromEntries(t.stores.map((s) => [s.id_store, (s.turno === 'TARDE' ? 'TARDE' : 'MAÑANA') as 'MAÑANA' | 'TARDE'])))
    setStoreSearch("")
    setBuilding(true)
  }

  const toggleStore = (id_store: number) => {
    setSelectedStoreIds((prev) => (prev.includes(id_store) ? prev.filter((s) => s !== id_store) : [...prev, id_store]))
    setStoreTurnos((prev) => {
      if (prev[id_store]) {
        const next = { ...prev }
        delete next[id_store]
        return next
      }
      return { ...prev, [id_store]: 'MAÑANA' as const }
    })
  }

  const setStoreTurno = (id_store: number, turno: 'MAÑANA' | 'TARDE') => {
    setStoreTurnos((prev) => ({ ...prev, [id_store]: turno }))
  }

  const visibleStores = useMemo(
    () => stores.filter((s) => {
      if (!s.name.toLowerCase().includes(storeSearch.toLowerCase())) return false
      if (mostrarTiendas === "mias" && !misIds.has(s.id_store)) return false
      if (mostrarTiendas === "nuevas" && misIds.has(s.id_store)) return false
      return true
    }),
    [stores, storeSearch, mostrarTiendas, misIds]
  )

  const mapCenter = useMemo(() => {
    const withCoords = stores.filter((s) => s.latitude && s.longitude)
    if (withCoords.length === 0) return DEFAULT_CENTER
    const lat = withCoords.reduce((sum, s) => sum + s.latitude, 0) / withCoords.length
    const lng = withCoords.reduce((sum, s) => sum + s.longitude, 0) / withCoords.length
    return { lat, lng }
  }, [stores])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Ponle un nombre a la ruta")
      return
    }
    if (selectedStoreIds.length === 0) {
      toast.error("Selecciona al menos una tienda")
      return
    }
    setSaving(true)
    try {
      const stores = selectedStoreIds.map((id_store) => ({ id_store, turno: storeTurnos[id_store] ?? ('MAÑANA' as const) }))
      const payload = { name: name.trim(), stores }
      if (editing) {
        await updateRouteTemplate(editing.id_route_template, payload)
        toast.success("Ruta actualizada")
      } else {
        if (!user?.id_client) return
        await createRouteTemplate({ id_client: user.id_client, ...payload })
        toast.success("Ruta creada")
      }
      setBuilding(false)
      fetchData()
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar la ruta")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteRouteTemplate(toDelete.id_route_template)
      toast.success("Ruta eliminada")
      setToDelete(null)
      fetchData()
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar la ruta")
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveSchedule = async (id_schedule: number) => {
    try {
      await deleteRouteSchedule(id_schedule)
      toast.success("Asignación automática eliminada")
      fetchData()
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar la asignación")
    }
  }

  if (building) {
    return (
      <PageWrapper>
        <div className="flex items-center gap-3">
          <button onClick={() => setBuilding(false)} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft size={18} />
          </button>
          <PageHeader title={editing ? "Editar ruta" : "Nueva ruta"} subtitle="Elige las tiendas en el mapa o la lista. La frecuencia y el chofer se asignan después, en Organizar Ruta" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div>
                <Label>Nombre de la ruta</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ruta Centro" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-success" />
                <h3 className="text-sm font-semibold text-foreground">Venta estimada de esta ruta</h3>
              </div>
              {selectedStoreIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Selecciona tiendas para ver la estimación.</p>
              ) : loadingEstimate ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" /> Calculando...
                </div>
              ) : estimate ? (
                estimate.can_estimate ? (
                  <p className="text-2xl font-bold text-success">{formatMoney(estimate.total ?? 0)}</p>
                ) : (
                  <div className="flex gap-1.5 text-xs text-muted-foreground bg-warning/10 rounded-lg p-2.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-warning-foreground dark:text-warning" />
                    <span>
                      {estimate.missing_count === 1 ? "1 tienda" : `${estimate.missing_count} tiendas`} de esta ruta{" "}
                      {estimate.missing_count === 1 ? "necesita" : "necesitan"} que le mandes un promotor de Promotoria Digital,
                      ya que no sabemos sus mínimos o lleva más de 15 días sin actualizar el stock. Para darte un aproximado, todas las tiendas de la ruta necesitan tener información reciente.
                    </span>
                  </div>
                )
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}>
            <div className="rounded-xl overflow-hidden border border-border relative">
              {(!isLoaded) && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              )}
              {isLoaded && (
                <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={mapCenter} zoom={stores.length > 0 ? 11 : 6}>
                  {visibleStores.filter((s) => s.latitude && s.longitude).map((store) => (
                    <StoreMarker
                      key={store.id_store}
                      store={store}
                      selected={false}
                      routeOrder={selectedStoreIds.includes(store.id_store) ? selectedStoreIds.indexOf(store.id_store) + 1 : null}
                      onClick={() => toggleStore(store.id_store)}
                    />
                  ))}
                </GoogleMap>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} placeholder="Buscar tienda..." className="pl-8" />
                </div>
                <div className="mt-2">
                  <Select value={mostrarTiendas} onValueChange={(v) => setMostrarTiendas(v as "todas" | "mias" | "nuevas")}>
                    <SelectTrigger><SelectValue placeholder="Mostrar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las tiendas de la app</SelectItem>
                      <SelectItem value="mias">Solo mis tiendas</SelectItem>
                      <SelectItem value="nuevas">Las que aún no tengo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedStoreIds.length} tienda{selectedStoreIds.length !== 1 ? "s" : ""} seleccionada{selectedStoreIds.length !== 1 ? "s" : ""}
                  {selectedStoreIds.length > 0 && (
                    <> · {Object.values(storeTurnos).filter((t) => t === 'MAÑANA').length} mañana, {Object.values(storeTurnos).filter((t) => t === 'TARDE').length} tarde</>
                  )}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {visibleStores.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No hay tiendas que coincidan.</p>
                ) : (
                  visibleStores.map((s) => {
                    const selected = selectedStoreIds.includes(s.id_store)
                    return (
                    <div
                      key={s.id_store}
                      onClick={() => toggleStore(s.id_store)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selected ? "bg-info/10 border-info/30" : "bg-white border-border hover:border-input"
                      }`}
                    >
                      <Checkbox checked={selected} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.municipio_name}, {s.state_name}</p>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setStoreTurno(s.id_store, 'MAÑANA')}
                            className={`px-2 py-1 rounded-md text-xs font-medium ${storeTurnos[s.id_store] !== 'TARDE' ? 'bg-warning text-white' : 'bg-muted text-muted-foreground'}`}
                          >
                            Mañana
                          </button>
                          <button
                            type="button"
                            onClick={() => setStoreTurno(s.id_store, 'TARDE')}
                            className={`px-2 py-1 rounded-md text-xs font-medium ${storeTurnos[s.id_store] === 'TARDE' ? 'bg-info text-white' : 'bg-muted text-muted-foreground'}`}
                          >
                            Tarde
                          </button>
                        </div>
                      )}
                    </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setBuilding(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
            Guardar ruta
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Crear Ruta"
        subtitle="Arma una ruta una sola vez (nombre y tiendas) para adjuntarla luego al organizar la entrega, sin buscar tienda por tienda cada vez"
        icon={RouteIcon}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" /> Nueva ruta
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Aún no has creado ninguna ruta.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id_route_template} className="rounded-xl border border-border bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground">{t.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Pencil size={15} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => setToDelete(t)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                    <Trash2 size={15} className="text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Store size={14} /> {t.stores.length} tienda{t.stores.length !== 1 ? "s" : ""}
              </p>
              {schedules.filter((s) => s.id_route_template === t.id_route_template).length > 0 && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  {schedules.filter((s) => s.id_route_template === t.id_route_template).map((s) => (
                    <div key={s.id_schedule} className="flex items-center justify-between gap-2 bg-info/5 rounded-lg px-2 py-1.5">
                      <p className="text-xs text-info truncate">
                        <span className="font-semibold">{s.driver.name}</span> · {describeSchedule(s)}
                      </p>
                      <button onClick={() => handleRemoveSchedule(s.id_schedule)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar "{toDelete?.name}"</AlertDialogTitle>
            <AlertDialogDescription>
              Esto no afecta rutas de entrega que ya hayas organizado con estas tiendas, solo elimina la plantilla para adjuntarla en el futuro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={deleting}>
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}
