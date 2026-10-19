import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, PackagePlus } from "lucide-react"

import { Button, Input } from "@/components"
import { getTaskSettings, updatePreorderPricing } from "@/Fetch/taskSettings"

export function ConfigPrepedido() {
  const [tipo, setTipo] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [valor, setValor] = useState("0");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getTaskSettings()
      .then((r) => {
        if (!r.ok) return;
        setTipo(r.data.preorder_pricing_type ?? "FIXED");
        setValor(String(r.data.preorder_pricing_value ?? 0));
      })
      .catch(() => toast.error("Error al cargar el cargo por Prepedido"));
  }, []);

  const guardar = async () => {
    const n = Number(valor);
    if (isNaN(n) || n < 0) { toast.error("El valor del cargo por Prepedido debe ser 0 o mayor"); return; }
    setGuardando(true);
    try {
      await updatePreorderPricing(tipo, n);
      toast.success("Cargo por Prepedido guardado");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const btn = (t: "FIXED" | "PERCENTAGE") =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${tipo === t ? "border-info bg-info/10 text-info" : "border-border text-muted-foreground"}`;

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <PackagePlus className="w-5 h-5 text-info" />
        <h3 className="font-semibold text-foreground">Cargo extra por Prepedido</h3>
      </div>
      <p className="text-sm text-muted-foreground">Se cobra solo cuando la solicitud lleva Prepedido. Con 0 no se cobra nada.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTipo("FIXED")} className={btn("FIXED")}>Monto fijo ($)</button>
        <button type="button" onClick={() => setTipo("PERCENTAGE")} className={btn("PERCENTAGE")}>Porcentaje (%)</button>
      </div>
      <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "FIXED" ? "Ej. 50" : "Ej. 20"} />
      <p className="text-xs text-muted-foreground">
        {tipo === "FIXED" ? "Se suma este monto al total de la solicitud." : "Se suma este porcentaje sobre el total de la solicitud."}
      </p>
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar
      </Button>
    </div>
  );
}
