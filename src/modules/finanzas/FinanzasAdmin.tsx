import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Loader2, CheckCircle2, Clock, Banknote, Upload, AlertCircle, AlertTriangle, PackageSearch, Eye } from "lucide-react"

import { Button, DataTable, PageHeader, PageWrapper, StatCard } from "@/components"
import {
  getMyInvoices,
  getPendingOrders,
  ClientInvoice,
  PendingOrderItem,
  InvoiceStatusId,
  INVOICE_STATUS,
  INVOICE_STATUS_LABEL,
  isInvoiceOverdue,
} from "@/Fetch/finanzas"
import { ModalPagarCobro } from "./components/ModalPagarCobro"
import { ModalDetalleFactura } from "./components/ModalDetalleFactura"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const fmtFechaLarga = (d: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

const fmtPeriodo = (inicio: string, fin: string) =>
  `Del ${fmtFechaLarga(inicio)} al ${fmtFechaLarga(fin)}`;

const STATUS_STYLE: Record<InvoiceStatusId, string> = {
  [INVOICE_STATUS.PENDIENTE_PAGO]: "bg-warning/20 text-warning-foreground dark:text-warning",
  [INVOICE_STATUS.EN_VALIDACION]: "bg-info/15 text-info",
  [INVOICE_STATUS.PAGADO]: "bg-success/15 text-success",
  [INVOICE_STATUS.OBSERVADO]: "bg-destructive/15 text-destructive",
  [INVOICE_STATUS.CANCELADO]: "bg-muted text-muted-foreground",
};

const BadgeStatus = ({ invoice }: { invoice: ClientInvoice }) => {
  if (isInvoiceOverdue(invoice)) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive flex items-center gap-1 w-fit">
        <AlertTriangle className="w-3 h-3" />
        Atrasada
      </span>
    );
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[invoice.id_status]}`}>
      {INVOICE_STATUS_LABEL[invoice.id_status]}
    </span>
  );
};

// Estatus en los que el cliente puede (re)enviar comprobante.
const PUEDE_PAGAR: InvoiceStatusId[] = [INVOICE_STATUS.PENDIENTE_PAGO, INVOICE_STATUS.OBSERVADO];

type FiltroVista = "todas" | "vencidas";

export function FinanzasAdmin() {
  const [facturas, setFacturas] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [facturaSel, setFacturaSel] = useState<ClientInvoice | null>(null);
  const [facturaVer, setFacturaVer] = useState<ClientInvoice | null>(null);
  const [filtro, setFiltro] = useState<FiltroVista>("todas");

  const [pendientes, setPendientes] = useState<PendingOrderItem[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    getMyInvoices(filtro === "vencidas" ? { b_overdue: true } : undefined)
      .then((res) => { if (res.ok) setFacturas(res.data.data); })
      .catch(() => toast.error("Error al cargar tus facturas"))
      .finally(() => setLoading(false));
  }, [filtro]);

  const cargarPendientes = useCallback(() => {
    setLoadingPendientes(true);
    getPendingOrders()
      .then((res) => { if (res.ok) setPendientes(res.data); })
      .catch(() => toast.error("Error al cargar las órdenes por facturar"))
      .finally(() => setLoadingPendientes(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarPendientes(); }, [cargarPendientes]);

  const totalPorFacturar = pendientes.reduce((a, p) => a + Number(p.f_amount), 0);
  const totalAdeudado = facturas
    .filter((f) => f.id_status === INVOICE_STATUS.PENDIENTE_PAGO || f.id_status === INVOICE_STATUS.OBSERVADO)
    .reduce((a, f) => a + Number(f.f_amount), 0);
  const totalValidacion = facturas.filter((f) => f.id_status === INVOICE_STATUS.EN_VALIDACION).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalPagado = facturas.filter((f) => f.id_status === INVOICE_STATUS.PAGADO).reduce((a, f) => a + Number(f.f_amount), 0);

  const columns: ColumnDef<ClientInvoice>[] = [
    {
      accessorKey: "vc_folio",
      header: "Folio",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setFacturaVer(row.original)}
          className="font-bold text-foreground hover:text-info hover:underline text-left"
        >
          {row.original.vc_folio ?? `#${row.original.id}`}
        </button>
      ),
    },
    {
      id: "pedido",
      header: "Orden de visita",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setFacturaVer(row.original)}
          className="text-sm hover:text-info hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          #{row.original.id_order}
        </button>
      ),
    },
    {
      accessorKey: "f_amount",
      header: "Total",
      cell: ({ row }) => <span className="font-semibold">{fmt(Number(row.original.f_amount))}</span>,
    },
    {
      id: "periodo",
      header: "Periodo de corte",
      cell: ({ row }) => (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {fmtPeriodo(row.original.charge.dt_start, row.original.charge.dt_end)}
        </span>
      ),
    },
    {
      accessorKey: "dt_due",
      header: "Vence",
      cell: ({ row }) => {
        const vencida = isInvoiceOverdue(row.original);
        return (
          <span className={vencida ? "text-destructive font-semibold" : ""}>
            {fmtDate(row.original.dt_due)}
          </span>
        );
      },
    },
    {
      accessorKey: "id_status",
      header: "Estado",
      cell: ({ row }) => <BadgeStatus invoice={row.original} />,
    },
    {
      id: "actions",
      header: "Operaciones",
      cell: ({ row }) => {
        const f = row.original;
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setFacturaVer(f)}>
              <Eye className="w-3 h-3 mr-1" />
              Ver
            </Button>
            {PUEDE_PAGAR.includes(f.id_status) && (
              <Button size="sm" variant="outline" onClick={() => setFacturaSel(f)} className="text-info border-info/30 hover:bg-info/10">
                <Upload className="w-3 h-3 mr-1" />
                Pagar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const columnsPendientes: ColumnDef<PendingOrderItem>[] = [
    {
      id: "pedido",
      header: "Orden de visita",
      cell: ({ row }) => <span className="font-bold text-foreground">#{row.original.id_order}</span>,
    },
    {
      id: "tareas",
      header: "Tiendas visitadas",
      cell: ({ row }) => <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{row.original.task_count}</span>,
    },
    {
      id: "monto",
      header: "Monto estimado",
      cell: ({ row }) => <span className="font-semibold">{fmt(Number(row.original.f_amount))}</span>,
    },
  ];

  if (loading)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando tus facturas...</span>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Gestión de pagos"
        subtitle="Tus facturas por orden de visita: lo que debes, lo que está en validación y lo que ya pagaste"
        icon={Banknote}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Próximas órdenes a facturar" value={fmt(totalPorFacturar)} icon={PackageSearch} accent="#7c3aed" wrapTitle />
        <StatCard title="Factura en validación" value={fmt(totalValidacion)} icon={Clock} accent="#2563eb" wrapTitle />
        <StatCard title="Factura por pagar" value={fmt(totalAdeudado)} icon={AlertCircle} accent="#dc2626" wrapTitle />
        <StatCard title="Facturas Pagadas" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" wrapTitle />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Órdenes de visita por facturar (aún no están en ningún corte)</h3>
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
          <DataTable
            columns={columnsPendientes}
            data={pendientes}
            isLoading={loadingPendientes}
            emptyMessage="No tienes órdenes de visita pendientes de facturar por ahora."
            pagination={{ pageSize: 5 }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filtro === "todas" ? "default" : "outline"}
          onClick={() => setFiltro("todas")}
        >
          Todas
        </Button>
        <Button
          size="sm"
          variant={filtro === "vencidas" ? "default" : "outline"}
          onClick={() => setFiltro("vencidas")}
          className={filtro === "vencidas" ? "bg-destructive hover:bg-destructive/90" : "text-destructive border-destructive/30 hover:bg-destructive/10"}
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vencidas
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable
          columns={columns}
          data={facturas}
          isLoading={false}
          emptyMessage={filtro === "vencidas" ? "No tienes facturas vencidas." : "No tienes facturas registradas aún."}
          pagination={{ pageSize: 100 }}
        />
      </div>

      <ModalPagarCobro
        cobro={facturaSel}
        open={facturaSel !== null}
        onClose={() => setFacturaSel(null)}
        onSuccess={cargar}
      />

      <ModalDetalleFactura
        factura={facturaVer}
        open={facturaVer !== null}
        onClose={() => setFacturaVer(null)}
      />
    </PageWrapper>
  );
}
