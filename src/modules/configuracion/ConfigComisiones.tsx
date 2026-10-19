import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, Percent } from "lucide-react"

import { Button, Input } from "@/components"
import { getFinanceSettings, updateFinanceSettings, CommissionType } from "@/Fetch/financeSettings"

function BloquePago(props: {
  titulo: string
  tipo: CommissionType
  valor: string
  onTipo: (t: CommissionType) => void
  onValor: (v: string) => void
  ayudaFijo: string
  ayudaPorcentaje: string
}) {
  const btn = (t: CommissionType) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${props.tipo === t ? "border-info bg-info/10 text-info" : "border-border text-muted-foreground"}`;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{props.titulo}</h4>
      <div className="flex gap-2">
        <button type="button" onClick={() => props.onTipo("FIXED")} className={btn("FIXED")}>Monto fijo ($)</button>
        <button type="button" onClick={() => props.onTipo("PERCENTAGE")} className={btn("PERCENTAGE")}>Porcentaje (%)</button>
      </div>
      <Input type="number" min="0" step="0.01" value={props.valor} onChange={(e) => props.onValor(e.target.value)} placeholder={props.tipo === "FIXED" ? "Ej. 15" : "Ej. 70"} />
      <p className="text-xs text-muted-foreground">{props.tipo === "FIXED" ? props.ayudaFijo : props.ayudaPorcentaje}</p>
    </div>
  );
}

export function ConfigComisiones() {
  const [tipoPromotor, setTipoPromotor] = useState<CommissionType>("PERCENTAGE");
  const [promotor, setPromotor] = useState("0");
  const [tipoActivador, setTipoActivador] = useState<CommissionType>("PERCENTAGE");
  const [activador, setActivador] = useState("10");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getFinanceSettings()
      .then((r) => {
        if (!r.ok) return;
        setPromotor(String(r.data.f_promoter_commission_percentage ?? 0));
        setActivador(String(r.data.f_activator_commission_percentage ?? 10));
        setTipoPromotor(r.data.vc_promoter_commission_type === "FIXED" ? "FIXED" : "PERCENTAGE");
        setTipoActivador(r.data.vc_activator_commission_type === "FIXED" ? "FIXED" : "PERCENTAGE");
      })
      .catch(() => toast.error("Error al cargar las comisiones"));
  }, []);

  const guardar = async () => {
    const p = Number(promotor);
    const a = Number(activador);
    if (isNaN(p) || p < 0 || (tipoPromotor === "PERCENTAGE" && p > 100)) { toast.error(tipoPromotor === "PERCENTAGE" ? "El % del promotor debe estar entre 0 y 100" : "El monto del promotor debe ser 0 o mayor"); return; }
    if (isNaN(a) || a < 0 || (tipoActivador === "PERCENTAGE" && a > 100)) { toast.error(tipoActivador === "PERCENTAGE" ? "El % del activador debe estar entre 0 y 100" : "El monto del activador debe ser 0 o mayor"); return; }
    setGuardando(true);
    try {
      await updateFinanceSettings({
        f_promoter_commission_percentage: p,
        f_activator_commission_percentage: a,
        vc_promoter_commission_type: tipoPromotor,
        vc_activator_commission_type: tipoActivador,
      });
      toast.success("Comisiones guardadas");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-5" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Percent className="w-5 h-5 text-info" />
        <h3 className="font-semibold text-foreground">Comisiones</h3>
      </div>

      <BloquePago
        titulo="Pago a promotor"
        tipo={tipoPromotor}
        valor={promotor}
        onTipo={setTipoPromotor}
        onValor={setPromotor}
        ayudaFijo="El promotor recibe este monto fijo por cada tarea terminada y aprobada."
        ayudaPorcentaje="El promotor recibe este % de lo que se le cobra al cliente por cada tarea."
      />
      {Number(promotor) <= 0 && (
        <p className="text-xs font-medium text-warning">⚠ Con 0 no se pueden generar pagos a promotores todavía.</p>
      )}

      <div className="border-t border-border pt-5">
        <BloquePago
          titulo="Pago a activador (quien invitó al promotor)"
          tipo={tipoActivador}
          valor={activador}
          onTipo={setTipoActivador}
          onValor={setActivador}
          ayudaFijo="El activador recibe este monto fijo por cada tarea terminada de los promotores que invitó."
          ayudaPorcentaje="El activador recibe este % adicional, calculado sobre lo que gana el promotor, no sobre lo que se le cobra al cliente."
        />
      </div>

      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar comisiones
      </Button>
    </div>
  );
}
