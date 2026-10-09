import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, XCircle, Receipt, FileText, ExternalLink } from "lucide-react"

import { getInvoiceById, updateInvoiceStatus, ClientInvoice, ClientInvoiceDetail } from "@/Fetch/finanzas"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label, Textarea } from "@/components"

interface Props {
  cobro: ClientInvoice | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "—";

const isImage = (mime: string | null) => !!mime && mime.startsWith("image/");

export function ModalRevisarCobro({ cobro, open, onClose, onSuccess }: Props) {
  const [detalle, setDetalle] = useState<ClientInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [accion, setAccion] = useState<null | "aceptar" | "rechazar">(null);

  useEffect(() => {
    if (!open || !cobro) return;
    setLoading(true);
    setMotivo("");
    getInvoiceById(cobro.id)
      .then((res) => { if (res.ok) setDetalle(res.data); })
      .catch(() => toast.error("Error al cargar la factura"))
      .finally(() => setLoading(false));
  }, [open, cobro]);

  const ejecutar = async (action: "approve" | "reject") => {
    if (!cobro) return;
    if (action === "reject" && !motivo.trim()) {
      toast.error("Indica el motivo del rechazo");
      return;
    }
    setAccion(action === "approve" ? "aceptar" : "rechazar");
    try {
      await updateInvoiceStatus(cobro.id, { action, vc_rejection_reason: action === "reject" ? motivo.trim() : undefined });
      toast.success(action === "approve" ? "Factura aprobada y cerrada" : "Comprobante rechazado, se avisó al cliente");
      onClose();
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || "Error al revisar la factura");
    } finally {
      setAccion(null);
    }
  };

  if (!cobro) return null;
  const busy = accion !== null;
  const hayComprobante = detalle && (detalle.dt_payment || detalle.evidences.length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-info" />
            Revisar factura
          </DialogTitle>
        </DialogHeader>

        {loading || !detalle ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        ) : (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Folio</span>
                <span className="font-medium text-foreground">{detalle.vc_folio ?? `#${detalle.id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orden de visita</span>
                <span className="font-medium text-foreground">#{detalle.id_order}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground font-medium">Total de la factura</span>
                <span className="text-lg font-bold text-foreground">{fmt(Number(detalle.f_amount))}</span>
              </div>
            </div>

            {!hayComprobante ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
                El cliente aún no ha subido un comprobante para esta factura.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Fecha de pago declarada</span><span className="font-semibold">{fmtDate(detalle.dt_payment)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span className="capitalize">{detalle.vc_payment_method ?? "—"}</span></div>
                </div>

                {/* Evidencias */}
                {detalle.evidences.length > 0 ? (
                  <div className="space-y-2">
                    {detalle.evidences.map((ev) => (
                      isImage(ev.vc_mime) ? (
                        <a key={ev.id_asset} href={ev.vc_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border">
                          <img src={ev.vc_url} alt="Comprobante" className="w-full max-h-64 object-contain bg-muted" />
                        </a>
                      ) : (
                        <a key={ev.id_asset} href={ev.vc_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-3 text-info hover:bg-info/10">
                          <FileText className="w-5 h-5" /> Ver comprobante <ExternalLink className="w-4 h-4 ml-auto" />
                        </a>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin archivo adjunto.</p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="motivo-rechazo" className="text-sm font-medium">Motivo de rechazo <span className="text-muted-foreground/70 font-normal">(obligatorio si rechazas)</span></Label>
                  <Textarea id="motivo-rechazo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. El comprobante no coincide con el monto..." />
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => ejecutar("reject")} disabled={busy || !hayComprobante} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            {accion === "rechazar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Rechazar
          </Button>
          <Button onClick={() => ejecutar("approve")} disabled={busy || !hayComprobante} className="bg-success hover:bg-success/90 text-white">
            {accion === "aceptar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
