import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, Clock, ShoppingBag } from "lucide-react"

import { Button, Input } from "@/components"
import { getTaskSettings, updateTaskSettings } from "@/Fetch/taskSettings"

export function ConfigTiempos() {
  const [horasRevision, setHorasRevision] = useState("24");
  const [horasCierre, setHorasCierre] = useState("24");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getTaskSettings()
      .then((r) => {
        if (!r.ok) return;
        setHorasRevision(String(r.data.i_review_timeout_hours));
        setHorasCierre(String(r.data.i_order_auto_close_hours ?? 24));
      })
      .catch(() => toast.error("Error al cargar los tiempos"));
  }, []);

  const guardar = async () => {
    const a = Number(horasRevision);
    const b = Number(horasCierre);
    if (!horasRevision || isNaN(a) || a < 1 || a > 720) { toast.error("Indica un número de horas entre 1 y 720 para la revisión de tareas"); return; }
    if (!horasCierre || isNaN(b) || b < 1 || b > 720) { toast.error("Indica un número de horas entre 1 y 720 para el cierre automático de pedidos"); return; }
    setGuardando(true);
    try {
      await updateTaskSettings(a, b);
      toast.success("Tiempos guardados");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-info" />
        <h3 className="font-semibold text-foreground">Tiempos automáticos</h3>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5 text-foreground"><Clock className="w-4 h-4" />Horas para que el cliente revise una tarea</label>
        <Input type="number" min="1" max="720" value={horasRevision} onChange={(e) => setHorasRevision(e.target.value)} />
        <p className="text-xs text-muted-foreground">Si el cliente no acepta ni rechaza una tarea en este tiempo, el sistema la aprueba automáticamente.</p>
      </div>
      <div className="space-y-2 pt-3 border-t border-border">
        <label className="text-sm font-medium flex items-center gap-1.5 text-foreground"><ShoppingBag className="w-4 h-4" />Horas para que un pedido se cierre solo</label>
        <Input type="number" min="1" max="720" value={horasCierre} onChange={(e) => setHorasCierre(e.target.value)} />
        <p className="text-xs text-muted-foreground">Si el cliente no cierra un pedido en este tiempo, el sistema lo cierra solo y cancela las tareas que nadie tomó (para que dejen de mandar notificación).</p>
      </div>
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar tiempos
      </Button>
    </div>
  );
}
