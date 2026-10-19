import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Calendar, RefreshCw } from "lucide-react"

import { previewDriverActivatorPayments, generateDriverActivatorPayments, DriverActivatorPayment } from "@/Fetch/finanzasChoferes"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label } from "@/components"

interface Props {
  chofer: { id_driver: number; name: string; f_total: number } | null;
  onClose: () => void;
  // Recibe el corte recien hecho para poder abrir su pago de inmediato (o dejarlo para despues).
  onGenerated: (pago: DriverActivatorPayment | null) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ModalCorteChofer({ chofer, onClose, onGenerated }: Props) {
  const [modo, setModo] = useState<"hoy" | "fechas">("hoy");
  const [dtStart, setDtStart] = useState("");
  const [dtEnd, setDtEnd] = useState(hoyLocal());
  const [calculo, setCalculo] = useState<{ total: number; tareas: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    setModo("hoy");
    setDtStart("");
    setDtEnd(hoyLocal());
    setCalculo(null);
  }, [chofer]);

  const rango = () => (modo === "hoy" ? { dt_start: "2000-01-01", dt_end: hoyLocal() } : { dt_start: dtStart, dt_end: dtEnd });

  const calcular = async () => {
    if (!chofer) return;
    const r = rango();
    if (!r.dt_start || !r.dt_end) {
      toast.error("Indica las dos fechas");
      return;
    }
    setBuscando(true);
    setCalculo(null);
    try {
      const res = await previewDriverActivatorPayments({ ...r, id_driver: chofer.id_driver });
      if (res.ok) {
        const d = res.data.drivers.find((x) => x.id_driver === chofer.id_driver);
        setCalculo({ total: d?.f_total ?? 0, tareas: d?.tasks.length ?? 0 });
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
    if (chofer && modo === "hoy") calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chofer, modo]);

  const generar = async () => {
    if (!chofer) return;
    setGenerando(true);
    try {
      const res = await generateDriverActivatorPayments({ ...rango(), id_driver: chofer.id_driver });
      const creados = (res.data as unknown as DriverActivatorPayment[]) ?? [];
      toast.success("Corte generado");
      onClose();
      onGenerated(creados[0] ?? null);
    } catch (e: any) {
      toast.error(e?.message || "Error al generar el corte");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={chofer !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-info" />
            Generar corte · {chofer?.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">¿Hasta qué fecha quieres hacer el corte?</p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={modo === "hoy"} onChange={() => setModo("hoy")} />
            Todo lo pendiente hasta hoy
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
                <Label htmlFor="corte-desde">Desde</Label>
                <Input id="corte-desde" type="date" value={dtStart} onChange={(e) => setDtStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corte-hasta">Hasta</Label>
                <Input id="corte-hasta" type="date" value={dtEnd} onChange={(e) => setDtEnd(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" onClick={calcular} disabled={buscando} className="w-full">
              {buscando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Calcular
            </Button>
          </>
        )}

        <div className="rounded-lg border border-border p-3 text-sm">
          {buscando ? (
            <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</p>
          ) : calculo ? (
            calculo.total > 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total a pagar en este corte ({calculo.tareas} tarea{calculo.tareas === 1 ? "" : "s"})</span>
                <span className="text-lg font-bold text-foreground">{fmt(calculo.total)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No hay comisiones en ese rango.</p>
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
