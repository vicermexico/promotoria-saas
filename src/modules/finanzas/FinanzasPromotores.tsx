import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Loader2, Users, Plus, Receipt, Clock, CheckCircle2 } from "lucide-react"

import { ModalGenerarPagoPromotor, ModalRegistrarPagoPromotor } from "./components"
import { Button, DataTable, PageWrapper, PageHeader, StatCard, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Input } from "@/components"
import {
  getAllPromoterPayments,
  PromoterPayment,
  PromoterPaymentStatusId,
  PROMOTER_PAYMENT_STATUS,
  PROMOTER_PAYMENT_STATUS_LABEL,
} from "@/Fetch/finanzas";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const STATUS_STYLE: Record<PromoterPaymentStatusId, string> = {
  [PROMOTER_PAYMENT_STATUS.POR_PAGAR]: "bg-warning/20 text-warning-foreground dark:text-warning",
  [PROMOTER_PAYMENT_STATUS.PAGADO]: "bg-success/15 text-success",
  [PROMOTER_PAYMENT_STATUS.CANCELADO]: "bg-muted text-muted-foreground",
};

const BadgePromotor = ({ pago }: { pago: PromoterPayment }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[pago.id_status]}`}>{PROMOTER_PAYMENT_STATUS_LABEL[pago.id_status]}</span>
);

export default function FinanzasPromotores() {
  const [pagos, setPagos] = useState<PromoterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoSel, setPagoSel] = useState<PromoterPayment | null>(null);
  const [generarOpen, setGenerarOpen] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllPromoterPayments({ limit: 100 });
      if (res.ok) setPagos(res.data.data);
    } catch {
      toast.error("Error al cargar los pagos a promotores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const nombrePromotor = (p: PromoterPayment) =>
    p.promoter ? `${p.promoter.name} ${p.promoter.lastname ?? ""}`.trim() : `Promotor #${p.id_promoter}`;

  const pagosFiltrados = pagos
    .filter((p) => estadoFiltro === "todos" || p.id_status === Number(estadoFiltro))
    .filter((p) => {
      if (!busqueda.trim()) return true;
      const q = busqueda.trim().toLowerCase();
      return (
        nombrePromotor(p).toLowerCase().includes(q) ||
        (p.promoter?.phone ?? "").includes(q) ||
        String(p.id_promoter).includes(q) ||
        (p.vc_folio ?? "").toLowerCase().includes(q)
      );
    });

  const totalPorPagar = pagosFiltrados.filter((p) => p.id_status === PROMOTER_PAYMENT_STATUS.POR_PAGAR).reduce((a, p) => a + Number(p.f_total), 0);
  const totalPagado = pagosFiltrados.filter((p) => p.id_status === PROMOTER_PAYMENT_STATUS.PAGADO).reduce((a, p) => a + Number(p.f_total), 0);

  const columnas: ColumnDef<PromoterPayment>[] = [
    { accessorKey: "vc_folio", header: "Folio", cell: ({ row }) => <span className="font-bold text-muted-foreground">{row.original.vc_folio ?? `#${row.original.id_payment}`}</span> },
    {
      id: "promotor", header: "Promotor",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{nombrePromotor(row.original)}</span>
          {row.original.promoter?.phone && (
            <span className="text-xs text-muted-foreground">{row.original.promoter.phone}</span>
          )}
        </div>
      ),
    },
    { id: "periodo", header: "Periodo", cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDate(row.original.dt_start)} — {fmtDate(row.original.dt_end)}</span> },
    { accessorKey: "f_total", header: "Total", cell: ({ row }) => <span className="font-semibold text-foreground">{fmt(Number(row.original.f_total))}</span> },
    { accessorKey: "dt_payment", header: "Fecha de pago", cell: ({ row }) => fmtDate(row.original.dt_payment) },
    { accessorKey: "id_status", header: "Estado", cell: ({ row }) => <BadgePromotor pago={row.original} /> },
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
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando pagos...</span>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Pago a promotores"
        subtitle="Comisiones por tareas terminadas"
        icon={Users}
        actions={
          <Button onClick={() => setGenerarOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> Generar pagos
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
        <StatCard title="Por pagar" value={fmt(totalPorPagar)} icon={Clock} accent="#dc2626" />
        <StatCard title="Pagado" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Input
          placeholder="Buscar por nombre, teléfono o folio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-[280px]"
        />
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Por pagar y pagado</SelectItem>
            <SelectItem value={String(PROMOTER_PAYMENT_STATUS.POR_PAGAR)}>Solo por pagar</SelectItem>
            <SelectItem value={String(PROMOTER_PAYMENT_STATUS.PAGADO)}>Solo pagado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable columns={columnas} data={pagosFiltrados} isLoading={loading} emptyMessage="No hay pagos a promotores registrados." pagination={{ pageSize: 100 }} />
      </div>

      <ModalGenerarPagoPromotor open={generarOpen} onClose={() => setGenerarOpen(false)} onSuccess={cargar} />
      <ModalRegistrarPagoPromotor pago={pagoSel} open={pagoSel !== null} onClose={() => setPagoSel(null)} onSuccess={cargar} />
    </PageWrapper>
  );
}
