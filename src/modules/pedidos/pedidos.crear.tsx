import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Store, ClipboardList, Check, Loader2, ChevronDown, ChevronUp, X, Download, Upload, MapPin } from 'lucide-react'

import { useAuthStore } from '@/stores'
import { useSaldo } from '@/components/saldo/useSaldo'
import { api, ApiResponse } from '@/lib'
import { getCLientsList } from '@/Fetch/clientes'
import {
  PageWrapper,
  PageHeader,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
} from '@/components'
import { StoreDTO, RequestDTO, ClientListDTO, OrderDTO } from '@/dtos'

interface RequestSeleccionada extends RequestDTO {
  storesSeleccionadas: number[]
}

interface FiltroTiendas {
  canal: string
  estado: string
  municipio: string
}

const FILTRO_TODOS = 'todos'

export const CrearPedido = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.id_client === 0 || user?.i_rol === 1

  // --- Clientes (solo super admin) ---
  const [clientes, setClientes] = useState<ClientListDTO[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [actualizandoUbicaciones, setActualizandoUbicaciones] = useState(false)

  // --- Datos del cliente ---
  const [requests, setRequests] = useState<RequestDTO[]>([])
  const [stores, setStores] = useState<StoreDTO[]>([])
  const [storeFilterMode, setStoreFilterMode] = useState<'app' | 'mine'>('app')
  const [clientName, setClientName] = useState('')
  const [loadingDatos, setLoadingDatos] = useState(false)

  // --- Items del pedido ---
  const [items, setItems] = useState<RequestSeleccionada[]>([])
  const [filtros, setFiltros] = useState<Record<number, FiltroTiendas>>({})

  // --- UI ---
  const [requestAbierta, setRequestAbierta] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const { summary: saldo } = useSaldo(selectedClientId)

  // --- Cargar clientes (super admin) ---
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchClients = async () => {
        setLoadingClientes(true)
        try {
          const response = await getCLientsList()
          const list = response.data || []
          setClientes(list)
          if (list.length > 0) {
            setSelectedClientId(list[0].id_client)
          }
        } catch (error) {
          console.error('Error al cargar clientes:', error)
          toast.error('Error al cargar la lista de clientes.')
        } finally {
          setLoadingClientes(false)
        }
      }
      fetchClients()
    } else {
      setSelectedClientId(user?.id_client || null)
    }
  }, [isSuperAdmin, user])

  // --- Cargar requests y stores del cliente seleccionado ---
  useEffect(() => {
    if (!selectedClientId) return

    const fetchData = async () => {
      setLoadingDatos(true)
      setItems([])
      setFiltros({})
      setRequestAbierta(null)
      try {
        const [resRequests, resStores] = await Promise.all([
          api.get<ApiResponse<{ data: RequestDTO[] }>>(`/requests?id_client=${selectedClientId}`),
          api.get<ApiResponse<StoreDTO[]>>(storeFilterMode === 'mine' ? `/stores/?mine=1` : `/stores/`),
        ])

        if (resRequests.ok && resRequests.data?.data) {
          setRequests(resRequests.data.data)
        } else {
          setRequests([])
        }

        if (resStores.ok && resStores.data) {
          setStores(resStores.data)
        } else {
          setStores([])
        }
      } catch (error) {
        console.error('Error cargando datos del cliente:', error)
        toast.error('Error al cargar solicitudes y tiendas.')
        setRequests([])
        setStores([])
      } finally {
        setLoadingDatos(false)
      }
    }

    fetchData()
  }, [selectedClientId])

  // Cuando cambia el filtro Tiendas de la app / Tiendas tuyas, solo se
  // vuelve a pedir la lista de tiendas -- sin resetear lo que el cliente ya
  // llevaba armado (solicitudes y tiendas seleccionadas).
  useEffect(() => {
    if (!selectedClientId) return
    api.get<ApiResponse<StoreDTO[]>>(storeFilterMode === 'mine' ? `/stores/?mine=1` : `/stores/`)
      .then((res) => setStores(res.ok && res.data ? res.data : []))
      .catch(() => setStores([]))
  }, [storeFilterMode])

  // --- Nombre del cliente (para la etiqueta "Tiendas <nombre>") ---
  useEffect(() => {
    if (!selectedClientId) return
    api.get<ApiResponse<{ name?: string }>>(`/clients/${selectedClientId}`)
      .then((res) => setClientName(res.ok ? (res.data?.name || 'tuyas') : 'tuyas'))
      .catch(() => setClientName('tuyas'))
  }, [selectedClientId])

  // --- Handlers ---
  const handleClientChange = (value: string) => {
    setSelectedClientId(Number(value))
  }

  // Un solo clic agrega O quita la solicitud del pedido (antes solo agregaba).
  const toggleRequest = (request: RequestDTO) => {
    const yaAgregada = items.some((i) => i.id_request === request.id_request)
    if (yaAgregada) {
      setItems((prev) => prev.filter((i) => i.id_request !== request.id_request))
      if (requestAbierta === request.id_request) setRequestAbierta(null)
    } else {
      setItems((prev) => [...prev, { ...request, storesSeleccionadas: [] }])
      setFiltros((prev) => ({
        ...prev,
        [request.id_request]: { canal: FILTRO_TODOS, estado: FILTRO_TODOS, municipio: FILTRO_TODOS },
      }))
      setRequestAbierta(request.id_request)
    }
  }

  const removerRequest = (id_request: number) => {
    setItems((prev) => prev.filter((i) => i.id_request !== id_request))
    if (requestAbierta === id_request) setRequestAbierta(null)
  }

  const toggleStore = (id_request: number, id_store: number) => {
    // Cliente prepago: no deja agregar una tienda si el saldo ya no alcanza.
    const itemActual = items.find((i) => i.id_request === id_request)
    if (
      itemActual &&
      esPrepago &&
      !itemActual.storesSeleccionadas.includes(id_store) &&
      granTotal + Number(itemActual.f_value) > saldoActual + 0.0001
    ) {
      toast.error(
        `Saldo insuficiente: tu saldo es de $${saldoActual.toFixed(2)} y cada tienda de esta solicitud cuesta $${Number(itemActual.f_value).toFixed(2)}. Recarga tu saldo para agregar mas tiendas.`,
        { duration: 6000 },
      )
      return
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id_request !== id_request) return item
        const existe = item.storesSeleccionadas.includes(id_store)
        return {
          ...item,
          storesSeleccionadas: existe
            ? item.storesSeleccionadas.filter((s) => s !== id_store)
            : [...item.storesSeleccionadas, id_store],
        }
      }),
    )
  }

  // --- Filtros por Canal de venta / Estado / Municipio (independientes por solicitud) ---
  const getFiltro = (id_request: number): FiltroTiendas =>
    filtros[id_request] || { canal: FILTRO_TODOS, estado: FILTRO_TODOS, municipio: FILTRO_TODOS }

  const setFiltro = (id_request: number, campo: keyof FiltroTiendas, valor: string) => {
    setFiltros((prev) => {
      const actual = getFiltro(id_request)
      const nuevo = { ...actual, [campo]: valor }
      // Cambiar el canal reinicia estado y municipio; cambiar el estado reinicia municipio.
      if (campo === 'canal') {
        nuevo.estado = FILTRO_TODOS
        nuevo.municipio = FILTRO_TODOS
      }
      if (campo === 'estado') {
        nuevo.municipio = FILTRO_TODOS
      }
      return { ...prev, [id_request]: nuevo }
    })
  }

  const canales = Array.from(
    new Map(
      stores
        .filter((s) => s.id_channel_sale)
        .map((s) => [s.id_channel_sale, s.sales_channel?.name || 'Sin nombre']),
    ).entries(),
  )

  const getEstados = (canal: string) => {
    const filtradas = canal === FILTRO_TODOS ? stores : stores.filter((s) => String(s.id_channel_sale) === canal)
    return Array.from(
      new Map(
        filtradas
          .filter((s) => s.address?.id_state)
          .map((s) => [s.address!.id_state, s.address?.state?.name || 'Sin nombre']),
      ).entries(),
    )
  }

  const getMunicipios = (canal: string, estado: string) => {
    let filtradas = canal === FILTRO_TODOS ? stores : stores.filter((s) => String(s.id_channel_sale) === canal)
    filtradas = estado === FILTRO_TODOS ? filtradas : filtradas.filter((s) => String(s.address?.id_state) === estado)
    return Array.from(
      new Map(
        filtradas
          .filter((s) => s.address?.id_city)
          .map((s) => [s.address!.id_city, s.address?.city?.name || 'Sin nombre']),
      ).entries(),
    )
  }

  const getTiendasFiltradas = (id_request: number) => {
    const f = getFiltro(id_request)
    return stores.filter((s) => {
      if (f.canal !== FILTRO_TODOS && String(s.id_channel_sale) !== f.canal) return false
      if (f.estado !== FILTRO_TODOS && String(s.address?.id_state) !== f.estado) return false
      if (f.municipio !== FILTRO_TODOS && String(s.address?.id_city) !== f.municipio) return false
      return true
    })
  }

  // Agrega al pedido todas las tiendas que coinciden con el filtro actual, sin
  // perder tiendas ya elegidas con otro filtro anterior.
  const seleccionarTodasFiltradas = (id_request: number) => {
    const filtradas = getTiendasFiltradas(id_request).map((s) => s.id_store)
    setItems((prev) =>
      prev.map((item) =>
        item.id_request === id_request
          ? { ...item, storesSeleccionadas: Array.from(new Set([...item.storesSeleccionadas, ...filtradas])) }
          : item,
      ),
    )
  }

  const limpiarTiendas = (id_request: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id_request === id_request ? { ...item, storesSeleccionadas: [] } : item,
      ),
    )
  }

  // Agrega al pedido las tiendas cuyo ID viene marcado en el Excel importado,
  // sin perder las que ya estaban seleccionadas por otro medio.
  const seleccionarTiendasPorIds = (id_request: number, ids: number[]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id_request === id_request
          ? { ...item, storesSeleccionadas: Array.from(new Set([...item.storesSeleccionadas, ...ids])) }
          : item,
      ),
    )
  }

  const handleActualizarUbicaciones = async () => {
    setActualizandoUbicaciones(true)
    try {
      const res = await api.post<ApiResponse<{ total: number; sent: number }>>('/promoters/refresh-locations', {})
      if (res.ok) {
        toast.success(`Se avisó a ${res.data.sent} de ${res.data.total} promotor(es) activo(s)`)
      } else {
        toast.error(res.message || 'Error al avisar a los promotores')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error al avisar a los promotores')
    } finally {
      setActualizandoUbicaciones(false)
    }
  }

  const handleExportarExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      { 'Nombre de tienda': 'Ejemplo: Oxxo Cedeco' },
    ]
    const sheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Tiendas')
    XLSX.writeFile(workbook, `formato_tiendas.xlsx`)
    toast.success('Formato descargado. Escribe el nombre de cada tienda (borra el ejemplo) y vuelve a subirlo.')
  }

  const handleImportarExcel = async (id_request: number, file: File) => {
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const nombresBuscados = rows
        .map((row) => String(row['Nombre de tienda'] ?? '').trim())
        .filter((nombre) => nombre.length > 0 && !nombre.toLowerCase().startsWith('ejemplo'))

      if (nombresBuscados.length === 0) {
        toast.error('No se encontró ningún nombre de tienda en el archivo')
        return
      }

      const idsEncontrados: number[] = []
      const noEncontrados: string[] = []
      for (const nombre of nombresBuscados) {
        const match = stores.find((s) => s.name.trim().toLowerCase() === nombre.toLowerCase())
        if (match) idsEncontrados.push(match.id_store)
        else noEncontrados.push(nombre)
      }

      if (idsEncontrados.length > 0) {
        seleccionarTiendasPorIds(id_request, idsEncontrados)
        toast.success(`${idsEncontrados.length} tienda(s) agregada(s) desde el Excel`)
      }
      if (noEncontrados.length > 0) {
        toast.error(`No se encontró${noEncontrados.length === 1 ? '' : 'ron'}: ${noEncontrados.join(', ')}`)
      }
    } catch {
      toast.error('Error al leer el archivo. Verifica que sea el mismo formato exportado.')
    }
  }

  // --- Cálculos ---
  const calcularCostoItem = (item: RequestSeleccionada) => {
    const count = item.storesSeleccionadas.length
    if (count === 0) return 0
    return Number(item.f_value) * count
  }

  const granTotal = items.reduce((sum, item) => sum + calcularCostoItem(item), 0)
  const totalTiendas = items.reduce((sum, item) => sum + item.storesSeleccionadas.length, 0)
  // --- Saldo prepago ---
  const esPrepago = saldo?.vc_payment_mode === 'PREPAGO'
  const saldoActual = saldo ? Number(saldo.f_balance) : 0
  const saldoInsuficiente = esPrepago && granTotal > saldoActual + 0.0001
  const faltante = Math.max(0, granTotal - saldoActual)
  const puedeGuardar = !!selectedClientId && items.length > 0 && items.every((i) => i.storesSeleccionadas.length > 0) && !saldoInsuficiente

  // --- Guardar ---
  const handleGuardar = async () => {
    if (!selectedClientId) {
      toast.error('Selecciona un cliente.')
      return
    }
    if (items.length === 0) {
      toast.error('Agrega al menos una solicitud a la orden de visita.')
      return
    }
    const itemsSinTiendas = items.filter((i) => i.storesSeleccionadas.length === 0)
    if (itemsSinTiendas.length > 0) {
      setRequestAbierta(itemsSinTiendas[0].id_request)
      toast.error(
        `Hay ${itemsSinTiendas.length} solicitud(es) sin tiendas. Selecciona al menos una tienda para cada solicitud, o quítala del pedido.`,
        { duration: 5000 }
      )
      return
    }
    if (!user || !user.id_user) {
      toast.error('Error de sesión.')
      return
    }

    setGuardando(true)
    try {
      const payload = {
        id_user: user.id_user,
        id_client: selectedClientId,
        items: items
          .filter((item) => item.storesSeleccionadas.length > 0)
          .map((item) => ({
            id_request: item.id_request,
            stores: item.storesSeleccionadas,
          })),
      }

      const resp = await api.post<ApiResponse<OrderDTO>>('/orders', payload)

      if (!resp.ok) {
        toast.error(resp.message || 'Error al guardar la orden de visita.')
        return
      }

      toast.success(resp.message || 'Orden de visita creada exitosamente.')
      window.dispatchEvent(new Event('saldo:actualizar'))
      navigate('/pedidos')
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar la orden de visita.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Crear orden de visita"
        subtitle="Asigna tiendas a solicitudes para generar una orden de visita"
        icon={ClipboardList}
        actions={
          <Button
            variant="outline"
            onClick={handleActualizarUbicaciones}
            disabled={actualizandoUbicaciones}
          >
            {actualizandoUbicaciones ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <MapPin className="mr-2" size={16} />
            )}
            Actualizar ubicaciones de promotores
          </Button>
        }
      />

      {/* Selector de Cliente */}
      {isSuperAdmin && (
        <div className="mb-6 bg-muted/50 p-4 rounded-lg border border-border">
          <label className="block text-sm font-semibold text-foreground mb-2">Cliente:</label>
          {loadingClientes ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={16} />
              Cargando clientes...
            </div>
          ) : (
            <Select value={selectedClientId?.toString() || ''} onValueChange={handleClientChange}>
              <SelectTrigger className="w-full md:w-1/2 bg-white">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id_client} value={c.id_client.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {!selectedClientId ? (
        <div className="text-center py-12 text-muted-foreground">
          {isSuperAdmin ? 'Selecciona un cliente para continuar.' : 'Cargando información del cliente...'}
        </div>
      ) : loadingDatos ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-info" />
          <p className="text-sm text-muted-foreground">Cargando solicitudes y tiendas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ----- COLUMNA 1: RESUMEN (sticky, como en Solicitudes) ----- */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 order-first">
            <div className="bg-primary text-primary-foreground p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="font-bold text-lg">Resumen de la orden</h3>

              {items.length === 0 ? (
                <p className="text-sm text-primary-foreground/70">
                  Agrega solicitudes y asígnales tiendas para ver el costo de la orden.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {items.map((item) => {
                    const costo = calcularCostoItem(item)
                    const count = item.storesSeleccionadas.length
                    return (
                      <div key={item.id_request} className="flex justify-between gap-4">
                        <span className="text-primary-foreground/80 truncate" title={item.vc_name}>
                          {item.vc_name} ({count})
                        </span>
                        <span className="font-medium tabular-nums shrink-0">${costo.toFixed(2)}</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between gap-4 pt-2 border-t border-primary-foreground/20">
                    <span className="text-primary-foreground/70">Tiendas totales:</span>
                    <span className="font-medium">{totalTiendas}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-lg pt-2 border-t border-primary-foreground/20">
                    <span className="font-bold">Costo Total:</span>
                    <span className="font-bold tabular-nums">${granTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {esPrepago && (
                <div className="rounded-lg bg-primary-foreground/10 p-3 text-sm space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-primary-foreground/80">Tu saldo:</span>
                    <span className="font-medium tabular-nums">${saldoActual.toFixed(2)}</span>
                  </div>
                  {saldoInsuficiente ? (
                    <>
                      <p className="text-xs font-semibold">
                        Saldo insuficiente: te faltan ${faltante.toFixed(2)}. Quita tiendas o recarga tu saldo.
                      </p>
                      {user?.i_rol === 2 && (
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new Event('saldo:recargar'))}
                          className="underline text-xs font-semibold"
                        >
                          Recargar ahora
                        </button>
                      )}
                    </>
                  ) : (
                    items.length > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-primary-foreground/80">Saldo despues del pedido:</span>
                        <span className="font-medium tabular-nums">${(saldoActual - granTotal).toFixed(2)}</span>
                      </div>
                    )
                  )}
                </div>
              )}

              <Button
                onClick={handleGuardar}
                disabled={guardando || !puedeGuardar}
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 disabled:opacity-60 font-semibold py-3 h-auto text-base flex items-center justify-center gap-2"
              >
                {guardando && <Loader2 size={18} className="animate-spin" />}
                {guardando ? 'Guardando...' : 'Crear Pedido'}
              </Button>
              {items.length > 0 && !puedeGuardar && (
                <p className="text-xs text-primary-foreground/60 text-center">
                  Selecciona al menos una tienda para cada solicitud.
                </p>
              )}
            </div>
          </aside>

          {/* ----- COLUMNA 2: FORMULARIO ----- */}
          <div className="lg:col-span-2 space-y-8">
            {/* --- SECCIÓN 1: Solicitudes disponibles --- */}
            <div>
              <h3 className="text-lg font-bold text-foreground mb-3">1. Elige las solicitudes</h3>
              {requests.length === 0 ? (
                <p className="text-muted-foreground italic p-4 bg-muted/50 rounded">No hay solicitudes activas para este cliente.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {requests.map((req) => {
                    const yaAgregada = items.some((i) => i.id_request === req.id_request)
                    return (
                      <div
                        key={req.id_request}
                        className={`relative border-2 rounded-xl p-4 transition-all cursor-pointer ${
                          yaAgregada
                            ? 'border-success bg-success/10'
                            : 'border-border bg-white hover:border-info/30 hover:shadow-sm'
                        }`}
                        onClick={() => toggleRequest(req)}
                      >
                        {yaAgregada && (
                          <div className="absolute top-2 right-2 bg-success text-success-foreground rounded-full p-1">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                        <p className="font-semibold text-foreground pr-6">{req.vc_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valor: <span className="font-medium text-foreground">${Number(req.f_value).toFixed(2)} MXN</span>
                        </p>
                        <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${yaAgregada ? 'text-success' : 'text-info'}`}>
                          {yaAgregada ? (
                            <>
                              <X size={14} /> Quitar del pedido
                            </>
                          ) : (
                            <>
                              <Plus size={16} /> Agregar al pedido
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* --- SECCIÓN 2: Items del pedido --- */}
            {items.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">2. Elige a qué tiendas se manda cada solicitud</h3>
                <div className="space-y-4">
                  {items.map((item) => {
                    const abierta = requestAbierta === item.id_request
                    const costo = calcularCostoItem(item)
                    const count = item.storesSeleccionadas.length
                    const filtro = getFiltro(item.id_request)
                    const tiendasFiltradas = getTiendasFiltradas(item.id_request)

                    return (
                      <Card key={item.id_request} className="overflow-hidden border-border">
                        <CardHeader className="p-0">
                          <button
                            type="button"
                            onClick={() => setRequestAbierta(abierta ? null : item.id_request)}
                            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-accent transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-info/15 text-info rounded-lg p-2">
                                <ClipboardList size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{item.vc_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {count} tienda{count !== 1 ? 's' : ''} seleccionada
                                  {count !== 1 ? 's' : ''} · Subtotal:{' '}
                                  <span className="font-semibold text-foreground">${costo.toFixed(2)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">${Number(item.f_value).toFixed(2)} c/u</Badge>
                              {abierta ? <ChevronUp size={18} className="text-muted-foreground/70" /> : <ChevronDown size={18} className="text-muted-foreground/70" />}
                            </div>
                          </button>
                        </CardHeader>

                        {abierta && (
                          <CardContent className="p-4 space-y-4">
                            {/* Tiendas de la app (directorio compartido) vs Tiendas del cliente (se van formando solas conforme hace pedidos) */}
                            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit">
                              <button
                                type="button"
                                onClick={() => setStoreFilterMode('app')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${storeFilterMode === 'app' ? 'bg-white shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}
                              >
                                Tiendas de la app
                              </button>
                              <button
                                type="button"
                                onClick={() => setStoreFilterMode('mine')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${storeFilterMode === 'mine' ? 'bg-white shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}
                              >
                                Tiendas {clientName || 'tuyas'}
                              </button>
                            </div>

                            {storeFilterMode === 'mine' && stores.length === 0 ? (
                              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                                Por el momento no tienes ninguna tienda tuya. Haz tu primera orden de visita asignando tiendas de la app, y se irán asignando a tus tiendas.
                              </div>
                            ) : (
                              <>
                            {/* Filtro en cascada: Canal de venta -> Estado -> Municipio */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Canal de venta</label>
                                <Select value={filtro.canal} onValueChange={(v) => setFiltro(item.id_request, 'canal', v)}>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={FILTRO_TODOS}>Todos los canales</SelectItem>
                                    {canales.map(([id, name]) => (
                                      <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Estado</label>
                                <Select value={filtro.estado} onValueChange={(v) => setFiltro(item.id_request, 'estado', v)}>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={FILTRO_TODOS}>Todos los estados</SelectItem>
                                    {getEstados(filtro.canal).map(([id, name]) => (
                                      <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Municipio</label>
                                <Select value={filtro.municipio} onValueChange={(v) => setFiltro(item.id_request, 'municipio', v)}>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={FILTRO_TODOS}>Todos los municipios</SelectItem>
                                    {getMunicipios(filtro.canal, filtro.estado).map(([id, name]) => (
                                      <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Store size={16} className="text-muted-foreground/70" />
                                <span className="text-sm font-medium text-foreground">
                                  {tiendasFiltradas.length} tienda{tiendasFiltradas.length !== 1 ? 's' : ''} con este filtro
                                </span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={() => seleccionarTodasFiltradas(item.id_request)}>
                                  Seleccionar filtradas
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => limpiarTiendas(item.id_request)}>
                                  Limpiar todo
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExportarExcel()}>
                                  <Download size={14} className="mr-1" /> Exportar Excel
                                </Button>
                                <label>
                                  <Button variant="outline" size="sm" asChild>
                                    <span className="cursor-pointer">
                                      <Upload size={14} className="mr-1" /> Importar Excel
                                    </span>
                                  </Button>
                                  <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleImportarExcel(item.id_request, file)
                                      e.target.value = ''
                                    }}
                                  />
                                </label>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removerRequest(item.id_request)}>
                                  <Trash2 size={16} className="mr-1" /> Quitar
                                </Button>
                              </div>
                            </div>

                            {tiendasFiltradas.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No hay tiendas que coincidan con este filtro.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                                {tiendasFiltradas.map((store) => {
                                  const seleccionada = item.storesSeleccionadas.includes(store.id_store)
                                  return (
                                    <div
                                      key={store.id_store}
                                      onClick={() => toggleStore(item.id_request, store.id_store)}
                                      title={store.name}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                        seleccionada
                                          ? 'bg-info/10 border-info/30'
                                          : 'bg-white border-border hover:border-input'
                                      }`}
                                    >
                                      <Checkbox checked={seleccionada} className="pointer-events-none" />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${seleccionada ? 'text-info' : 'text-foreground'}`}>
                                          {store.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground/70 truncate">
                                          {store.address?.street || ''} {store.address?.ext_number || ''}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`shrink-0 gap-1 text-[11px] ${
                                          (store.i_active_promoters ?? 0) > 0
                                            ? 'border-success/40 text-success bg-success/10'
                                            : 'border-border text-muted-foreground/70'
                                        }`}
                                        title="Promotores activos en esta tienda ahora mismo"
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            (store.i_active_promoters ?? 0) > 0 ? 'bg-success' : 'bg-muted-foreground/40'
                                          }`}
                                        />
                                        {store.i_active_promoters ?? 0} activo{(store.i_active_promoters ?? 0) === 1 ? '' : 's'}
                                      </Badge>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
