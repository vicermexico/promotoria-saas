import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Loader2, Truck, Plus, Receipt, Clock, CheckCircle2 } from "lucide-react"

import { ModalGenerarComisionChofer } from "./components/ModalGenerarComisionChofer"
import { ModalRegistrarPagoChofer } from "./components/ModalRegistrarPagoChofer"
import { Button, DataTable, PageWrapper, PageHeader, StatCard, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components"
import {
  ActivatorPaymentStatusId,
  ACTIVATOR_PAYMENT_STATUS,
  ACTIVATOR_PAYMENT_STATUS_LABEL,
} from "@/Fetch/finanzas"
import { getAllDriverActivatorPayments, DriverActivatorPayment } from "@/Fetch/finanzasChoferes"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const STATUS_STYLE: Record<ActivatorPaymentStatusId, string> = {
  [ACTIVATOR_PAYMENT_STATUS.POR_PAGAR]: "bg-warning/20 text-warning-foreground dark:text-warning",
  [ACTIVATOR_PAYMENT_STATUS.PAGADO]: "bg-success/15 text-success",
  [ACTIVATOR_PAYMENT_STATUS.CANCELADO]: "bg-muted text-muted-foreground",
};

export default function FinanzasChoferes() {
  const [pagos, setPagos] = useState<DriverActivatorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoSel, setPagoSel] = useState<DriverActivatorPayment | null>(null);
  const [generarOpen, setGenerarOpen] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllDriverActivatorPayments({ limit: 100 });
      if (res.ok) setPagos(res.data.data);
    } catch {
      toast.error("Error al cargar las comisiones de choferes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pagosFiltrados = estadoFiltro === "todos" ? pagos : pagos.filter((p) => p.id_status === Number(estadoFiltro));

  const totalPorPagar = pagosFiltrados.filter((p) => p.id_status === ACTIVATOR_PAYMENT_STATUS.POR_PAGAR).reduce((a, p) => a + Number(p.f_total), 0);
  const totalPagado = pagosFiltrados.filter((p) => p.id_status === ACTIVATOR_PAYMENT_STATUS.PAGADO).reduce((a, p) => a + Number(p.f_total), 0);

  const columnas: ColumnDef<DriverActivatorPayment>[] = [
    { accessorKey: "vc_folio", header: "Folio", cell: ({ row }) => <span className="font-bold text-muted-foreground">{row.original.vc_folio ?? `#${row.original.id_payment}`}</span> },
    { id: "chofer", header: "Chofer", cell: ({ row }) => <span className="font-medium">{row.original.driver_name ?? `Chofer #${row.original.id_driver}`}</span> },
    { id: "periodo", header: "Periodo", cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDate(row.original.dt_start)} — {fmtDate(row.original.dt_end)}</span> },
    { accessorKey: "f_total", header: "Total", cell: ({ row }) => <span className="font-semibold text-foreground">{fmt(Number(row.original.f_total))}</span> },
    { accessorKey: "dt_payment", header: "Fecha de pago", cell: ({ row }) => fmtDate(row.original.dt_payment) },
    {
      accessorKey: "id_status", header: "Estado",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[row.original.id_status]}`}>
          {ACTIVATOR_PAYMENT_STATUS_LABEL[row.original.id_status]}
        </span>
      ),
    },
    {
      id: "actions", header: "Operaciones",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setPagoSel(row.original)} className="text-info border-info/30 hover:bg-info/10">
          <Receipt className="w-3 h-3 mr-1" /> Ver
        </Button>
      ),
    },
  ];

  if (loading && pagos.length === 0)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando comisiones...</span>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Pago a choferes"
        subtitle="Comisiones por promotores que invitaron los choferes"
        icon={Truck}
        actions={
          <Button onClick={() => setGenerarOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> Generar comisiones
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
        <StatCard title="Por pagar" value={fmt(totalPorPagar)} icon={Clock} accent="#dc2626" />
        <StatCard title="Pagado" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" />
      </div>

      <div className="flex items-center justify-end">
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value={String(ACTIVATOR_PAYMENT_STATUS.POR_PAGAR)}>Solo por pagar</SelectItem>
            <SelectItem value={String(ACTIVATOR_PAYMENT_STATUS.PAGADO)}>Solo pagado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable columns={columnas} data={pagosFiltrados} isLoading={loading} emptyMessage="No hay comisiones de choferes registradas." pagination={{ pageSize: 100 }} />
      </div>

      <ModalGenerarComisionChofer open={generarOpen} onClose={() => setGenerarOpen(false)} onSuccess={cargar} />
      <ModalRegistrarPagoChofer pago={pagoSel} open={pagoSel !== null} onClose={() => setPagoSel(null)} onSuccess={cargar} />
    </PageWrapper>
  );
}
