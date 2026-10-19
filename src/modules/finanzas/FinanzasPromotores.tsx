import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Loader2, Users, Plus, Receipt, Clock, CheckCircle2, Wallet } from "lucide-react"

import { ModalCortePromotor } from "./components/ModalCortePromotor"
import { ModalRegistrarPagoPromotor } from "./components/ModalRegistrarPagoPromotor"
import { Button, DataTable, PageWrapper, PageHeader, StatCard } from "@/components"
import {
  getAllPromoterPayments,
  getPendingPromoterPayments,
  PromoterPayment,
  PendingPromoterPayments,
  PromoterPaymentStatusId,
  PROMOTER_PAYMENT_STATUS,
  PROMOTER_PAYMENT_STATUS_LABEL,
} from "@/Fetch/finanzas"

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const STATUS_STYLE: Record<PromoterPaymentStatusId, string> = {
  [PROMOTER_PAYMENT_STATUS.POR_PAGAR]: "bg-warning/20 text-warning-foreground dark:text-warning",
  [PROMOTER_PAYMENT_STATUS.PAGADO]: "bg-success/15 text-success",
  [PROMOTER_PAYMENT_STATUS.CANCELADO]: "bg-muted text-muted-foreground",
};

export default function FinanzasPromotores() {
  const [pagos, setPagos] = useState<PromoterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoSel, setPagoSel] = useState<PromoterPayment | null>(null);
  const [pendientes, setPendientes] = useState<PendingPromoterPayments>({ total: 0, promoters: [] });
  const [promotorCorte, setPromotorCorte] = useState<PendingPromoterPayments["promoters"][number] | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [res, pend] = await Promise.all([
        getAllPromoterPayments({ limit: 100 }),
        getPendingPromoterPayments().catch(() => null),
      ]);
      if (res.ok) setPagos(res.data.data);
      if (pend?.ok) setPendientes(pend.data);
    } catch {
      toast.error("Error al cargar los pagos a promotores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const porPagar = pagos.filter((p) => p.id_status === PROMOTER_PAYMENT_STATUS.POR_PAGAR);
  const historial = pagos.filter((p) => p.id_status !== PROMOTER_PAYMENT_STATUS.POR_PAGAR);

  const enCortes = porPagar.reduce((a, p) => a + Number(p.f_total), 0);
  const totalPorPagar = enCortes + pendientes.total;
  const totalPagado = pagos.filter((p) => p.id_status === PROMOTER_PAYMENT_STATUS.PAGADO).reduce((a, p) => a + Number(p.f_total), 0);

  const columnasBase: ColumnDef<PromoterPayment>[] = [
    { accessorKey: "vc_folio", header: "Folio", cell: ({ row }) => <span className="font-bold text-muted-foreground">{row.original.vc_folio ?? `#${row.original.id_payment}`}</span> },
    { id: "promotor", header: "Promotor", cell: ({ row }) => <span className="font-medium">{row.original.promoter_name ?? `Promotor #${row.original.id_promoter}`}</span> },
    { id: "periodo", header: "Periodo", cell: ({ row }) => <span className="text-sm text-muted-foreground">{fmtDate(row.original.dt_start)} — {fmtDate(row.original.dt_end)}</span> },
    { accessorKey: "f_total", header: "Total", cell: ({ row }) => <span className="font-semibold text-foreground">{fmt(Number(row.original.f_total))}</span> },
  ];

  const columnasPorPagar: ColumnDef<PromoterPayment>[] = [
    ...columnasBase,
    {
      id: "actions", header: "Operaciones",
      cell: ({ row }) => (
        <Button size="sm" onClick={() => setPagoSel(row.original)} className="bg-success hover:bg-success/90 text-white">
          <Wallet className="w-3 h-3 mr-1" /> Pagar
        </Button>
      ),
    },
  ];

  const columnasHistorial: ColumnDef<PromoterPayment>[] = [
    ...columnasBase,
    { accessorKey: "dt_payment", header: "Fecha de pago", cell: ({ row }) => fmtDate(row.original.dt_payment) },
    {
      accessorKey: "id_status", header: "Estado",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[row.original.id_status]}`}>
          {PROMOTER_PAYMENT_STATUS_LABEL[row.original.id_status]}
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

  const caja = { backgroundColor: "var(--card-bg)", borderColor: "var(--border)" };

  return (
    <PageWrapper>
      <PageHeader
        title="Pago a promotores"
        subtitle="Comisiones por tareas terminadas"
        icon={Users}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
        <StatCard title={`Por pagar (sin corte ${fmt(pendientes.total)} · en cortes ${fmt(enCortes)})`} value={fmt(totalPorPagar)} icon={Clock} accent="#dc2626" />
        <StatCard title="Pagado" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" />
      </div>

      <div className="rounded-xl border overflow-hidden" style={caja}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold text-foreground">1. Lo que se debe a cada promotor (aún sin corte)</p>
          <p className="text-xs text-muted-foreground">Tareas terminadas y autorizadas por el cliente. Genera el corte para pasarlo a la lista de abajo.</p>
        </div>
        {pendientes.promoters.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">No hay comisiones pendientes de corte.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Promotor</th>
                <th className="px-4 py-2 font-medium">Tareas</th>
                <th className="px-4 py-2 font-medium">Se le debe</th>
                <th className="px-4 py-2 font-medium">Cuenta</th>
                <th className="px-4 py-2 font-medium">Operaciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.promoters.map((d) => (
                <tr key={d.id_promoter} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2 font-medium">{d.name}{d.phone ? <span className="text-muted-foreground font-normal"> · {d.phone}</span> : null}</td>
                  <td className="px-4 py-2">{d.tasks}</td>
                  <td className="px-4 py-2 font-semibold">{fmt(d.f_total)}</td>
                  <td className="px-4 py-2">{d.has_account ? <span className="text-success">Registrada</span> : <span className="text-warning">Sin cuenta</span>}</td>
                  <td className="px-4 py-2">
                    <Button size="sm" onClick={() => setPromotorCorte(d)}>
                      <Plus className="w-3 h-3 mr-1" /> Generar corte
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={caja}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold text-foreground">2. Cortes por pagar</p>
          <p className="text-xs text-muted-foreground">Cortes ya hechos que falta depositar. Al pagar y subir el comprobante pasan a la lista de pagados.</p>
        </div>
        <DataTable columns={columnasPorPagar} data={porPagar} isLoading={loading} emptyMessage="No hay cortes por pagar." pagination={{ pageSize: 100 }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={caja}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold text-foreground">3. Cortes pagados</p>
        </div>
        <DataTable columns={columnasHistorial} data={historial} isLoading={loading} emptyMessage="Todavía no hay cortes pagados." pagination={{ pageSize: 100 }} />
      </div>

      <ModalCortePromotor
        promotor={promotorCorte}
        onClose={() => setPromotorCorte(null)}
        onGenerated={async (p) => {
          await cargar();
          if (p) setPagoSel(p);
        }}
      />
      <ModalRegistrarPagoPromotor pago={pagoSel} open={pagoSel !== null} onClose={() => setPagoSel(null)} onSuccess={cargar} />
    </PageWrapper>
  );
}
