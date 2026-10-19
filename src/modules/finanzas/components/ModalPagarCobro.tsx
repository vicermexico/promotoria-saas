import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Banknote, ArrowLeftRight, CreditCard, Store, Loader2, UploadCloud, Receipt, FileText, X, Copy } from "lucide-react"

import { getClientPaymentAccount } from "@/Fetch/appConfig"
import { submitInvoicePayment, ClientInvoice, MetodoPago } from "@/Fetch/finanzas"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from "@/components"

interface Props {
  cobro: ClientInvoice | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const METODOS: { key: MetodoPago; label: string; icon: React.ElementType; color: string; border: string }[] = [
  { key: "transferencia", label: "Transferencia", icon: ArrowLeftRight, color: "bg-info/10 text-info", border: "border-info/40" },
  { key: "efectivo", label: "Efectivo", icon: Banknote, color: "bg-success/10 text-success", border: "border-success/40" },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard, color: "bg-muted/50 text-foreground", border: "border-border" },
  { key: "oxxo", label: "Depósito OXXO", icon: Store, color: "bg-destructive/10 text-destructive", border: "border-destructive/40" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface BankInfo {
  bank: string;
  holder: string;
  clabe: string;
  account: string;
  instructions: string;
}

function Dato({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
      <button type="button" onClick={copiar} className="p-2 rounded-lg hover:bg-accent shrink-0" title="Copiar">
        <Copy size={16} />
      </button>
    </div>
  );
}

export function ModalPagarCobro({ cobro, open, onClose, onSuccess }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [file, setFile] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [bank, setBank] = useState<BankInfo | null>(null);

  useEffect(() => {
    if (!open || !cobro) return;
    setBank(null);
    getClientPaymentAccount(cobro.charge.id_client)
      .then((r) => { if (r.ok) setBank(r.data.account); })
      .catch(() => undefined);
  }, [open, cobro]);

  const sinDatos = !!bank && !bank.clabe && !bank.account;

  const reset = () => {
    setMetodo("transferencia");
    setFechaPago(hoyISO());
    setFile(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const valid = ["image/", "application/pdf"];
    if (!valid.some((v) => f.type.startsWith(v))) {
      toast.error("El comprobante debe ser una imagen o PDF");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 10MB");
      return;
    }
    setFile(f);
  };

  const handleConfirmar = async () => {
    if (!cobro) return;
    if (!fechaPago) {
      toast.error("Indica la fecha de pago");
      return;
    }
    if (!file) {
      toast.error("Adjunta el comprobante de pago");
      return;
    }

    setGuardando(true);
    try {
      await submitInvoicePayment(cobro.id, {
        dt_payment: fechaPago,
        vc_payment_method: metodo,
        evidence: file,
      });
      toast.success("Comprobante enviado. Queda en validación.");
      handleClose();
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message || "Error al enviar el comprobante");
    } finally {
      setGuardando(false);
    }
  };

  if (!cobro) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-info" />
            Registrar pago
          </DialogTitle>
        </DialogHeader>

        {/* Info de la factura */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Folio</span>
            <span className="font-medium text-foreground">{cobro.vc_folio ?? `#${cobro.id}`}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground font-medium">Total de la factura</span>
            <span className="text-xl font-bold text-info">{fmt(Number(cobro.f_amount))}</span>
          </div>
        </div>

        {/* A donde pagar */}
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium mb-1">Haz tu transferencia o depósito a:</p>
          {!bank ? (
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          ) : sinDatos ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos bancarios configurados. Contacta a soporte para saber dónde pagar.</p>
          ) : (
            <div className="divide-y divide-border">
              <Dato label="Banco" value={bank.bank} />
              <Dato label="Titular" value={bank.holder} />
              <Dato label="CLABE" value={bank.clabe} />
              <Dato label="Cuenta" value={bank.account} />
              {bank.instructions && <p className="text-xs text-muted-foreground pt-2">{bank.instructions}</p>}
            </div>
          )}
        </div>

        {/* Método */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Método de pago</Label>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map((m) => {
              const Icon = m.icon;
              const selected = metodo === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetodo(m.key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    selected ? `${m.color} ${m.border}` : "bg-white border-border text-muted-foreground hover:border-input hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha de pago */}
        <div className="space-y-1.5">
          <Label htmlFor="fecha-pago" className="text-sm font-medium text-foreground">Fecha en que pagaste</Label>
          <Input id="fecha-pago" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
        </div>

        {/* Comprobante */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Comprobante</Label>
          {!file ? (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-input rounded-xl p-6 cursor-pointer text-muted-foreground hover:border-ring hover:text-foreground transition-colors">
              <UploadCloud size={28} />
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={guardando} className="bg-info hover:bg-info/90 text-white">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Enviar comprobante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
