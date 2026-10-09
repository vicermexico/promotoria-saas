import { toast } from 'sonner'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { GoogleMap } from '@react-google-maps/api'
import { Store as StoreIcon, Search, Trash2, Check, Plus, Loader2, X } from 'lucide-react'

import { useAuthStore } from '@/stores'
import { api, ApiResponse, useJsApiLoader, GOOGLE_MAPS_CONFIG } from '@/lib'
import { MapStoreDTO } from '@/dtos'
import { getStockMapData } from '@/Fetch/stock'
import { StoreMarker } from '@/modules/mapa/components/StoreMarker'
import {
  PageWrapper, PageHeader, DataTable, RowActions, Button, Input,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components'

interface Tienda {
  id_store: number
  name: string
  store_code?: string | null
  sales_channel?: { name?: string; url_image?: string } | null
  address?: {
    street?: string | null
    ext_number?: string | null
    neighborhood?: string | null
    postal_code?: string | null
    state?: { id: number; name: string } | null
    city?: { id: number; name: string } | null
  } | null
  i_active_promoters?: number
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const DEFAULT_CENTER = { lat: 25.746, lng: -100.2792 }
const MAX_LISTA = 300
const MAX_MARCADORES = 1000

const direccion = (t: Tienda) => {
  const a = t.address
  if (!a) return '—'
  const calle = [a.street, a.ext_number].filter(Boolean).join(' ')
  return [calle, a.neighborhood].filter(Boolean).join(', ') || '—'
}

const columnasMias: ColumnDef<Tienda>[] = [
  {
    id: 'canal',
    header: 'Canal',
    cell: ({ row }) => {
      const c = row.original.sales_channel
      if (!c?.name) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex items-center gap-2">
          {c.url_image ? <img src={c.url_image} alt={c.name} className="h-5 w-5 object-contain" /> : null}
          <span>{c.name}</span>
        </div>
      )
    },
  },
  { accessorKey: 'name', header: 'Nombre' },
  { id: 'codigo', header: 'Código', cell: ({ row }) => row.original.store_code || '—' },
  { id: 'direccion', header: 'Dirección', cell: ({ row }) => direccion(row.original) },
  { id: 'municipio', header: 'Municipio', cell: ({ row }) => row.original.address?.city?.name || '—' },
  { id: 'estado', header: 'Estado', cell: ({ row }) => row.original.address?.state?.name || '—' },
  { id: 'promotores', header: 'Promotores activos', cell: ({ row }) => row.original.i_active_promoters ?? 0 },
]

const tabClase = (activa: boolean) =>
  `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
    activa ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
  }`

const unicos = (valores: (string | null | undefined)[]) =>
  Array.from(new Set(valores.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'es'))

const MisEstablecimientos: React.FC = () => {
  const { user } = useAuthStore()
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG)
  const [tab, setTab] = useState<'mias' | 'app'>('mias')

  // ---- Mis establecimientos
  const [mias, setMias] = useState<Tienda[]>([])
  const [loadingMias, setLoadingMias] = useState(true)

  // ---- Tiendas de la app
  const [tiendasApp, setTiendasApp] = useState<MapStoreDTO[]>([])
  const [loadingApp, setLoadingApp] = useState(false)
  const [cargadoApp, setCargadoApp] = useState(false)
  const [busca, setBusca] = useState('')
  const [canal, setCanal] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [municipio, setMunicipio] = useState('todos')
  const [mostrar, setMostrar] = useState<'todas' | 'nuevas' | 'mias'>('todas')
  const [elegida, setElegida] = useState<number | null>(null)
  const [agregando, setAgregando] = useState<number | null>(null)

  const misIds = useMemo(() => new Set(mias.map((m) => m.id_store)), [mias])

  const [bMias, setBMias] = useState('')
  const [cMias, setCMias] = useState('todos')
  const [eMias, setEMias] = useState('todos')
  const [mMias, setMMias] = useState('todos')
  const canalesMias = useMemo(() => unicos(mias.map((t) => t.sales_channel?.name)), [mias])
  const estadosMias = useMemo(() => unicos(mias.map((t) => t.address?.state?.name)), [mias])
  const municipiosMias = useMemo(
    () => unicos(mias.filter((t) => eMias === 'todos' || t.address?.state?.name === eMias).map((t) => t.address?.city?.name)),
    [mias, eMias]
  )
  const miasFiltradas = useMemo(() => {
    const q = bMias.trim().toLowerCase()
    return mias.filter((t) => {
      if (q && !(t.name.toLowerCase().includes(q) || (t.store_code ?? '').toLowerCase().includes(q))) return false
      if (cMias !== 'todos' && t.sales_channel?.name !== cMias) return false
      if (eMias !== 'todos' && t.address?.state?.name !== eMias) return false
      if (mMias !== 'todos' && t.address?.city?.name !== mMias) return false
      return true
    })
  }, [mias, bMias, cMias, eMias, mMias])

  const cargarMias = useCallback(async () => {
    try {
      setLoadingMias(true)
      const r = await api.get<ApiResponse<Tienda[]>>('/stores/mine/list')
      if (r.ok && r.data) setMias(r.data)
      else toast.error('Error al cargar tus establecimientos')
    } catch (e) {
      console.error('cargarMias', e)
      toast.error('Error al cargar tus establecimientos')
    } finally {
      setLoadingMias(false)
    }
  }, [])

  const cargarApp = useCallback(async () => {
    if (!user?.id_client) return
    try {
      setLoadingApp(true)
      const r = await getStockMapData({ id_client: user.id_client })
      setTiendasApp(r.data ?? [])
      setCargadoApp(true)
    } catch (e) {
      console.error('cargarApp', e)
      toast.error('Error al cargar las tiendas de la app')
    } finally {
      setLoadingApp(false)
    }
  }, [user?.id_client])

  useEffect(() => {
    cargarMias()
  }, [cargarMias])

  useEffect(() => {
    if (tab === 'app' && !cargadoApp) cargarApp()
  }, [tab, cargadoApp, cargarApp])

  const quitar = async (t: Tienda) => {
    if (!window.confirm(`¿Quitar "${t.name}" de tus establecimientos? La tienda no se borra de la app.`)) return
    try {
      const r = await api.delete<ApiResponse<unknown>>(`/stores/mine/${t.id_store}`)
      if (r.ok) {
        toast.success('Tienda quitada de tus establecimientos')
        setMias((prev) => prev.filter((x) => x.id_store !== t.id_store))
      } else {
        toast.error(r.message || 'No se pudo quitar la tienda')
      }
    } catch (e) {
      console.error('quitar', e)
      toast.error('No se pudo quitar la tienda')
    }
  }

  const agregar = async (id_store: number) => {
    try {
      setAgregando(id_store)
      const r = await api.post<ApiResponse<unknown>>(`/stores/mine/${id_store}`, {})
      if (r.ok) {
        toast.success('Tienda agregada a tus establecimientos')
        await cargarMias()
      } else {
        toast.error(r.message || 'No se pudo agregar la tienda')
      }
    } catch (e) {
      console.error('agregar', e)
      toast.error('No se pudo agregar la tienda')
    } finally {
      setAgregando(null)
    }
  }

  const canales = useMemo(() => unicos(tiendasApp.map((t) => t.channel?.name)), [tiendasApp])
  const estados = useMemo(() => unicos(tiendasApp.map((t) => t.state_name)), [tiendasApp])
  const municipios = useMemo(
    () => unicos(tiendasApp.filter((t) => estado === 'todos' || t.state_name === estado).map((t) => t.municipio_name)),
    [tiendasApp, estado]
  )

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return tiendasApp.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false
      if (canal !== 'todos' && t.channel?.name !== canal) return false
      if (estado !== 'todos' && t.state_name !== estado) return false
      if (municipio !== 'todos' && t.municipio_name !== municipio) return false
      const es = misIds.has(t.id_store)
      if (mostrar === 'nuevas' && es) return false
      if (mostrar === 'mias' && !es) return false
      return true
    })
  }, [tiendasApp, busca, canal, estado, municipio, mostrar, misIds])

  const conCoordenadas = useMemo(() => visibles.filter((t) => t.latitude && t.longitude), [visibles])
  const centro = useMemo(() => {
    if (conCoordenadas.length === 0) return DEFAULT_CENTER
    const n = conCoordenadas.length
    return {
      lat: conCoordenadas.reduce((a, t) => a + Number(t.latitude), 0) / n,
      lng: conCoordenadas.reduce((a, t) => a + Number(t.longitude), 0) / n,
    }
  }, [conCoordenadas])

  const tiendaElegida = elegida ? tiendasApp.find((t) => t.id_store === elegida) ?? null : null

  const columnasConAcciones: ColumnDef<Tienda>[] = [
    ...columnasMias,
    {
      id: 'acciones',
      header: 'Operaciones',
      cell: ({ row }) => (
        <RowActions
          actions={[{ icon: Trash2, label: 'Quitar de mis establecimientos', tone: 'destructive', onClick: () => quitar(row.original) }]}
        />
      ),
    },
  ]

  const caja = { backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }

  const botonAgregar = (id_store: number) =>
    misIds.has(id_store) ? (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Check size={14} /> Ya es tuya
      </span>
    ) : (
      <Button
        size="sm"
        disabled={agregando === id_store}
        onClick={(e) => {
          e.stopPropagation()
          agregar(id_store)
        }}
        className="flex items-center gap-1 shrink-0"
      >
        <Plus size={14} /> Agregar
      </Button>
    )

  return (
    <PageWrapper>
      <PageHeader
        title="Mis establecimientos"
        subtitle="Las tiendas donde trabajas. Agrega más desde Tiendas de la app."
        icon={StoreIcon}
      />

      <div className="flex gap-2 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
        <button type="button" className={tabClase(tab === 'mias')} onClick={() => setTab('mias')}>
          Mis establecimientos ({mias.length})
        </button>
        <button type="button" className={tabClase(tab === 'app')} onClick={() => setTab('app')}>
          Tiendas de la app
        </button>
      </div>

      {tab === 'mias' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <Input value={bMias} onChange={(e) => setBMias(e.target.value)} placeholder="Buscar por nombre o código..." className="pl-8" />
            </div>
            <Select value={cMias} onValueChange={setCMias}>
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los canales</SelectItem>
                {canalesMias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={eMias} onValueChange={(v) => { setEMias(v); setMMias('todos') }}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estadosMias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={mMias} onValueChange={setMMias}>
              <SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los municipios</SelectItem>
                {municipiosMias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        <div className="rounded-xl border overflow-hidden" style={caja}>
          <DataTable
            columns={columnasConAcciones}
            data={miasFiltradas}
            isLoading={loadingMias}
            emptyMessage="Aún no tienes establecimientos. Las tiendas de tus órdenes de visita y rutas aparecen aquí solas, o puedes agregarlas desde Tiendas de la app."
            emptyIcon={<StoreIcon size={32} className="text-muted-foreground/70" />}
            pagination={{ pageSize: 100 }}
            responsive={{ enabled: true }}
          />
        </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="relative md:col-span-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tienda..." className="pl-8" />
            </div>

            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los canales</SelectItem>
                {canales.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={estado} onValueChange={(v) => { setEstado(v); setMunicipio('todos') }}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estados.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={municipio} onValueChange={setMunicipio}>
              <SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los municipios</SelectItem>
                {municipios.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={mostrar} onValueChange={(v) => setMostrar(v as 'todas' | 'nuevas' | 'mias')}>
              <SelectTrigger><SelectValue placeholder="Mostrar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nuevas">Las que no tengo</SelectItem>
                <SelectItem value="mias">Las mías</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {loadingApp ? 'Cargando tiendas...' : `${visibles.length} tienda${visibles.length !== 1 ? 's' : ''}`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 380px)', minHeight: 420 }}>
            <div className="rounded-xl overflow-hidden border border-border relative">
              {!isLoaded || loadingApp ? (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ) : null}
              {isLoaded && (
                <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={centro} zoom={conCoordenadas.length > 0 ? 11 : 6}>
                  {conCoordenadas.slice(0, MAX_MARCADORES).map((store) => (
                    <StoreMarker
                      key={store.id_store}
                      store={store}
                      selected={elegida === store.id_store}
                      routeOrder={null}
                      onClick={() => setElegida(store.id_store)}
                    />
                  ))}
                </GoogleMap>
              )}

              {tiendaElegida ? (
                <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg border border-border bg-white p-3 shadow-md flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tiendaElegida.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[tiendaElegida.channel?.name, tiendaElegida.municipio_name, tiendaElegida.state_name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {botonAgregar(tiendaElegida.id_store)}
                  <button type="button" onClick={() => setElegida(null)} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                    <X size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-white flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {visibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {loadingApp ? 'Cargando...' : 'No hay tiendas que coincidan.'}
                  </p>
                ) : (
                  visibles.slice(0, MAX_LISTA).map((t) => (
                    <div
                      key={t.id_store}
                      onClick={() => setElegida(t.id_store)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        elegida === t.id_store ? 'bg-info/10 border-info/30' : 'bg-white border-border hover:border-input'
                      }`}
                    >
                      {t.channel?.logo ? (
                        <img src={t.channel.logo} alt={t.channel.name} className="h-6 w-6 object-contain shrink-0" />
                      ) : (
                        <StoreIcon size={18} className="text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.municipio_name}, {t.state_name}</p>
                      </div>
                      {botonAgregar(t.id_store)}
                    </div>
                  ))
                )}
                {visibles.length > MAX_LISTA ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Se muestran {MAX_LISTA} de {visibles.length}. Usa los filtros para ver otras.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

export default MisEstablecimientos
