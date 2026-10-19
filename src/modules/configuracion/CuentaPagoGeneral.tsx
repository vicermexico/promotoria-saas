import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, Landmark } from "lucide-react"

import { Button } from "@/components"
import { getDefaultPaymentAccount, setDefaultPaymentAccount, PaymentAccount } from "@/Fetch/appConfig"
import { PaymentAccountFields, EMPTY_PAYMENT_ACCOUNT } from "@/modules/finanzas/components/PaymentAccountFields"

export function CuentaPagoGeneral() {
  const [cuenta, setCuenta] = useState<PaymentAccount>(EMPTY_PAYMENT_ACCOUNT);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getDefaultPaymentAccount()
      .then((r) => { if (r.ok) setCuenta(r.data); })
      .catch(() => toast.error("Error al cargar la cuenta de pagos"));
  }, []);

  const guardar = async () => {
    if (!cuenta.clabe.trim() && !cuenta.account.trim()) {
      toast.error("Pon al menos la CLABE o el número de cuenta");
      return;
    }
    setGuardando(true);
    try {
      const r = await setDefaultPaymentAccount(cuenta);
      if (r.ok) {
        setCuenta(r.data);
        toast.success("Cuenta guardada");
      }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar la cuenta");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Landmark className="w-5 h-5 text-success" />
        <h3 className="font-semibold text-foreground">Cuenta para recibir pagos de clientes</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Es la cuenta donde los clientes depositan sus facturas. Les sale al darle "Pagar". Si a un cliente le quieres dar otra cuenta, entra a la info de ese cliente y ahí la cambias.
      </p>
      <PaymentAccountFields value={cuenta} onChange={setCuenta} />
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar cuenta
      </Button>
    </div>
  );
}
