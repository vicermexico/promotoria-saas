import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GoogleMap } from '@react-google-maps/api'
import { Loader2, MapPin, ChevronLeft, ListChecks, Route as RouteIcon, Download, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { api, ApiResponse, useJsApiLoader, GOOGLE_MAPS_CONFIG } from '@/lib'
import { useAuthStore } from '@/stores'
import {
  PageWrapper,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Checkbox,
} from '@/components'
import { channelSalesDTO, MapStoreDTO, StateDTO, CityDTO, ProductDTO } from '@/dtos'
import { getStockMapData, getStockMinimumsByStore, setStockMinimum } from '@/Fetch/stock'
import { getProductsByClient } from '@/Fetch/products'
import { getDrivers, DriverDTO } from '@/Fetch/drivers'
import { getPendingPreorders, createRoute, PendingPreorderDTO } from '@/Fetch/delivery-routes'
import { getRouteTemplates, RouteTemplateDTO, estimateRouteSales, RouteSalesEstimateDTO, createRouteTemplate, updateRouteTemplate } from '@/Fetch/routeTemplates'
import { createRouteSchedule, INTERVALOS_SEMANAS } from '@/Fetch/routeSchedules'
import { StoreMarker } from './components/StoreMarker'
import { PromoterMarker } from './components/PromoterMarker'
import { StoreOrderHistory } from './components/StoreOrderHistory'
import { StoreDeliveryHistory } from './components/StoreDeliveryHistory'

const FILTRO_TODOS = 'todos'
const DEFAULT_COUNTRY_ID = 1
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const DEFAULT_CENTER = { lat: 25.7460, lng: -100.2792 } // Nuevo León, como default razonable

const SEMAPHORE_LABEL: Record<string, string> = {
  red: 'Bajo el mínimo',
  yellow: 'Cerca del mínimo',
  green: 'Bien surtida',
}
const SEMAPHORE_DOT: Record<string, string> = {
  red: 'bg-destructive',
  yellow: 'bg-warning',
  green: 'bg-success',
}

interface SelectedStop {
  id_store: number
  id_preorder: number | null
  store_name: string
  semaphore: 'red' | 'yellow' | 'green' | null
  turno: 'MAÑANA' | 'TARDE'
}

export default function Mapa() {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const idClient = user?.id_client && user.id_client > 0 ? user.id_client : undefined

  const [channels, setChannels] = useState<channelSalesDTO[]>([])
  const [states, setStates] = useState<StateDTO[]>([])
  const [cities, setCities] = useState<CityDTO[]>([])

  const [canal, setCanal] = useState(FILTRO_TODOS)
  const [estado, setEstado] = useState(FILTRO_TODOS)
  const [municipio, setMunicipio] = useState(FILTRO_TODOS)
  const [mostrarTiendas, setMostrarTiendas] = useState<'todas' | 'mias' | 'nuevas'>('todas')
  const [misIds, setMisIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.get<ApiResponse<{ id_store: number }[]>>('/stores/mine/list')
      .then((r) => setMisIds(new Set((r.data ?? []).map((t) => t.id_store))))
      .catch(() => {})
  }, [user?.id_client])

  const [stores, setStores] = useState<MapStoreDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStore, setSelectedStore] = useState<MapStoreDTO | null>(null)

  // --- Filtro por indicador (semaforo o pendientes de surtir) ---
  const [activeFilter, setActiveFilter] = useState<'red' | 'yellow' | 'green' | 'pending' | null>(null)

  // --- Prepedidos pendientes de surtir (para el indicador y para armar rutas) ---
  const [pendingPreorders, setPendingPreorders] = useState<PendingPreorderDTO[]>([])
  const [preorderDateFilter, setPreorderDateFilter] = useState('')
  const [preorderTimeFilter, setPreorderTimeFilter] = useState<'todos' | 'MAÑANA' | 'TARDE'>('todos')
  const pendingByStore = useMemo(() => {
    const map = new Map<number, PendingPreorderDTO[]>()
    pendingPreorders.forEach((p) => {
      const list = map.get(p.task.store.id_store) ?? []
      list.push(p)
      map.set(p.task.store.id_store, list)
    })
    return map
  }, [pendingPreorders])

  const loadPendingPreorders = () => {
    getPendingPreorders({
      date: preorderDateFilter || undefined,
      time: preorderTimeFilter !== 'todos' ? preorderTimeFilter : undefined,
    })
      .then((res) => setPendingPreorders(res.data))
      .catch(() => toast.error('Error al cargar los prepedidos pendientes'))
  }

  // Vuelve a cargar los pendientes cada vez que cambia el filtro de dia/turno,
  // para que "con pedido" en Organizar ruta solo cuente los de ese dia. Y en
  // cuanto se pone una fecha, cambia el filtro a "Con pedido" automatico,
  // para que de verdad solo se vean esas tiendas sin tener que darle clic
  // aparte al filtro.
  useEffect(() => {
    loadPendingPreorders()
    if (preorderDateFilter) {
      setRouteFilter('con_pedido')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preorderDateFilter, preorderTimeFilter])

  // --- Organizar ruta ---
  const [showRouteSetup, setShowRouteSetup] = useState(false)
  const [drivers, setDrivers] = useState<DriverDTO[]>([])
  const [routeDriverId, setRouteDriverId] = useState('')
  const [routeDate, setRouteDate] = useState('')
  const [buildingRoute, setBuildingRoute] = useState(false)
  const [selectedStops, setSelectedStops] = useState<SelectedStop[]>([])
  const [savingRoute, setSavingRoute] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState<'todas' | 'con_pedido' | 'sin_pedido' | 'red' | 'yellow' | 'green'>('todas')
  const [routeTemplates, setRouteTemplates] = useState<RouteTemplateDTO[]>([])
  const [attachTemplateId, setAttachTemplateId] = useState<string>('')
  const [repeatAutomatically, setRepeatAutomatically] = useState(false)
  const [repeatIntervalWeeks, setRepeatIntervalWeeks] = useState('1')
  const [routeName, setRouteName] = useState('')
  const [mananaInicio, setMananaInicio] = useState('10:00')
  const [mananaFin, setMananaFin] = useState('13:00')
  const [tardeInicio, setTardeInicio] = useState('14:00')
  const [tardeFin, setTardeFin] = useState('18:00')
  // En que turno se van metiendo las tiendas que se van seleccionando --
  // asi el cliente primero marca todas las de la mañana, cambia a "Tarde"
  // y marca las de la tarde, sin tener que corregir tienda por tienda.
  const [assignTurno, setAssignTurno] = useState<'MAÑANA' | 'TARDE'>('MAÑANA')

  const routeDayName = useMemo(() => {
    if (!routeDate) return ''
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    return dias[new Date(routeDate + 'T00:00:00').getDay()]
  }, [routeDate])
  const [routeEstimate, setRouteEstimate] = useState<RouteSalesEstimateDTO | null>(null)
  const [loadingRouteEstimate, setLoadingRouteEstimate] = useState(false)
  const [storeEstimates, setStoreEstimates] = useState<Map<number, number>>(new Map())

  // Estimado de venta por CADA tienda (no solo las seleccionadas), para que
  // el cliente pueda ir armando la ruta viendo cuales tiendas le conviene
  // mas agregar, tanto en el mapa como en la lista.
  useEffect(() => {
    if (!buildingRoute || stores.length === 0) {
      setStoreEstimates(new Map())
      return
    }
    estimateRouteSales(stores.map((s) => s.id_store))
      .then((res) => {
        const map = new Map<number, number>()
        for (const s of res.data.stores) {
          if (s.has_minimums && !s.is_stale && s.estimated_value > 0) map.set(s.id_store, s.estimated_value)
        }
        setStoreEstimates(map)
      })
      .catch(() => {})
  }, [buildingRoute, stores])

  useEffect(() => {
    if (!buildingRoute || selectedStops.length === 0) {
      setRouteEstimate(null)
      return
    }
    setLoadingRouteEstimate(true)
    const timeout = setTimeout(() => {
      estimateRouteSales(selectedStops.map((s) => s.id_store))
        .then((res) => setRouteEstimate(res.data))
        .catch(() => {})
        .finally(() => setLoadingRouteEstimate(false))
    }, 400)
    return () => clearTimeout(timeout)
  }, [selectedStops, buildingRoute])

  const openRouteSetup = () => {
    getDrivers().then((res) => setDrivers(res.data)).catch(() => toast.error('Error al cargar los choferes'))
    if (user?.id_client) {
      getRouteTemplates(user.id_client).then((res) => setRouteTemplates(res.data ?? [])).catch(() => {})
    }
    setRouteDriverId('')
    setRouteDate(new Date().toISOString().slice(0, 10))
    setAttachTemplateId('')
    setRepeatAutomatically(false)
    setRepeatIntervalWeeks('1')
    setRouteName('')
    setMananaInicio('10:00')
    setMananaFin('13:00')
    setTardeInicio('14:00')
    setTardeFin('18:00')
    setShowRouteSetup(true)
  }

  const startBuildingRoute = () => {
    if (!routeDriverId || !routeDate) {
      toast.error('Selecciona chofer y fecha')
      return
    }
    setShowRouteSetup(false)
    setActiveFilter(null)
    setRouteSearch('')
    setRouteFilter('todas')
    setAssignTurno('MAÑANA')

    if (attachTemplateId) {
      const template = routeTemplates.find((t) => String(t.id_route_template) === attachTemplateId)
      if (template) {
        const prefilled: SelectedStop[] = template.stores
          .map((ts) => ({ ts, store: stores.find((s) => s.id_store === ts.id_store) }))
          .filter((x): x is { ts: typeof template.stores[number]; store: MapStoreDTO } => !!x.store)
          .map(({ ts, store: s }) => ({
            id_store: s.id_store,
            id_preorder: pendingByStore.get(s.id_store)?.[0]?.id_preorder ?? null,
            store_name: s.name,
            semaphore: s.semaphore ?? null,
            turno: ts.turno === 'TARDE' ? 'TARDE' as const : 'MAÑANA' as const,
          }))
        setSelectedStops(prefilled)
        const faltantes = template.stores.length - prefilled.length
        if (faltantes > 0) {
          toast.error(`${faltantes} tienda(s) de "${template.name}" ya no existen o no están disponibles`)
        }
      }
    } else {
      setSelectedStops([])
    }
    setBuildingRoute(true)
  }

  const toggleStop = (store: MapStoreDTO) => {
    const pending = pendingByStore.get(store.id_store)
    setSelectedStops((prev) => {
      const already = prev.find((s) => s.id_store === store.id_store)
      if (already) return prev.filter((s) => s.id_store !== store.id_store)
      return [...prev, {
        id_store: store.id_store,
        id_preorder: pending?.[0]?.id_preorder ?? null,
        store_name: store.name,
        semaphore: store.semaphore ?? null,
        turno: assignTurno,
      }]
    })
  }

  const setStopTurno = (id_store: number, turno: 'MAÑANA' | 'TARDE') => {
    setSelectedStops((prev) => prev.map((s) => (s.id_store === id_store ? { ...s, turno } : s)))
  }

  // --- Exportar / importar la ruta por Excel ---
  // Normaliza un nombre de tienda para comparar sin importar mayusculas,
  // acentos o espacios de mas -- asi no importa como lo escriba Vic en el Excel.
  const normalizarNombreTienda = (nombre: string) =>
    nombre
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')

  const handleExportarExcelRuta = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { 'Nombre de tienda': 'Ejemplo: Oxxo Cedeco', 'Turno (MAÑANA o TARDE)': 'MAÑANA' },
    ]
    const sheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Ruta')
    XLSX.writeFile(workbook, 'formato_ruta.xlsx')
    toast.success('Formato descargado. Borra el ejemplo, escribe el nombre de cada tienda y si es MAÑANA o TARDE, y vuelve a subirlo. No importa si usas mayúsculas o minúsculas en el nombre.')
  }

  const handleImportarExcelRuta = async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const nuevos: SelectedStop[] = []
      const noEncontrados: string[] = []
      for (const row of rows) {
        const nombre = String(row['Nombre de tienda'] ?? '').trim()
        if (!nombre || nombre.toLowerCase().startsWith('ejemplo')) continue
        const turnoRaw = String(row['Turno (MAÑANA o TARDE)'] ?? '').trim().toUpperCase()
        if (!turnoRaw) continue
        const turno: 'MAÑANA' | 'TARDE' = turnoRaw.startsWith('T') ? 'TARDE' : 'MAÑANA'
        const nombreNormalizado = normalizarNombreTienda(nombre)
        const match = stores.find((s) => normalizarNombreTienda(s.name) === nombreNormalizado)
        if (!match) {
          noEncontrados.push(nombre)
          continue
        }
        const pending = pendingByStore.get(match.id_store)
        nuevos.push({
          id_store: match.id_store,
          id_preorder: pending?.[0]?.id_preorder ?? null,
          store_name: match.name,
          semaphore: match.semaphore ?? null,
          turno,
        })
      }

      if (nuevos.length === 0) {
        toast.error('No se encontró ninguna tienda con turno marcado en el archivo')
        return
      }

      setSelectedStops((prev) => {
        const idsNuevos = new Set(nuevos.map((n) => n.id_store))
        return [...prev.filter((s) => !idsNuevos.has(s.id_store)), ...nuevos]
      })
      toast.success(`${nuevos.length} tienda(s) asignada(s) desde el Excel`)
      if (noEncontrados.length > 0) {
        toast.error(`No se encontró${noEncontrados.length === 1 ? '' : 'ron'}: ${noEncontrados.join(', ')}`)
      }
    } catch {
      toast.error('Error al leer el archivo. Verifica que sea el mismo formato exportado.')
    }
  }

  const cancelRouteBuilding = () => {
    setBuildingRoute(false)
    setSelectedStops([])
  }

  const confirmRoute = async () => {
    if (selectedStops.length === 0) {
      toast.error('Selecciona al menos una tienda')
      return
    }
    if (!routeName.trim()) {
      toast.error('Ponle un nombre a la ruta')
      return
    }
    setSavingRoute(true)
    try {
      const templateStores = selectedStops.map((s) => ({ id_store: s.id_store, turno: s.turno }))
      let id_route_template: number | undefined
      let id_schedule: number | undefined

      // Toda ruta que se organiza queda guardada como reutilizable (con su
      // nombre), se repita automatico o no -- asi aparece en "Rutas
      // Creadas" y se puede adjuntar despues.
      if (user?.id_client) {
        try {
          if (attachTemplateId) {
            const updated = await updateRouteTemplate(Number(attachTemplateId), { name: routeName.trim(), stores: templateStores })
            id_route_template = updated.data.id_route_template
          } else {
            const created = await createRouteTemplate({ id_client: user.id_client, name: routeName.trim(), stores: templateStores })
            id_route_template = created.data.id_route_template
          }
        } catch {
          toast.error('No se pudo guardar la ruta como reutilizable, pero seguimos con la ruta de hoy')
        }
      }

      if (repeatAutomatically && user?.id_client && id_route_template) {
        try {
          const dayOfWeekJs = new Date(routeDate + 'T00:00:00').getDay()
          const dayOfWeek = dayOfWeekJs === 0 ? 7 : dayOfWeekJs
          const schedule = await createRouteSchedule({
            id_client: user.id_client,
            id_route_template,
            id_driver: Number(routeDriverId),
            day_of_week: dayOfWeek,
            interval_weeks: Number(repeatIntervalWeeks),
            anchor_date: routeDate,
          })
          id_schedule = schedule.data.id_schedule
        } catch {
          toast.error('No se pudo programar la repetición automática, pero seguimos con la ruta de hoy')
        }
      }

      await createRoute({
        id_driver: Number(routeDriverId),
        route_date: routeDate,
        id_schedule,
        id_route_template,
        manana_inicio: mananaInicio || null,
        manana_fin: mananaFin || null,
        tarde_inicio: tardeInicio || null,
        tarde_fin: tardeFin || null,
        stops: selectedStops.map((s) => ({ id_store: s.id_store, id_preorder: s.id_preorder ?? undefined, turno: s.turno })),
      })

      toast.success(id_schedule ? 'Ruta creada y programada para repetirse automáticamente' : 'Ruta creada y asignada al chofer')
      cancelRouteBuilding()
      loadPendingPreorders()
    } catch (e: any) {
      toast.error(e?.message || 'Error al crear la ruta')
    } finally {
      setSavingRoute(false)
    }
  }

  // --- Catálogos para los filtros ---
  useEffect(() => {
    api.get<ApiResponse<channelSalesDTO[]>>('/channel-sales/')
      .then((res) => setChannels(res.data))
      .catch(() => toast.error('Error al cargar los canales de venta'))
  }, [])

  useEffect(() => {
    api.get<ApiResponse<StateDTO[]>>(`/clients/states/${DEFAULT_COUNTRY_ID}`)
      .then((res) => setStates(res.data))
      .catch(() => toast.error('Error al cargar los estados'))
  }, [])

  useEffect(() => {
    if (estado === FILTRO_TODOS) {
      setCities([])
      return
    }
    api.get<ApiResponse<CityDTO[]>>(`/clients/cities/${estado}`)
      .then((res) => setCities(res.data))
      .catch(() => toast.error('Error al cargar los municipios'))
  }, [estado])

  // --- Datos del mapa ---
  const loadMapData = () => {
    setLoading(true)
    getStockMapData({
      id_channel: canal !== FILTRO_TODOS ? Number(canal) : undefined,
      id_state: estado !== FILTRO_TODOS ? Number(estado) : undefined,
      id_municipio: municipio !== FILTRO_TODOS ? Number(municipio) : undefined,
      id_client: idClient,
    })
      .then((res) => setStores(res.data))
      .catch(() => toast.error('Error al cargar el mapa'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMapData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, estado, municipio, idClient])

  const mapCenter = useMemo(() => {
    if (stores.length === 0) return DEFAULT_CENTER
    const withCoords = stores.filter((s) => s.latitude && s.longitude)
    if (withCoords.length === 0) return DEFAULT_CENTER
    const lat = withCoords.reduce((sum, s) => sum + s.latitude, 0) / withCoords.length
    const lng = withCoords.reduce((sum, s) => sum + s.longitude, 0) / withCoords.length
    return { lat, lng }
  }, [stores])

  const totalActivePromoters = stores.reduce((sum, s) => sum + s.active_promoters.length, 0)
  const countBySemaphore = useMemo(() => {
    const counts = { red: 0, yellow: 0, green: 0 }
    stores.forEach((s) => {
      if (s.semaphore === 'red') counts.red++
      else if (s.semaphore === 'yellow') counts.yellow++
      else if (s.semaphore === 'green') counts.green++
    })
    return counts
  }, [stores])

  // Solo filtra las tiendas que se muestran en el mapa; los promotores
  // activos siempre se ven, sin importar el filtro elegido. Mientras se
  // arma una ruta, usa el buscador + filtro de la lista de ruta en vez del
  // filtro normal de abajo, para que el mapa y la lista muestren siempre
  // exactamente las mismas tiendas.
  const visibleStores = useMemo(() => {
    const base = stores.filter((s) =>
      mostrarTiendas === 'todas' ? true : mostrarTiendas === 'mias' ? misIds.has(s.id_store) : !misIds.has(s.id_store))
    if (buildingRoute) {
      return base.filter((s) => {
        if (!s.name.toLowerCase().includes(routeSearch.toLowerCase())) return false
        if (routeFilter === 'con_pedido') return pendingByStore.has(s.id_store)
        if (routeFilter === 'sin_pedido') return !pendingByStore.has(s.id_store)
        if (routeFilter === 'red' || routeFilter === 'yellow' || routeFilter === 'green') return s.semaphore === routeFilter
        return true
      })
    }
    if (!activeFilter) return base
    if (activeFilter === 'pending') return base.filter((s) => pendingByStore.has(s.id_store))
    return base.filter((s) => s.semaphore === activeFilter)
  }, [stores, activeFilter, pendingByStore, buildingRoute, routeSearch, routeFilter, mostrarTiendas, misIds])

  const toggleFilter = (filter: 'red' | 'yellow' | 'green' | 'pending') => {
    setActiveFilter((prev) => (prev === filter ? null : filter))
  }

  return (
    <PageWrapper>
      <PageHeader title="Crear Ruta" subtitle="Ubicación de tiendas, promotores activos, inventario y rutas de entrega en vivo" />

      <div className="flex justify-end gap-2 mb-3">
        {!buildingRoute && (
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/mapa/asignar-minimos')}>
              <ListChecks size={16} className="mr-1.5" /> Asignar mínimos por lote
            </Button>
            <Button size="sm" onClick={openRouteSetup}>
              <RouteIcon size={16} className="mr-1.5" /> Crear ruta
            </Button>
          </>
        )}
        {buildingRoute && (
          <>
            <Badge variant="outline" className="mr-auto">
              Selecciona las tiendas desde el mapa o la lista, en el orden en que se van a visitar.
            </Badge>
            {selectedStops.length > 0 && (
              <Badge className={`gap-1.5 ${routeEstimate?.can_estimate === false ? 'bg-warning/10 text-warning-foreground dark:text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                {loadingRouteEstimate ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : routeEstimate?.can_estimate ? (
                  <>Venta estimada: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(routeEstimate.total ?? 0)}</>
                ) : routeEstimate ? (
                  <>{routeEstimate.missing_count} tienda{routeEstimate.missing_count !== 1 ? 's' : ''} sin info reciente, no hay estimado</>
                ) : null}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleExportarExcelRuta}>
              <Download size={14} className="mr-1.5" /> Exportar Excel
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer inline-flex items-center">
                  <Upload size={14} className="mr-1.5" /> Importar Excel
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportarExcelRuta(file)
                  e.target.value = ''
                }}
              />
            </label>
            <Button variant="ghost" size="sm" onClick={cancelRouteBuilding} disabled={savingRoute}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmRoute} disabled={savingRoute || selectedStops.length === 0}>
              {savingRoute && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              Confirmar ruta ({selectedStops.length})
            </Button>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={canal} onValueChange={setCanal}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Canal de venta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTRO_TODOS}>Todos los canales</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estado} onValueChange={(v) => { setEstado(v); setMunicipio(FILTRO_TODOS) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTRO_TODOS}>Todos los estados</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={municipio} onValueChange={setMunicipio} disabled={estado === FILTRO_TODOS}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Municipio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTRO_TODOS}>Todos los municipios</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mostrarTiendas} onValueChange={(v) => setMostrarTiendas(v as 'todas' | 'mias' | 'nuevas')}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tiendas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las tiendas de la app</SelectItem>
            <SelectItem value="mias">Solo mis tiendas</SelectItem>
            <SelectItem value="nuevas">Las que aún no tengo</SelectItem>
          </SelectContent>
        </Select>

        {buildingRoute && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
              Pedidos con entrega abierta
            </span>
            <Input
              type="date"
              value={preorderDateFilter}
              onChange={(e) => setPreorderDateFilter(e.target.value)}
              className="w-[150px]"
            />
            <select
              value={preorderTimeFilter}
              onChange={(e) => setPreorderTimeFilter(e.target.value as any)}
              className="text-sm rounded-lg border border-border px-2 bg-white h-9"
            >
              <option value="todos">Mañana y tarde</option>
              <option value="MAÑANA">Solo mañana</option>
              <option value="TARDE">Solo tarde</option>
            </select>
            {preorderDateFilter && (
              <button
                type="button"
                onClick={() => { setPreorderDateFilter(''); setPreorderTimeFilter('todos') }}
                className="text-xs underline text-muted-foreground/70 whitespace-nowrap"
              >
                Quitar
              </button>
            )}
          </div>
        )}

        {!buildingRoute && (
          <div className="flex items-center gap-3 ml-auto text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => toggleFilter('red')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${activeFilter === 'red' ? 'bg-destructive/15 text-destructive' : 'hover:bg-muted'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> {countBySemaphore.red} bajo mínimo
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('yellow')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${activeFilter === 'yellow' ? 'bg-warning/15 text-warning-foreground dark:text-warning' : 'hover:bg-muted'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> {countBySemaphore.yellow} cerca del mínimo
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('green')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${activeFilter === 'green' ? 'bg-success/15 text-success' : 'hover:bg-muted'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-success" /> {countBySemaphore.green} bien surtida(s)
            </button>
            <span className="flex items-center gap-1.5 px-2 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-info" /> {totalActivePromoters} promotor(es) activo(s)
            </span>
            <button
              type="button"
              onClick={() => toggleFilter('pending')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${activeFilter === 'pending' ? 'bg-warning/15 text-warning-foreground dark:text-warning' : 'hover:bg-muted'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> {pendingPreorders.length} pedido(s) pendiente(s)
            </button>
            {activeFilter && (
              <button type="button" onClick={() => setActiveFilter(null)} className="text-xs underline text-muted-foreground/70">
                Ver todos
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: 480 }}>
        {/* Mapa */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border relative">
          {(loading || !isLoaded) && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-muted-foreground" size={28} />
            </div>
          )}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={mapCenter}
              zoom={stores.length > 0 ? 11 : 6}
            >
              {visibleStores.map((store) => {
                const stopIndex = selectedStops.findIndex((s) => s.id_store === store.id_store)
                return (
                  <StoreMarker
                    key={store.id_store}
                    store={store}
                    selected={selectedStore?.id_store === store.id_store}
                    hasPendingOrder={pendingByStore.has(store.id_store)}
                    routeOrder={buildingRoute && stopIndex >= 0 ? stopIndex + 1 : null}
                    estimatedValue={buildingRoute ? storeEstimates.get(store.id_store) : undefined}
                    onClick={() =>
                      buildingRoute ? toggleStop(store) : setSelectedStore(store)
                    }
                  />
                )
              })}
              {!buildingRoute && stores.flatMap((store) =>
                store.active_promoters.map((p) => (
                  <PromoterMarker key={p.id_promoter} promoter={p} storeName={store.name} />
                ))
              )}
            </GoogleMap>
          )}
        </div>

        {/* Panel lateral: detalle de tienda, o lista de seleccion de ruta (mapa y lista van conectados) */}
        {buildingRoute && (
          <RouteListPicker
            stores={visibleStores}
            pendingByStore={pendingByStore}
            selectedStops={selectedStops}
            storeEstimates={storeEstimates}
            onToggle={toggleStop}
            onSetTurno={setStopTurno}
            assignTurno={assignTurno}
            onSetAssignTurno={setAssignTurno}
            search={routeSearch}
            onSearchChange={setRouteSearch}
            filter={routeFilter}
            onFilterChange={setRouteFilter}
          />
        )}
        {!buildingRoute && selectedStore && (
          <StoreDetailPanel
            store={selectedStore}
            idClient={idClient}
            pending={pendingByStore.get(selectedStore.id_store) ?? []}
            onClose={() => setSelectedStore(null)}
            onMinimumSaved={loadMapData}
          />
        )}
      </div>

      {/* Configurar ruta: chofer, fecha */}
      <Dialog open={showRouteSetup} onOpenChange={setShowRouteSetup}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Crear ruta de entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre de la ruta</Label>
              <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Ej. Ruta Centro" />
            </div>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <Label>Horario real de esta ruta</Label>
              <p className="text-xs text-muted-foreground">Para saber a que hora le toca a cada tienda mañana o tarde.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Mañana: de</Label>
                  <div className="flex items-center gap-1">
                    <Input type="time" value={mananaInicio} onChange={(e) => setMananaInicio(e.target.value)} />
                    <span className="text-xs text-muted-foreground">a</span>
                    <Input type="time" value={mananaFin} onChange={(e) => setMananaFin(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tarde: de</Label>
                  <div className="flex items-center gap-1">
                    <Input type="time" value={tardeInicio} onChange={(e) => setTardeInicio(e.target.value)} />
                    <span className="text-xs text-muted-foreground">a</span>
                    <Input type="time" value={tardeFin} onChange={(e) => setTardeFin(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Label>¿A qué chofer le asignamos esta ruta?</Label>
              <Select value={routeDriverId} onValueChange={setRouteDriverId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un chofer" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id_driver} value={String(d.id_driver)}>
                      {d.name}{d.i_active_routes_today ? ` — ${d.i_active_routes_today} ruta${d.i_active_routes_today !== 1 ? 's' : ''} activa${d.i_active_routes_today !== 1 ? 's' : ''} hoy` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drivers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No tienes choferes dados de alta todavía. Ve al menú "Choferes" para agregar uno.
                </p>
              )}
            </div>
            <div>
              <Label>Fecha de la ruta</Label>
              <Input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
            </div>
            <div>
              <Label>¿Adjuntar una ruta ya creada? (opcional)</Label>
              <Select value={attachTemplateId} onValueChange={setAttachTemplateId}>
                <SelectTrigger><SelectValue placeholder="No, armar una ruta en específico" /></SelectTrigger>
                <SelectContent>
                  {routeTemplates.map((t) => (
                    <SelectItem key={t.id_route_template} value={String(t.id_route_template)}>
                      {t.name} ({t.stores.length} tiendas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachTemplateId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Se van a marcar las tiendas de esa ruta de una vez. Podrás agregar más tiendas o quitar antes de confirmar.
                </p>
              )}
            </div>

            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={repeatAutomatically} onCheckedChange={(v) => setRepeatAutomatically(!!v)} />
                <Label className="cursor-pointer" onClick={() => setRepeatAutomatically((v) => !v)}>
                  {routeDate
                    ? `Asignaste esta ruta en ${routeDayName}, ¿repetir automático todos los ${routeDayName}?`
                    : '¿Repetir esto automático a este chofer?'}
                </Label>
              </div>
              <div className="space-y-2">
                  <div>
                    <Label className="text-xs">¿Cada cuánto?</Label>
                    <Select value={repeatIntervalWeeks} onValueChange={setRepeatIntervalWeeks}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTERVALOS_SEMANAS.map((i) => (
                          <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se le va a generar sola esta ruta a este chofer {INTERVALOS_SEMANAS.find((i) => String(i.value) === repeatIntervalWeeks)?.label.toLowerCase()}, todos los {routeDayName || 'días que elijas'}. Al día siguiente de cada entrega se desactiva sola en "Rutas Creadas" hasta la próxima vez, a menos que la reactives a mano.
                  </p>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRouteSetup(false)}>Cancelar</Button>
            <Button onClick={startBuildingRoute}>Empezar a armar la ruta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}

const SEMAPHORE_DOT_MAP: Record<string, string> = {
  red: 'bg-destructive',
  yellow: 'bg-warning',
  green: 'bg-success',
}

function RouteListPicker({
  stores,
  pendingByStore,
  selectedStops,
  storeEstimates,
  onToggle,
  onSetTurno,
  assignTurno,
  onSetAssignTurno,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  stores: MapStoreDTO[]
  pendingByStore: Map<number, PendingPreorderDTO[]>
  selectedStops: SelectedStop[]
  storeEstimates: Map<number, number>
  onToggle: (store: MapStoreDTO) => void
  onSetTurno: (id_store: number, turno: 'MAÑANA' | 'TARDE') => void
  assignTurno: 'MAÑANA' | 'TARDE'
  onSetAssignTurno: (turno: 'MAÑANA' | 'TARDE') => void
  search: string
  onSearchChange: (value: string) => void
  filter: 'todas' | 'con_pedido' | 'sin_pedido' | 'red' | 'yellow' | 'green'
  onFilterChange: (value: 'todas' | 'con_pedido' | 'sin_pedido' | 'red' | 'yellow' | 'green') => void
}) {
  // "stores" ya viene filtrada desde el componente padre (mismo buscador +
  // filtro que se usa para decidir que marcadores se ven en el mapa), asi
  // que el mapa y esta lista siempre muestran exactamente las mismas tiendas.
  const orderByStore = new Map(selectedStops.map((s, i) => [s.id_store, i + 1]))

  const FILTERS: { value: typeof filter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'con_pedido', label: 'Con pedido' },
    { value: 'sin_pedido', label: 'Sin pedido' },
    { value: 'red', label: 'Bajo mínimo' },
    { value: 'yellow', label: 'Cerca del mínimo' },
    { value: 'green', label: 'Bien surtida' },
  ]

  return (
    <div className="w-[340px] shrink-0 rounded-xl border border-border bg-white p-4 overflow-y-auto">
      <div className="mb-3 pb-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
          Asignando ahora a...
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetAssignTurno('MAÑANA')}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${assignTurno !== 'TARDE' ? 'bg-warning text-white' : 'bg-muted text-muted-foreground'}`}
          >
            Mañana
          </button>
          <button
            type="button"
            onClick={() => onSetAssignTurno('TARDE')}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${assignTurno === 'TARDE' ? 'bg-info text-white' : 'bg-muted text-muted-foreground'}`}
          >
            Tarde
          </button>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Las tiendas que selecciones de aquí en adelante se agregan a "{assignTurno === 'TARDE' ? 'Tarde' : 'Mañana'}".
        </p>
      </div>

      {selectedStops.length > 0 && (
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Orden de la ruta ({selectedStops.length})
          </p>
          {(['MAÑANA', 'TARDE'] as const).map((turno) => {
            const group = selectedStops.filter((s) => s.turno === turno)
            if (group.length === 0) return null
            return (
              <div key={turno} className="mb-2 last:mb-0">
                <p className={`text-[11px] font-bold uppercase mb-1 ${turno === 'TARDE' ? 'text-info' : 'text-warning-foreground dark:text-warning'}`}>
                  {turno === 'TARDE' ? 'Tarde' : 'Mañana'} ({group.length})
                </p>
                <ul className="space-y-1.5">
                  {group.map((s) => (
                    <li key={s.id_store} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-success text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {(orderByStore.get(s.id_store) ?? 0)}
                      </span>
                      {s.semaphore && <span className={`w-2 h-2 rounded-full shrink-0 ${SEMAPHORE_DOT_MAP[s.semaphore]}`} />}
                      <span className="flex-1 truncate">{s.store_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <Input
        placeholder="Buscar tienda..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="mb-2"
      />
      <div className="flex flex-wrap gap-1 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${filter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
        Tiendas ({stores.length})
      </p>
      {stores.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">No hay tiendas que coincidan.</p>
      ) : (
        <ul className="space-y-2">
          {stores.map((store) => {
            const order = orderByStore.get(store.id_store)
            const hasPending = pendingByStore.has(store.id_store)
            const selectedStop = selectedStops.find((s) => s.id_store === store.id_store)
            return (
              <li key={store.id_store}>
                <button
                  type="button"
                  onClick={() => onToggle(store)}
                  className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${order ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {store.semaphore && <span className={`w-2 h-2 rounded-full shrink-0 ${SEMAPHORE_DOT_MAP[store.semaphore]}`} />}
                      <span className="text-sm font-medium truncate">{store.name}</span>
                    </span>
                    {order && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{order}</span>
                    )}
                  </div>
                  {hasPending && (
                    <p className="text-xs text-warning-foreground dark:text-warning mt-0.5">Tiene pedido pendiente</p>
                  )}
                  {storeEstimates.has(store.id_store) && (
                    <p className="text-xs text-success font-semibold mt-0.5">
                      Venta estimada: ${storeEstimates.get(store.id_store)!.toFixed(0)}
                    </p>
                  )}
                </button>
                {selectedStop && (
                  <div className="flex items-center gap-1 mt-1 pl-1">
                    <button
                      type="button"
                      onClick={() => onSetTurno(store.id_store, 'MAÑANA')}
                      className={`flex-1 px-2 py-1 rounded-md text-xs font-medium ${selectedStop.turno !== 'TARDE' ? 'bg-warning text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTurno(store.id_store, 'TARDE')}
                      className={`flex-1 px-2 py-1 rounded-md text-xs font-medium ${selectedStop.turno === 'TARDE' ? 'bg-info text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      Tarde
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StoreDetailPanel({
  store,
  idClient,
  pending,
  onClose,
  onMinimumSaved,
}: {
  store: MapStoreDTO
  idClient?: number
  pending: PendingPreorderDTO[]
  onClose: () => void
  onMinimumSaved: () => void
}) {
  const [minimums, setMinimums] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [allProducts, setAllProducts] = useState<ProductDTO[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)

  const loadMinimums = () => {
    getStockMinimumsByStore(store.id_store, idClient)
      .then((res) => {
        const map: Record<number, string> = {}
        res.data.forEach((m) => { map[m.id_product] = String(m.i_minimum) })
        setMinimums(map)
      })
      .catch(() => toast.error('Error al cargar los mínimos de esta tienda'))
  }

  useEffect(() => {
    loadMinimums()
    if (idClient) {
      getProductsByClient(idClient)
        .then((res: ApiResponse<ProductDTO[]>) => setAllProducts(res.data))
        .catch(() => toast.error('Error al cargar el catálogo de productos'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id_store, idClient])

  const productsWithMinimum = new Set(store.products.map((p) => p.id_product))
  const productsWithoutMinimum = allProducts.filter((p) => !productsWithMinimum.has(p.id_product))

  const saveMinimum = async (id_product: number) => {
    const value = Number(minimums[id_product])
    if (Number.isNaN(value) || value < 0 || minimums[id_product] === undefined || minimums[id_product] === '') {
      toast.error('El mínimo debe ser un número válido')
      return
    }
    setSavingId(id_product)
    try {
      await setStockMinimum({ id_product, id_store: store.id_store, i_minimum: value })
      toast.success('Mínimo actualizado')
      loadMinimums()
      onMinimumSaved()
    } catch {
      toast.error('Error al guardar el mínimo')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="w-[340px] shrink-0 rounded-xl border border-border bg-white p-4 overflow-y-auto">
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ChevronLeft size={16} /> Cerrar
      </button>

      <div className="flex items-start gap-3 mb-1">
        {store.channel?.logo && (
          <img src={store.channel.logo} alt={store.channel.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
        )}
        <div>
          <h3 className="font-bold text-foreground leading-tight">{store.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {store.municipio_name}, {store.state_name}
          </p>
        </div>
      </div>

      {store.semaphore && (
        <Badge variant="outline" className="mt-2 gap-1.5">
          <span className={`w-2 h-2 rounded-full ${SEMAPHORE_DOT[store.semaphore]}`} />
          {SEMAPHORE_LABEL[store.semaphore]}
        </Badge>
      )}

      {pending.length > 0 && (
        <div className="mt-4 rounded-lg border-2 border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-bold text-warning-foreground dark:text-warning uppercase mb-2">
            Pedido sin surtir
          </p>
          {pending.map((p) => (
            <div key={p.id_preorder} className="text-sm mb-2 last:mb-0">
              <p className="text-muted-foreground text-xs mb-1">
                Para el {new Date(p.preferred_date).toLocaleDateString('es-MX', { timeZone: 'UTC' })} · {p.preferred_time === 'MAÑANA' ? 'por la mañana' : 'por la tarde'}
              </p>
              {p.items.map((item) => (
                <p key={item.id_item}>
                  <span className="font-bold">{item.i_quantity}</span> {item.product.name}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Historial de pedidos
        </p>
        <StoreOrderHistory idStore={store.id_store} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Historial de entregas
        </p>
        <StoreDeliveryHistory idStore={store.id_store} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Promotores activos ({store.active_promoters.length})
        </p>
        {store.active_promoters.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">Nadie activo aquí ahora mismo.</p>
        ) : (
          <ul className="space-y-1.5">
            {store.active_promoters.map((p) => (
              <li key={p.id_promoter} className="text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-info" /> {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Inventario y mínimos por producto
        </p>
        {store.products.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">
            Esta tienda todavía no tiene mínimos configurados para ningún producto.
          </p>
        ) : (
          <div className="space-y-3">
            {store.products.map((p) => (
              <div key={p.id_product} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  {p.semaphore && (
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEMAPHORE_DOT[p.semaphore]}`} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Última existencia reportada: <strong>{p.quantity ?? 'sin reportes aún'}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={minimums[p.id_product] ?? ''}
                    onChange={(e) => setMinimums((prev) => ({ ...prev, [p.id_product]: e.target.value }))}
                    placeholder="Mínimo"
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === p.id_product}
                    onClick={() => saveMinimum(p.id_product)}
                  >
                    {savingId === p.id_product ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {idClient && productsWithoutMinimum.length > 0 && (
          <div className="mt-3">
            {!showAddProduct ? (
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAddProduct(true)}>
                + Agregar mínimo a otro producto
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                {productsWithoutMinimum.map((p) => (
                  <div key={p.id_product} className="flex items-center gap-2">
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <Input
                      type="number"
                      min={0}
                      value={minimums[p.id_product] ?? ''}
                      onChange={(e) => setMinimums((prev) => ({ ...prev, [p.id_product]: e.target.value }))}
                      placeholder="Mínimo"
                      className="h-8 text-sm w-24"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === p.id_product}
                      onClick={() => saveMinimum(p.id_product)}
                    >
                      {savingId === p.id_product ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
