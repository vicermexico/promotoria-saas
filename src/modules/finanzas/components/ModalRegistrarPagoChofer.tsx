import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Receipt, CheckCircle2, XCircle, Landmark, Eye, Copy, UploadCloud, FileText, X } from "lucide-react"

import { ACTIVATOR_PAYMENT_STATUS } from "@/Fetch/finanzas"
import {
  getDriverActivatorPaymentById,
  submitDriverActivatorPayment,
  revealDriverBankAccount,
  cancelDriverActivatorPayment,
  DriverActivatorPayment,
  DriverActivatorPaymentDetail,
} from "@/Fetch/finanzasChoferes"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from "@/components"

interface Props {
  pago: DriverActivatorPayment | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const hoyISO = () => new Date().toISOString().slice(0, 10);

export function ModalRegistrarPagoChofer({ pago, open, onClose, onSuccess }: Props) {
  const [detalle, setDetalle] = useState<DriverActivatorPaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [accion, setAccion] = useState<null | "pagar" | "cancelar">(null);
  const [numeroCompleto, setNumeroCompleto] = useState<string | null>(null);
  const [revelando, setRevelando] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open || !pago) return;
    setLoading(true);
    setDetalle(null);
    setFechaPago(hoyISO());
    setNotas("");
    setNumeroCompleto(null);
    setFile(null);
    getDriverActivatorPaymentById(pago.id_payment)
      .then((res) => { if (res.ok) setDetalle(res.data); })
      .catch(() => toast.error("Error al cargar el pago"))
      .finally(() => setLoading(false));
  }, [open, pago]);

  const handleRevelar = async () => {
    if (!detalle?.bank_account) return;
    setRevelando(true);
    try {
      const res = await revealDriverBankAccount(detalle.bank_account.id);
      if (res.ok) setNumeroCompleto(res.data.clabe || res.data.card_number || null);
    } catch {
      toast.error("Error al obtener el número completo");
    } finally {
      setRevelando(false);
    }
  };

  const handleCopiar = async () => {
    if (!numeroCompleto) return;
    try {
      await navigator.clipboard.writeText(numeroCompleto);
      toast.success("Número copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(f.type.startsWith("image/") || f.type === "application/pdf")) {
      toast.error("El comprobante debe ser una imagen o PDF");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 10MB");
      return;
    }
    setFile(f);
  };

  const handlePagar = async () => {
    if (!pago) return;
    if (!file) {
      toast.error("Sube el comprobante del pago");
      return;
    }
    if (!fechaPago) {
      toast.error("Indica la fecha de pago");
      return;
    }
    setAccion("pagar");
    try {
      await submitDriverActivatorPayment(pago.id_payment, { dt_payment: fechaPago, vc_notes: notas.trim() || undefined, evidence: file });
      toast.success("Pago registrado exitosamente");
      onClose();
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || "Error al registrar el pago");
    } finally {
      setAccion(null);
    }
  };

  const handleCancelar = async () => {
    if (!pago) return;
    setAccion("cancelar");
    try {
      await cancelDriverActivatorPayment(pago.id_payment);
      toast.success("Pago cancelado");
      onClose();
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || "Error al cancelar el pago");
    } finally {
      setAccion(null);
    }
  };

  if (!pago) return null;
  const busy = accion !== null;
  const puedeAccionar = pago.id_status === ACTIVATOR_PAYMENT_STATUS.POR_PAGAR;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-info" />
            Comisión de chofer
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
                <span className="font-medium text-foreground">{detalle.vc_folio ?? `#${detalle.id_payment}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chofer</span>
                <span className="font-medium text-foreground">
                  {detalle.driver ? `${detalle.driver.name} · ${detalle.driver.phone}` : `Chofer #${detalle.id_driver}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground font-medium">Total a pagar</span>
                <span className="text-lg font-bold text-foreground">{fmt(Number(detalle.f_total))}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 text-sm space-y-1.5">
              <p className="flex items-center gap-2 font-medium text-foreground"><Landmark className="w-4 h-4" /> Cuenta para depositar</p>
              {detalle.bank_account ? (
                <>
                  <p className="text-muted-foreground">
                    {detalle.bank_account.bank_name} · {detalle.bank_account.account_type === "CLABE" ? "CLABE" : "Tarjeta"}{" "}
                    {numeroCompleto ?? detalle.bank_account.clabe ?? detalle.bank_account.card_number}
                  </p>
                  <p className="text-muted-foreground">Titular: {detalle.bank_account.account_holder_name}</p>
                  {numeroCompleto ? (
                    <Button variant="outline" size="sm" onClick={handleCopiar}><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar número</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleRevelar} disabled={revelando}>
                      {revelando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                      Ver número completo
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-warning">El chofer todavía no registra su cuenta. Pídele que la dé de alta en Invitar.</p>
              )}
            </div>

            {detalle.payment_tasks.length > 0 && (
              <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm max-h-40 overflow-y-auto">
                {detalle.payment_tasks.map((t) => (
                  <div key={t.id} className="flex justify-between">
                    <span className="text-muted-foreground">{t.promoter_name ?? `Promotor #${t.id_promoter}`} · tarea #{t.id_task}</span>
                    <span className="font-semibold">{fmt(Number(t.f_amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {puedeAccionar && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-pago-chof">Fecha de pago</Label>
                  <Input id="fecha-pago-chof" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notas-pago-chof">Notas (opcional)</Label>
                  <Input id="notas-pago-chof" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. referencia de transferencia o efectivo" />
                </div>
                <div className="space-y-1.5">
                  <Label>Comprobante del pago</Label>
                  {!file ? (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-input rounded-xl p-5 cursor-pointer text-muted-foreground hover:border-ring hover:text-foreground transition-colors">
                      <UploadCloud size={26} />
                      <span className="text-sm font-medium">Subir comprobante</span>
                      <span className="text-xs text-muted-foreground/70">Imagen o PDF, hasta 10MB</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-muted/40">
                      <FileText className="w-5 h-5 text-info shrink-0" />
                      <span className="text-sm flex-1 truncate" title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {!puedeAccionar && detalle.evidences?.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Comprobante</p>
                {detalle.evidences.map((e) => (
                  <a key={e.id_asset} href={e.vc_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-info underline">
                    <FileText className="w-4 h-4" /> Ver comprobante
                  </a>
                ))}
              </div>
            )}

            {!puedeAccionar && detalle.vc_notes && (
              <p className="text-sm text-muted-foreground">Notas: {detalle.vc_notes}</p>
            )}
          </>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {puedeAccionar ? (
            <>
              <Button variant="outline" onClick={handleCancelar} disabled={busy} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                {accion === "cancelar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                Cancelar comisión
              </Button>
              <div className="flex-1" />
              <Button onClick={handlePagar} disabled={busy || !detalle || !file} className="bg-success hover:bg-success/90 text-white">
                {accion === "pagar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Marcar como pagado
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
