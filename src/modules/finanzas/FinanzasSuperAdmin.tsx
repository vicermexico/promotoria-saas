import { toast } from "sonner"
import { useEffect, useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Clock, AlertCircle, Loader2, Banknote, Plus, Receipt, AlertTriangle, CheckCircle2, FileText } from "lucide-react"

import { ModalRevisarCobro } from "./components"
import { ModalCorteCliente } from "./components/ModalCorteCliente"
import { Button, DataTable, PageWrapper, PageHeader, StatCard, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components"
import { getCLientsList } from "@/Fetch/clientes"
import {
  getAllInvoices,
  getPendingClientCharges,
  ClientInvoice,
  PendingClientCharges,
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
  const [pendientes, setPendientes] = useState<PendingClientCharges>({ total: 0, clients: [] });
  const [clienteCorte, setClienteCorte] = useState<PendingClientCharges["clients"][number] | null>(null);

  const [cobroSel, setCobroSel] = useState<ClientInvoice | null>(null);

  useEffect(() => {
    getCLientsList()
      .then((res) => { if (res?.data) setClientes(res.data); })
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const filtro = clienteFiltro !== "todos" ? { id_client: Number(clienteFiltro) } : {};
      const [res, pend] = await Promise.all([
        getAllInvoices({ limit: 100, ...filtro }),
        getPendingClientCharges().catch(() => null),
      ]);
      if (res.ok) setFacturas(res.data.data);
      if (pend?.ok) setPendientes(pend.data);
    } catch {
      toast.error("Error al cargar las facturas");
    } finally {
      setLoading(false);
    }
  }, [clienteFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  // "Nos deben" no cuenta las que ya estan vencidas (son categorias excluyentes).
  const esNosDeben = (f: ClientInvoice) =>
    (f.id_status === INVOICE_STATUS.PENDIENTE_PAGO || f.id_status === INVOICE_STATUS.OBSERVADO) && !isInvoiceOverdue(f);

  const porCobrar = facturas.filter((f) => f.id_status === INVOICE_STATUS.PENDIENTE_PAGO || f.id_status === INVOICE_STATUS.EN_VALIDACION || f.id_status === INVOICE_STATUS.OBSERVADO);
  const historial = facturas.filter((f) => f.id_status === INVOICE_STATUS.PAGADO || f.id_status === INVOICE_STATUS.CANCELADO);

  const pendientesVisibles = pendientes.clients.filter((c) => clienteFiltro === "todos" || c.id_client === Number(clienteFiltro));
  const totalSinCorte = pendientesVisibles.reduce((a, c) => a + c.f_total, 0);

  const totalPorCobrar = facturas.filter(esNosDeben).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalEnValidacion = facturas.filter((f) => f.id_status === INVOICE_STATUS.EN_VALIDACION).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalVencido = facturas.filter(isInvoiceOverdue).reduce((a, f) => a + Number(f.f_amount), 0);
  const totalPagado = facturas.filter((f) => f.id_status === INVOICE_STATUS.PAGADO).reduce((a, f) => a + Number(f.f_amount), 0);

  const nombreCliente = (id_client: number) => clientes.find((c) => c.id_client === id_client)?.name ?? `Cliente #${id_client}`;

  const columnasBase: ColumnDef<ClientInvoice>[] = [
    { accessorKey: "vc_folio", header: "Folio", cell: ({ row }) => <span className="font-bold text-muted-foreground">{row.original.vc_folio ?? `#${row.original.id}`}</span> },
    { id: "cliente", header: "Cliente", cell: ({ row }) => <span className="font-medium">{nombreCliente(row.original.charge.id_client)}</span> },
    { id: "pedido", header: "Pedido", cell: ({ row }) => <span className="text-sm text-muted-foreground">#{row.original.id_order}</span> },
    { accessorKey: "f_amount", header: "Total", cell: ({ row }) => <span className="font-semibold text-foreground">{fmt(Number(row.original.f_amount))}</span> },
    { accessorKey: "dt_register", header: "Emitida", cell: ({ row }) => fmtDate(row.original.dt_register) },
  ];

  const columnasPorCobrar: ColumnDef<ClientInvoice>[] = [
    ...columnasBase,
    {
      accessorKey: "dt_due", header: "Vence",
      cell: ({ row }) => {
        const vencida = isInvoiceOverdue(row.original);
        return <span className={vencida ? "text-destructive font-semibold" : ""}>{fmtDate(row.original.dt_due)}</span>;
      },
    },
    { accessorKey: "id_status", header: "Estado", cell: ({ row }) => <BadgeInvoice invoice={row.original} /> },
    {
      id: "actions", header: "Operaciones",
      cell: ({ row }) => {
        const f = row.original;
        if (f.id_status !== INVOICE_STATUS.EN_VALIDACION) return <span className="text-xs text-muted-foreground/70">Esperando pago del cliente</span>;
        return (
          <Button size="sm" onClick={() => setCobroSel(f)} className="bg-success hover:bg-success/90 text-white">
            <Receipt className="w-3 h-3 mr-1" /> Revisar pago
          </Button>
        );
      },
    },
  ];

  const columnasHistorial: ColumnDef<ClientInvoice>[] = [
    ...columnasBase,
    { accessorKey: "dt_payment", header: "Fecha de pago", cell: ({ row }) => fmtDate(row.original.dt_payment) },
    { accessorKey: "id_status", header: "Estado", cell: ({ row }) => <BadgeInvoice invoice={row.original} /> },
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

  const caja = { backgroundColor: "var(--card-bg)", borderColor: "var(--border)" };

  return (
    <PageWrapper>
      <PageHeader
        title="Cobro a clientes"
        subtitle="Gestión de cobros a clientes"
        icon={Banknote}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <StatCard title="Por facturar (sin corte)" value={fmt(totalSinCorte)} icon={FileText} accent="#7c3aed" />
        <StatCard title="Por validar" value={fmt(totalEnValidacion)} icon={Clock} accent="#2563eb" />
        <StatCard title="Vencidas" value={fmt(totalVencido)} icon={AlertTriangle} accent="#b91c1c" />
        <StatCard title="Nos deben" value={fmt(totalPorCobrar)} icon={AlertCircle} accent="#dc2626" />
        <StatCard title="Pagadas" value={fmt(totalPagado)} icon={CheckCircle2} accent="#16a34a" />
      </div>

      <div className="flex items-center justify-end">
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

      <div className="rounded-xl border overflow-hidden" style={caja}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold text-foreground">1. Lo que ya se puede cobrar (aún sin corte)</p>
          <p className="text-xs text-muted-foreground">Pedidos cerrados con visitas terminadas que todavía no se facturan. Los clientes de prepago no aparecen: ya pagaron al crear el pedido.</p>
        </div>
        {pendientesVisibles.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">No hay nada pendiente de facturar.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Pedidos</th>
                <th className="px-4 py-2 font-medium">Visitas</th>
                <th className="px-4 py-2 font-medium">Se le cobra</th>
                <th className="px-4 py-2 font-medium">Operaciones</th>
              </tr>
            </thead>
            <tbody>
              {pendientesVisibles.map((c) => (
                <tr key={c.id_client} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2">{c.orders}</td>
                  <td className="px-4 py-2">{c.tasks}</td>
                  <td className="px-4 py-2 font-semibold">{fmt(c.f_total)}</td>
                  <td className="px-4 py-2">
                    <Button size="sm" onClick={() => setClienteCorte(c)}>
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
          <p className="font-semibold text-foreground">2. Facturas por cobrar</p>
          <p className="text-xs text-muted-foreground">Cortes ya hechos. Cuando el cliente sube su comprobante aparece "Revisar pago"; al aprobarlo pasa a pagadas.</p>
        </div>
        <DataTable columns={columnasPorCobrar} data={porCobrar} isLoading={loading} emptyMessage="No hay facturas por cobrar." pagination={{ pageSize: 100 }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={caja}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-semibold text-foreground">3. Facturas pagadas</p>
        </div>
        <DataTable columns={columnasHistorial} data={historial} isLoading={loading} emptyMessage="Todavía no hay facturas pagadas." pagination={{ pageSize: 100 }} />
      </div>

      <ModalCorteCliente cliente={clienteCorte} onClose={() => setClienteCorte(null)} onGenerated={cargar} />
      <ModalRevisarCobro cobro={cobroSel} open={cobroSel !== null} onClose={() => setCobroSel(null)} onSuccess={cargar} />
    </PageWrapper>
  );
}
