import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Calendar, RefreshCw } from "lucide-react"

import { previewCharges, generateCharges } from "@/Fetch/finanzas"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from "@/components"

interface Props {
  cliente: { id_client: number; name: string } | null;
  onClose: () => void;
  onGenerated: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Fecha limite sugerida: 7 dias despues de hoy (se puede cambiar).
const limiteSugerida = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return isoLocal(d);
};

// Hoy todavia no termina (pueden entrar mas visitas): el corte llega como maximo hasta ayer.
const ayerLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const etiquetaAyer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
};

export function ModalCorteCliente({ cliente, onClose, onGenerated }: Props) {
  const [modo, setModo] = useState<"hoy" | "fechas">("hoy");
  const [dtStart, setDtStart] = useState("");
  const [dtEnd, setDtEnd] = useState(ayerLocal());
  const [dtDue, setDtDue] = useState(limiteSugerida());
  const [calculo, setCalculo] = useState<{ total: number; pedidos: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    setModo("hoy");
    setDtStart("");
    setDtEnd(ayerLocal());
    setDtDue(limiteSugerida());
    setCalculo(null);
  }, [cliente]);

  const rango = () => (modo === "hoy" ? { dt_start: "2000-01-01", dt_end: ayerLocal() } : { dt_start: dtStart, dt_end: dtEnd });

  const calcular = async () => {
    if (!cliente) return;
    const r = rango();
    if (!r.dt_start || !r.dt_end) {
      toast.error("Indica las dos fechas");
      return;
    }
    if (r.dt_end > ayerLocal()) {
      toast.error("Solo se puede hacer el corte hasta ayer: hoy todavía no termina");
      return;
    }
    setBuscando(true);
    setCalculo(null);
    try {
      const res = await previewCharges({ ...r, dt_due: dtDue || r.dt_end, id_client: cliente.id_client });
      if (res.ok) {
        const c = res.data.clients.find((x) => x.id_client === cliente.id_client);
        setCalculo({ total: c?.f_total ?? 0, pedidos: c?.orders.length ?? 0 });
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al calcular");
    } finally {
      setBuscando(false);
    }
  };

  // Al cambiar de opcion o de fechas el calculo anterior ya no vale.
  useEffect(() => { setCalculo(null); }, [modo, dtStart, dtEnd]);

  // En "hasta hoy" se calcula solo al abrir.
  useEffect(() => {
    if (cliente && modo === "hoy") calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, modo]);

  const generar = async () => {
    if (!cliente) return;
    if (!dtDue) {
      toast.error("Indica la fecha límite de pago");
      return;
    }
    if (dtDue < isoLocal(new Date())) {
      toast.error("La fecha límite de pago no puede ser anterior a hoy");
      return;
    }
    setGenerando(true);
    try {
      await generateCharges({ ...rango(), dt_due: dtDue, id_client: cliente.id_client });
      toast.success("Corte generado: el cliente ya ve sus facturas por pagar");
      onClose();
      onGenerated();
    } catch (e: any) {
      toast.error(e?.message || "Error al generar el corte");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={cliente !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-info" />
            Generar corte · {cliente?.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Se genera una factura por cada pedido cerrado con visitas terminadas. ¿Hasta qué fecha quieres hacer el corte?</p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={modo === "hoy"} onChange={() => setModo("hoy")} />
            Todo lo pendiente hasta ayer ({etiquetaAyer()})
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={modo === "fechas"} onChange={() => setModo("fechas")} />
            Por bloque de fechas (de tal a tal)
          </label>
        </div>

        {modo === "fechas" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="corte-cli-desde">Desde</Label>
                <Input id="corte-cli-desde" type="date" value={dtStart} onChange={(e) => setDtStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corte-cli-hasta">Hasta</Label>
                <Input id="corte-cli-hasta" type="date" max={ayerLocal()} value={dtEnd} onChange={(e) => setDtEnd(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" onClick={calcular} disabled={buscando} className="w-full">
              {buscando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Calcular
            </Button>
          </>
        )}

        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <Label htmlFor="corte-cli-limite">¿Cuántos días tiene el cliente para pagar?</Label>
          <Input id="corte-cli-limite" type="date" min={isoLocal(new Date())} value={dtDue} onChange={(e) => setDtDue(e.target.value)} />
          <p className="text-xs text-muted-foreground">Es la fecha límite de pago de estas facturas (sugerida: 7 días). Es aparte del corte de arriba y siempre va en el futuro.</p>
        </div>

        <div className="rounded-lg border border-border p-3 text-sm">
          {buscando ? (
            <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</p>
          ) : calculo ? (
            calculo.total > 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total a cobrar en este corte ({calculo.pedidos} pedido{calculo.pedidos === 1 ? "" : "s"})</span>
                <span className="text-lg font-bold text-foreground">{fmt(calculo.total)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No hay nada por cobrar en ese rango.</p>
            )
          ) : (
            <p className="text-muted-foreground text-center">Elige las fechas y presiona Calcular.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={generando}>Cancelar</Button>
          <Button onClick={generar} disabled={generando || buscando || !calculo || calculo.total <= 0}>
            {generando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Generar corte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
