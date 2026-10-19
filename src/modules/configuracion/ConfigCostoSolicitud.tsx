import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, HandCoins } from "lucide-react"

import { Button, Input } from "@/components"
import { getRequestPricingSettings, setRequestPricingSettings } from "@/Fetch/appConfig"

export function ConfigCostoSolicitud() {
  const [precio, setPrecio] = useState("15");
  const [minimo, setMinimo] = useState("3");
  const [maximo, setMaximo] = useState("6");
  const [precioFijo, setPrecioFijo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getRequestPricingSettings()
      .then((r) => {
        if (!r.ok) return;
        setPrecio(String(r.data.price_per_product));
        setMinimo(String(r.data.min_products));
        setMaximo(String(r.data.max_products));
        setPrecioFijo(Number(r.data.min_products) === 1 && Number(r.data.max_products) === 1);
      })
      .catch(() => toast.error("Error al cargar el costo de las solicitudes"));
  }, []);

  const guardar = async () => {
    const price = Number(precio);
    const min = precioFijo ? 1 : Number(minimo);
    const max = precioFijo ? 1 : Number(maximo);
    if (!price || price <= 0) { toast.error("El costo por producto debe ser mayor a 0"); return; }
    if (!min || min < 1) { toast.error("El mínimo debe ser al menos 1 producto"); return; }
    if (max < min) { toast.error("El máximo no puede ser menor al mínimo"); return; }
    setGuardando(true);
    try {
      const res = await setRequestPricingSettings({ price_per_product: price, min_products: min, max_products: max });
      if (res.ok) toast.success(`Configuración actualizada. Se actualizó el precio de ${res.data.updated} de ${res.data.total} solicitud(es) guardada(s)`);
      else toast.success("Configuración actualizada exitosamente");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar la configuración");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <HandCoins className="w-5 h-5 text-success" />
        <h3 className="font-semibold text-foreground">Costo de una solicitud nueva</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        El costo se calcula como el costo por producto multiplicado por la cantidad de productos, sin bajar del mínimo ni subir del máximo (después del máximo, agregar más productos ya no incrementa el costo). Los costos se cobran más IVA.
      </p>
      <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer rounded-lg border border-border p-3">
        <input type="checkbox" className="mt-0.5" checked={precioFijo} onChange={(e) => setPrecioFijo(e.target.checked)} />
        <span>
          <span className="font-medium block">Productos ilimitados por un precio fijo</span>
          <span className="text-xs text-muted-foreground">El cliente puede agregar todos los productos que quiera y la solicitud siempre cuesta lo mismo (el costo por producto de abajo).</span>
        </span>
      </label>
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
        Al guardar, se actualiza el precio de todas las solicitudes ya guardadas con esta nueva configuración. Los pedidos que ya están en curso no se ven afectados, su precio queda tal como se cobró.
      </p>
      <div className={`grid grid-cols-1 gap-3 ${precioFijo ? "" : "sm:grid-cols-3"}`}>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{precioFijo ? "Precio fijo de la solicitud ($)" : "Costo por producto ($)"}</label>
          <Input type="number" min={1} value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </div>
        {!precioFijo && (
          <>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Mínimo de productos</label>
              <Input type="number" min={1} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Máximo de productos</label>
              <Input type="number" min={1} value={maximo} onChange={(e) => setMaximo(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {precioFijo
          ? `Con estos valores: toda solicitud cuesta $${Number(precio) || 0} (más IVA), sin importar cuántos productos tenga.`
          : `Con estos valores: costo mínimo $${(Number(precio) * Number(minimo)) || 0} (hasta ${minimo || 0} productos), costo máximo $${(Number(precio) * Number(maximo)) || 0} (a partir de ${maximo || 0} productos).`}
      </p>
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar configuración
      </Button>
    </div>
  );
}
