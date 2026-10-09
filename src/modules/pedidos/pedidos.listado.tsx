import { toast } from "sonner"
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Loader2, Receipt, Plus, Eye, Clock, Truck, CheckCircle2, PartyPopper } from 'lucide-react'

import { useAuthStore } from '@/stores'
import { ClientDTO, OderListDTO, OrderDTO } from '@/dtos'
import { api, ApiResponse, formatDate } from '@/lib'
import { Button, DataTable, RowActions, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, PageHeader, PageWrapper } from '@/components'

interface TaskStatusSummary {
  pendientes: number;
  en_progreso: number;
  completadas: number;
  finalizadas: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)

export function PedidosList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.i_rol === 1;

  const [pedidos, setPedidos] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClientDTO[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [statusSummary, setStatusSummary] = useState<TaskStatusSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClientes();
    } else {
      setSelectedClientId(user?.id_client || null);
    }
  }, [isSuperAdmin, user]);

  useEffect(() => {
    if (!selectedClientId) {
      setLoading(false);
      setPedidos([]);
      return;
    }
    fetchPedidos(selectedClientId);
    fetchStatusSummary(selectedClientId);
  }, [selectedClientId]);

  const fetchClientes = async () => {
    try {
      setLoadingClientes(true);
      const resp = await api.get<ApiResponse<ClientDTO[]>>('/clients');
      const list = resp.data || [];
      setClientes(list);
      if (list.length > 0) setSelectedClientId(list[0].id_client);
    } catch {
      toast.error("Error al cargar los clientes");
    } finally {
      setLoadingClientes(false);
    }
  };

  const fetchPedidos = async (clientId: number) => {
    try {
      setLoading(true);
      const resp = await api.get<ApiResponse<OderListDTO>>(`/orders/?id_client=${clientId}`);
      setPedidos(resp.data.data || []);
    } catch {
      toast.error("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusSummary = async (clientId: number) => {
    try {
      setLoadingSummary(true);
      const resp = await api.get<ApiResponse<TaskStatusSummary>>(`/tasks/status-summary?id_client=${clientId}`);
      setStatusSummary(resp.data);
    } catch {
      // Silencioso: si falla, simplemente no se muestran las tarjetas de resumen.
    } finally {
      setLoadingSummary(false);
    }
  };

  const columns: ColumnDef<OrderDTO>[] = [
    {
      accessorKey: "vc_folio",
      header: "Folio",
      cell: ({ row }) => {
        const folio = row.original.vc_folio;
        if (!folio) return <span className="text-muted-foreground/70 text-sm">—</span>;
        return <span className="font-bold text-foreground">{folio}</span>;
      },
    },
    {
      accessorKey: "id_order",
      header: "# Orden",
      cell: ({ row }) => (
        <span className="font-bold text-foreground">
          #{String(row.original.id_order).padStart(4, "0")}
        </span>
      ),
    },
    {
      id: "solicitudes",
      header: "Solicitudes",
      cell: ({ row }) => {
        const items = row.original.order_items ?? [];
        const unique = [...new Map(items.map(i => [i.id_request, i.request?.vc_name])).entries()];
        if (unique.length === 0) return <span className="text-muted-foreground/70 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {unique.slice(0, 2).map(([id, name]) => (
              <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                {name ?? `#${id}`}
              </span>
            ))}
            {unique.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                +{unique.length - 2} más
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "tiendas",
      header: "Tiendas",
      cell: ({ row }) => {
        const count = (row.original.order_items ?? []).length;
        return (
          <span className="bg-muted px-2.5 py-1 rounded-full text-sm font-medium text-foreground">
            {count} tienda{count !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "f_total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold text-success">
          {formatCurrency(Number(row.original.f_total))}
        </span>
      ),
    },
    {
      accessorKey: "dt_register",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.dt_register)}</span>
      ),
    },
    {
      accessorKey: "vc_tasks_status",
      header: "Estado",
      cell: ({ row }) => {
        const status = (row.original as any).vc_tasks_status as string | undefined ?? "Activo";
        const styles: Record<string, string> = {
          Activo: "bg-success/10 text-success",
          Finalizado: "bg-muted text-muted-foreground",
        };
        const dotStyles: Record<string, string> = {
          Activo: "bg-success",
          Finalizado: "bg-muted-foreground",
        };
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-full ${styles[status] ?? styles.Activo}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotStyles[status] ?? dotStyles.Activo}`} />
            {status}
          </span>
        );
      },
    },
    {
      id: "por_autorizar",
      header: "Por autorizar",
      cell: ({ row }) => {
        const count = row.original.i_pending_authorization ?? 0;
        if (count === 0) {
          return <span className="text-muted-foreground/50 text-sm">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warning/15 text-warning-foreground dark:text-warning text-sm font-bold rounded-full">
            <CheckCircle2 size={14} />
            {count}
          </span>
        );
      },
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
              onClick: () => navigate(`/detalle-pedido/${row.original.id_order}`),
            },
          ]}
        />
      ),
    },
  ];

  if (isSuperAdmin && loadingClientes) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando clientes...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Órdenes de visita"
        subtitle="Órdenes generadas que contienen tareas para los promotores"
        icon={Receipt}
        actions={
          <Button onClick={() => navigate("/crearPedido")} className="flex items-center gap-2">
            <Plus size={16} /> Crear Pedido
          </Button>
        }
      />

      {isSuperAdmin && clientes.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
          <label className="text-sm font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>Cliente:</label>
          <Select value={selectedClientId?.toString() ?? ""} onValueChange={(val) => setSelectedClientId(Number(val))}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id_client} value={c.id_client.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {statusSummary && !loadingSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Clock size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusSummary.pendientes}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center shrink-0">
              <Truck size={18} className="text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusSummary.en_progreso}</p>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-warning-foreground dark:text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusSummary.completadas}</p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <PartyPopper size={18} className="text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusSummary.finalizadas}</p>
              <p className="text-xs text-muted-foreground">Finalizadas</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable
          columns={columns}
          data={pedidos}
          isLoading={loading}
          emptyMessage="No hay pedidos registrados para este cliente."
          pagination={{ pageSize: 100 }}
          responsive={{ priorityColumns: ["vc_folio", "por_autorizar", "vc_tasks_status"] }}
        />
      </div>
    </PageWrapper>
  );
}
