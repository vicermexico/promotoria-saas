import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { CheckSquare2, Eye, Loader2, X } from "lucide-react"

import { useAuthStore } from "@/stores"
import { ClientDTO, TaskDTO, OrderDTO, RequestDTO } from "@/dtos"
import { api, ApiResponse, formatDate } from "@/lib"
import {
  Button, DataTable, Input, PageHeader, PageWrapper, RowActions,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components"
import { getTaskStatus, TASK_STATUS_OPTIONS } from "./utils"

const ALL_VALUE = "all"

export function TareasListado() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const isSuperAdmin = user?.i_rol === 1

  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [clientes, setClientes] = useState<ClientDTO[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  const [orders, setOrders] = useState<OrderDTO[]>([])
  const [requests, setRequests] = useState<RequestDTO[]>([])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE)
  const [orderFilter, setOrderFilter] = useState(ALL_VALUE)
  const [requestFilter, setRequestFilter] = useState(ALL_VALUE)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClientes()
    } else {
      setSelectedClientId(user?.id_client || null)
    }
  }, [isSuperAdmin, user])

  // Al cambiar de cliente, recarga los combos de pedido/solicitud y resetea filtros dependientes
  useEffect(() => {
    if (!selectedClientId) {
      setOrders([])
      setRequests([])
      return
    }
    fetchFilterOptions(selectedClientId)
  }, [selectedClientId])

  useEffect(() => {
    if (!selectedClientId) {
      setLoading(false)
      setTasks([])
      return
    }
    fetchTasks(selectedClientId, page, pageSize)
  }, [selectedClientId, page, pageSize, statusFilter, orderFilter, requestFilter, dateFrom, dateTo])

  const fetchClientes = async () => {
    try {
      setLoadingClientes(true)
      const resp = await api.get<ApiResponse<ClientDTO[]>>("/clients")
      const list = resp.data || []
      setClientes(list)
      if (list.length > 0) setSelectedClientId(list[0].id_client)
    } catch {
      toast.error("Error al cargar los clientes")
    } finally {
      setLoadingClientes(false)
    }
  }

  const fetchFilterOptions = async (clientId: number) => {
    try {
      const [ordersResp, requestsResp] = await Promise.all([
        api.get<ApiResponse<{ data: OrderDTO[] }>>(`/orders/?id_client=${clientId}&limit=200`),
        api.get<ApiResponse<{ data: RequestDTO[] }>>(`/requests?id_client=${clientId}&limit=200`),
      ])
      setOrders(ordersResp.data?.data || [])
      setRequests(requestsResp.data?.data || [])
    } catch {
      // Los combos de pedido/solicitud son un extra; si fallan no bloqueamos el listado.
      setOrders([])
      setRequests([])
    }
  }

  const fetchTasks = async (clientId: number, pageArg: number, limitArg: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        id_client: String(clientId),
        page: String(pageArg),
        limit: String(limitArg),
      })
      if (statusFilter !== ALL_VALUE) params.set("id_status", statusFilter)
      if (orderFilter !== ALL_VALUE) params.set("id_order", orderFilter)
      if (requestFilter !== ALL_VALUE) params.set("id_request", requestFilter)
      if (dateFrom) params.set("dt_from", dateFrom)
      if (dateTo) params.set("dt_to", dateTo)

      const resp = await api.get<ApiResponse<{ data: TaskDTO[]; meta: typeof meta }>>(`/tasks?${params.toString()}`)
      setTasks(resp.data?.data || [])
      setMeta(resp.data?.meta || { total: 0, page: pageArg, limit: limitArg, totalPages: 0 })
    } catch {
      toast.error("Error al cargar las tareas")
    } finally {
      setLoading(false)
    }
  }

  const resetToFirstPage = () => setPage(1)

  const handleClearFilters = () => {
    setStatusFilter(ALL_VALUE)
    setOrderFilter(ALL_VALUE)
    setRequestFilter(ALL_VALUE)
    setDateFrom("")
    setDateTo("")
    resetToFirstPage()
  }

  const hasActiveFilters =
    statusFilter !== ALL_VALUE || orderFilter !== ALL_VALUE || requestFilter !== ALL_VALUE || dateFrom !== "" || dateTo !== ""

  const columns: ColumnDef<TaskDTO>[] = [
    {
      accessorKey: "vc_folio",
      header: "Folio",
      cell: ({ row }) => {
        const folio = row.getValue<string | null>("vc_folio")
        return folio ? (
          <span className="font-bold text-foreground">{folio}</span>
        ) : (
          <span className="text-muted-foreground/70 text-sm">—</span>
        )
      },
    },
    {
      accessorKey: "id_task",
      header: "# Tarea",
      cell: ({ row }) => (
        <span className="font-bold text-foreground">
          #{String(row.getValue<number>("id_task")).padStart(4, "0")}
        </span>
      ),
    },
    {
      id: "establecimiento",
      header: "Establecimiento",
      cell: ({ row }) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {row.original.store?.name ?? `#${row.original.id_store}`}
        </span>
      ),
    },
    {
      id: "solicitud",
      header: "Solicitud",
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {row.original.request?.vc_name ?? `#${row.original.id_request}`}
        </span>
      ),
    },
    {
      accessorKey: "id_order",
      header: "Orden de visita",
      cell: ({ row }) => (
        <button
          className="font-medium text-info hover:underline"
          onClick={() => navigate(`/detalle-pedido/${row.getValue("id_order")}`)}
        >
          #{String(row.getValue<number>("id_order")).padStart(4, "0")}
        </button>
      ),
    },
    {
      id: "promotor",
      header: "Promotor",
      cell: ({ row }) => {
        const p = row.original.promoter
        return p ? (
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {p.name} {p.lastname}
          </span>
        ) : (
          <span className="text-xs italic text-destructive font-medium">Sin asignar</span>
        )
      },
    },
    {
      accessorKey: "id_status",
      header: "Estado",
      cell: ({ row }) => {
        const s = getTaskStatus(row.getValue<number>("id_status"))
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        )
      },
    },
    {
      accessorKey: "dt_register",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {formatDate(row.getValue("dt_register"))}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Operaciones",
      cell: ({ row }) => (
        <RowActions
          actions={[
            {
              icon: Eye,
              label: "Ver detalle",
              onClick: () => navigate(`/tareas/${row.original.id_task}`),
            },
          ]}
        />
      ),
    },
  ]

  if (isSuperAdmin && loadingClientes) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando clientes...</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Visitas"
        subtitle="Seguimiento de visitas asignadas a los promotores"
        icon={CheckSquare2}
      />

      {isSuperAdmin && clientes.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
          <label className="text-sm font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>Cliente:</label>
          <Select
            value={selectedClientId?.toString() ?? ""}
            onValueChange={(v) => {
              setSelectedClientId(Number(v))
              handleClearFilters()
            }}
          >
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id_client} value={c.id_client.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Estado</label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetToFirstPage() }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {TASK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Orden de visita</label>
          <Select value={orderFilter} onValueChange={(v) => { setOrderFilter(v); resetToFirstPage() }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {orders.map((o) => (
                <SelectItem key={o.id_order} value={String(o.id_order)}>
                  {o.vc_folio || `#${String(o.id_order).padStart(4, "0")}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Solicitud</label>
          <Select value={requestFilter} onValueChange={(v) => { setRequestFilter(v); resetToFirstPage() }}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas</SelectItem>
              {requests.map((r) => (
                <SelectItem key={r.id_request} value={String(r.id_request)}>{r.vc_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Desde</label>
          <Input
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetToFirstPage() }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Hasta</label>
          <Input
            type="date"
            className="w-40"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetToFirstPage() }}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1.5">
            <X size={14} /> Limpiar filtros
          </Button>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable
          key={`${selectedClientId}-${statusFilter}-${orderFilter}-${requestFilter}-${dateFrom}-${dateTo}`}
          columns={columns}
          data={tasks}
          isLoading={loading}
          emptyMessage="No hay tareas registradas para este cliente."
          pagination={{
            mode: "server",
            pageSize,
            pageSizeOptions: [10, 20, 50, 100],
            totalRows: meta.total,
            onPageChange: (pageIndex, newPageSize) => {
              setPage(pageIndex + 1)
              setPageSize(newPageSize)
            },
            showPageSizeSelector: true,
            showSelectedCount: true,
            showPageNavigation: true,
          }}
        />
      </div>
    </PageWrapper>
  )
}
