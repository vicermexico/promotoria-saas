import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, Landmark, Undo2 } from "lucide-react"

import { useAuthStore } from "@/stores"
import { Button } from "@/components"
import { getClientPaymentAccount, setClientPaymentAccount, resetClientPaymentAccount, PaymentAccount } from "@/Fetch/appConfig"
import { PaymentAccountFields, EMPTY_PAYMENT_ACCOUNT } from "@/modules/finanzas/components/PaymentAccountFields"

export function CuentaPagoCliente({ id_client }: { id_client: number | undefined }) {
  const { user } = useAuthStore();
  const isMaster = user?.i_rol === 1;
  const [cuenta, setCuenta] = useState<PaymentAccount>(EMPTY_PAYMENT_ACCOUNT);
  const [personalizada, setPersonalizada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isMaster || !id_client) return;
    setCargando(true);
    getClientPaymentAccount(id_client)
      .then((r) => { if (r.ok) { setCuenta(r.data.account); setPersonalizada(r.data.is_custom); } })
      .catch(() => toast.error("Error al cargar la cuenta de pago del cliente"))
      .finally(() => setCargando(false));
  }, [isMaster, id_client]);

  if (!isMaster || !id_client) return null;

  const guardar = async () => {
    if (!cuenta.clabe.trim() && !cuenta.account.trim()) {
      toast.error("Pon al menos la CLABE o el número de cuenta");
      return;
    }
    setGuardando(true);
    try {
      const r = await setClientPaymentAccount(id_client, cuenta);
      if (r.ok) { setCuenta(r.data.account); setPersonalizada(true); toast.success("Cuenta del cliente guardada"); }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const volverGeneral = async () => {
    setGuardando(true);
    try {
      const r = await resetClientPaymentAccount(id_client);
      if (r.ok) { setCuenta(r.data.account); setPersonalizada(false); toast.success("Ya usa la cuenta general"); }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo restablecer");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3 lg:col-span-1">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Landmark size={18} className="text-muted-foreground/70" />
        Cuenta donde paga este cliente
      </h3>
      <p className="text-xs text-muted-foreground">
        {personalizada
          ? "Este cliente tiene una cuenta propia."
          : "Está usando la cuenta general de Configuración de la app. Si la cambias aquí y guardas, solo cambia para este cliente."}
      </p>
      {cargando ? (
        <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm text-muted-foreground">Cargando...</span></div>
      ) : (
        <>
          <PaymentAccountFields value={cuenta} onChange={setCuenta} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={guardar} disabled={guardando}>
              {guardando ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Guardar
            </Button>
            {personalizada && (
              <Button size="sm" variant="outline" onClick={volverGeneral} disabled={guardando}>
                <Undo2 className="w-3 h-3 mr-1" />
                Usar la cuenta general
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
