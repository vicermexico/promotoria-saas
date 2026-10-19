import { useEffect, useState } from "react"
import { Loader2, FileSearch, CalendarRange } from "lucide-react"

import { getMyInvoiceDetail, ClientInvoice, ClientInvoiceDetail, INVOICE_STATUS_LABEL } from "@/Fetch/finanzas"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components"

interface Props {
  factura: ClientInvoice | null;
  open: boolean;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtFechaLarga = (d: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

export function ModalDetalleFactura({ factura, open, onClose }: Props) {
  const [detalle, setDetalle] = useState<ClientInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !factura) {
      setDetalle(null);
      return;
    }
    setLoading(true);
    getMyInvoiceDetail(factura.id)
      .then((res) => { if (res.ok) setDetalle(res.data.data); })
      .finally(() => setLoading(false));
  }, [open, factura]);

  if (!factura) return null;

  const tareas = detalle?.tasks ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-info" />
            Detalle del pedido #{factura.id_order}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Folio</span>
            <span className="font-medium text-foreground">{factura.vc_folio ?? `#${factura.id}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estado</span>
            <span className="font-medium text-foreground">{INVOICE_STATUS_LABEL[factura.id_status]}</span>
          </div>
          <div className="flex items-start justify-between gap-2 border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" />
              Periodo de corte
            </span>
            <span className="font-medium text-foreground text-right">
              Del {fmtFechaLarga(factura.charge.dt_start)} al {fmtFechaLarga(factura.charge.dt_end)}
            </span>
          </div>
          {factura.f_tax != null && Number(factura.f_tax) > 0 && (
            <>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{fmt(Number(factura.f_subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span className="font-medium text-foreground">{fmt(Number(factura.f_tax))}</span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground font-medium">Total a pagar</span>
            <span className="text-xl font-bold text-info">{fmt(Number(factura.f_amount))}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Tareas que componen el subtotal</p>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cargando el detalle...</span>
            </div>
          ) : tareas.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 py-4 text-center">No hay tareas registradas para esta orden de visita.</p>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {tareas.map((t) => {
                const promotor = t.task?.promoter
                  ? `${t.task.promoter.name} ${t.task.promoter.lastname ?? ""}`.trim()
                  : "Promotor";
                const tienda = t.task?.store?.vc_name ?? t.task?.store?.name ?? null;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{promotor}</p>
                      {tienda && <p className="text-xs text-muted-foreground">{tienda}</p>}
                    </div>
                    <span className="font-semibold text-foreground">{fmt(Number(t.f_amount))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
