import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Receipt, CheckCircle2, XCircle, UploadCloud, FileText, X } from "lucide-react"

import {
  getActivatorPaymentById,
  submitActivatorPayment,
  cancelActivatorPayment,
  revealBankAccount,
  ActivatorPayment,
  ActivatorPaymentDetail,
  ACTIVATOR_PAYMENT_STATUS,
} from "@/Fetch/finanzas"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components"

interface Props {
  pago: ActivatorPayment | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const hoyISO = () => new Date().toISOString().slice(0, 10);

export function ModalRegistrarPagoActivador({ pago, open, onClose, onSuccess }: Props) {
  const [detalle, setDetalle] = useState<ActivatorPaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [idCuenta, setIdCuenta] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [accion, setAccion] = useState<null | "pagar" | "cancelar">(null);
  const [revealedAccountId, setRevealedAccountId] = useState<number | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open || !pago) return;
    setLoading(true);
    setFechaPago(hoyISO());
    setIdCuenta("");
    setNotas("");
    setRevealedAccountId(null);
    setRevealedNumber(null);
    setFile(null);
    getActivatorPaymentById(pago.id_payment)
      .then((res) => { if (res.ok) setDetalle(res.data); })
      .catch(() => toast.error("Error al cargar el pago"))
      .finally(() => setLoading(false));
  }, [open, pago]);

  const handleReveal = async (idAccount: number) => {
    setRevealing(true);
    try {
      const res = await revealBankAccount(idAccount);
      if (res.ok) {
        setRevealedAccountId(idAccount);
        setRevealedNumber(res.data.clabe || res.data.card_number || null);
      }
    } catch {
      toast.error("Error al obtener el número completo");
    } finally {
      setRevealing(false);
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
      await submitActivatorPayment(pago.id_payment, {
        dt_payment: fechaPago,
        id_bank_account: idCuenta ? Number(idCuenta) : undefined,
        vc_notes: notas.trim() || undefined,
        evidence: file,
      });
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
      await cancelActivatorPayment(pago.id_payment);
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
            Comisión de activador
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
                <span className="text-muted-foreground">Activador</span>
                <span className="font-medium text-foreground">
                  {detalle.activator.name} {detalle.activator.lastname ?? ""} · {detalle.activator.phone}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground font-medium">Total a pagar</span>
                <span className="text-lg font-bold text-foreground">{fmt(Number(detalle.f_total))}</span>
              </div>
            </div>

            {puedeAccionar && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-pago-act">Fecha de pago</Label>
                  <Input id="fecha-pago-act" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
                </div>

                {detalle.activator.promoter_bank_accounts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Cuenta bancaria (opcional)</Label>
                    <Select value={idCuenta} onValueChange={(v) => { setIdCuenta(v); setRevealedAccountId(null); setRevealedNumber(null); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin especificar" />
                      </SelectTrigger>
                      <SelectContent>
                        {detalle.activator.promoter_bank_accounts.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.bank_name} — {c.account_holder_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {idCuenta && (() => {
                      const cuenta = detalle.activator.promoter_bank_accounts.find((c) => String(c.id) === idCuenta);
                      if (!cuenta) return null;
                      const numero = cuenta.clabe || cuenta.card_number;
                      return (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
                          {numero && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">{cuenta.clabe ? "CLABE" : "Tarjeta"}</span>
                              <span className="font-medium text-foreground font-mono">
                                {revealedAccountId === cuenta.id ? revealedNumber : numero}
                              </span>
                            </div>
                          )}
                          {revealedAccountId !== cuenta.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1 h-8 text-xs"
                              disabled={revealing}
                              onClick={() => handleReveal(cuenta.id)}
                            >
                              {revealing ? <Loader2 className="animate-spin mr-1.5" size={14} /> : null}
                              Ver número completo para transferir
                            </Button>
                          )}
                          {revealedAccountId === cuenta.id && (
                            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                              Esta consulta quedó registrada en la bitácora de auditoría.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="notas-pago-act">Notas (opcional)</Label>
                  <Input id="notas-pago-act" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. referencia de transferencia" />
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

            {!puedeAccionar && detalle.evidences && detalle.evidences.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Comprobante</p>
                {detalle.evidences.map((e) => (
                  <a key={e.id_asset} href={e.vc_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-info underline">
                    <FileText className="w-4 h-4" /> Ver comprobante
                  </a>
                ))}
              </div>
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
              <Button onClick={handlePagar} disabled={busy || !file} className="bg-success hover:bg-success/90 text-white">
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
