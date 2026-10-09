import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Clock, AlertCircle, Loader2, Banknote, Settings, Plus, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react"

import { ModalRevisarCobro, ModalConfigFinanzas, ModalGenerarCorte } from "./components"
import { Button, DataTable, PageWrapper, PageHeader, StatCard, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components"
import { getCLientsList } from "@/Fetch/clientes"
import {
  getAllInvoices,
  ClientInvoice,
  InvoiceStatusId,
  INVOICE_STATUS,
  INVOICE_STATUS_LABEL,
  isInvoiceOverdue,
} from "@/Fetch/finanzas";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const STATUS_STYLE: Record<InvoiceStatusId, string> = {
  [INVOICE_STATUS.PENDIENTE_PAGO]: "bg-warning/20 text-warning-foreground dark:text-warning",
  [INVOICE_STATUS.EN_VALIDACION]: "bg-info/15 text-info",
  [INVOICE_STATUS.PAGADO]: "bg-success/15 text-success",
  [INVOICE_STATUS.OBSERVADO]: "bg-destructive/15 text-destructive",
  [INVOICE_STATUS.CANCELADO]: "bg-muted text-muted-foreground",
};

const BadgeInvoice = ({ invoice }: { invoice: ClientInvoice }) => {
  if (isInvoiceOverdue(invoice)) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive flex items-center gap-1 w-fit">
        <AlertTriangle className="w-3 h-3" /> Atrasada
      </span>
    );
  }
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[invoice.id_status]}`}>{INVOICE_STATUS_LABEL[invoice.id_status]}</span>;
};

interface ClienteOpcion {
  id_client: number;
  name: string;
}

export default function FinanzasSuperAdmin() {
  const [facturas, setFacturas] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<"todas" | "por_validar" | "vencidas" | "nos_deben" | "pagadas">("todas");

  const [cobroSel, setCobroSel] = useState<ClientInvoice | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [generarOpen, setGenerarOpen] = useState(false);

  useEffect(() => {
    getCLientsList()
      .then((res) => { if (res?.data) setClientes(res.data); })
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const filtro = clienteFiltro !== "todos" ? { id_client: Number(clienteFiltro) } : {};
      const res = await getAllInvoices({ limit: 100, ...filtro });
      if (res.ok) setFacturas(res.data.data);
    } catch {
      toast.error("Error al cargar las facturas");
    } finally {
      setLoading(false);
    }
  }, [clienteFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  // El filtro de cliente ya viene aplicado desde el servidor (arriba); el de
  // estado usa las mismas 4 categorias que las tarjetas de arriba (y son
  // excluyentes entre si: "Nos deben" no cuenta las que ya estan vencidas),
  // y de este arreglo final salen tanto la tabla como los 4 totales -- asi
  // los totales siempre reflejan exactamente lo que se esta viendo con los
  // filtros puestos.
  const esNosDeben = (f: ClientInvoice) =>
    (f.id_status === INVOICE_STATUS.PENDIENTE_PAGO || f.id_status === INVOICE_STATUS.OBSERVADO) && !isInvoiceOverdue(f);

  const facturasFiltradas = facturas.filter((f) => {
    if (estadoFiltro === "por_validar") return f.id_status === INVOICE_STATUS.EN_VALIDACION;
    if (estadoFiltro === "vencidas") return isInvoiceOverdue(f);
    if (estadoFiltro === "nos_deben") return esNosDeben(f);
    if (estadoFiltro === "pagadas") return f.id_status === INVOICE_STATUS.PAGADO;
    return true;
  });

  const totalPorCobrar = facturasFiltradas.filter(esNosDeben).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalEnValidacion = facturasFiltradas.filter((f) => f.id_status === INVOICE_STATUS.EN_VALIDACION).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalVencido = facturasFiltradas.filter(isInvoiceOverdue).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalPagado = facturasFiltradas.filter((f) => f.id_status === INVOICE_STATUS.PAGADO).reduce((a, f) => a + Number(f.f_amount), 0);

  const nombreCliente = (id_client: number) => clientes.find((c) => c.id_client === id_client)?.name ?? `Cliente #${id_client}`;

  const columnasFacturas: ColumnDef<ClientInvoice>[] = [
    { accessorKey: "id_status", header: "Estado", cell: ({ row }) => <BadgeInvoice invoice={row.original} /> },
    { id: "cliente", header: "Cliente", cell: ({ row }) => <span className="font-medium">{nombreCliente(row.original.charge.id_client)}</span> },
    { id: "pedido", header: "Orden", cell: ({ row }) => <span className="text-sm text-muted-foreground">#{row.original.id_order}</span> },
    { accessorKey: "f_amount", header: "Total", cell: ({ row }) => <span className="font-semibold text-foreground">{fmt(Number(row.original.f_amount))}</span> },
    { accessorKey: "dt_register", header: "Emitida", cell: ({ row }) => fmtDate(row.original.dt_register) },
    {
      accessorKey: "dt_due", header: "Vence",
      cell: ({ row }) => {
        const vencida = isInvoiceOverdue(row.original);
        return <span className={vencida ? "text-destructive font-semibold" : ""}>{fmtDate(row.original.dt_due)}</span>;
      },
    },
    {
      id: "actions", header: "Operaciones",
      cell: ({ row }) => {
        const f = row.original;
        if (f.id_status !== INVOICE_STATUS.EN_VALIDACION) return <span className="text-xs text-muted-foreground/70">—</span>;
        return (
          <Button size="sm" variant="outline" onClick={() => setCobroSel(f)} className="text-info border-info/30 hover:bg-info/10">
            <Receipt className="w-3 h-3 mr-1" /> Revisar
          </Button>
        );
      },
    },
    { accessorKey: "vc_folio", header: "Folio", cell: ({ row }) => <span className="font-bold text-muted-foreground">{row.original.vc_folio ?? `#${row.original.id}`}</span> },
  ];

  if (loading && facturas.length === 0)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando finanzas...</span>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Cobro a clientes"
        subtitle="Gestión de cobros a clientes"
        icon={Banknote}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setConfigOpen(true)} className="flex items-center gap-2">
              <Settings size={16} /> Configuración
            </Button>
            <Button onClick={() => setGenerarOpen(true)} className="flex items-center gap-2">
              <Plus size={16} /> Generar corte
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Por validar" value={fmt(totalEnValidacion)} icon={Clock} accent="#2563eb" />
        <StatCard title="Vencidas" value={fmt(totalVencido)} icon={AlertTriangle} accent="#b91c1c" />
        <StatCard title="Nos deben" value={fmt(totalPorCobrar)} icon={AlertCircle} accent="#dc2626" />
        <StatCard title="Pagadas" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" />
      </div>

      <div className="flex items-center justify-end flex-wrap gap-3">
        <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as typeof estadoFiltro)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            <SelectItem value="por_validar">Por validar</SelectItem>
            <SelectItem value="vencidas">Vencidas</SelectItem>
            <SelectItem value="nos_deben">Nos deben</SelectItem>
            <SelectItem value="pagadas">Pagadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id_client} value={String(c.id_client)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <DataTable columns={columnasFacturas} data={facturasFiltradas} isLoading={loading} emptyMessage="No hay facturas registradas." pagination={{ pageSize: 100 }} />
      </div>

      <ModalRevisarCobro cobro={cobroSel} open={cobroSel !== null} onClose={() => setCobroSel(null)} onSuccess={cargar} />
      <ModalConfigFinanzas open={configOpen} onClose={() => setConfigOpen(false)} />
      <ModalGenerarCorte open={generarOpen} onClose={() => setGenerarOpen(false)} onSuccess={cargar} />
    </PageWrapper>
  );
}
