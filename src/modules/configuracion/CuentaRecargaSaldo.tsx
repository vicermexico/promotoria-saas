import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Save, Wallet } from "lucide-react"

import { Button } from "@/components"
import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api"
import type { PaymentAccount } from "@/Fetch/appConfig"
import { PaymentAccountFields, EMPTY_PAYMENT_ACCOUNT } from "@/modules/finanzas/components/PaymentAccountFields"

export function CuentaRecargaSaldo() {
  const [cuenta, setCuenta] = useState<PaymentAccount>(EMPTY_PAYMENT_ACCOUNT);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<PaymentAccount>>("/balance/bank-info")
      .then((r) => { if (r.ok) setCuenta({ ...EMPTY_PAYMENT_ACCOUNT, ...r.data }); })
      .catch(() => toast.error("Error al cargar la cuenta de recargas"));
  }, []);

  const guardar = async () => {
    if (!cuenta.clabe.trim() && !cuenta.account.trim()) {
      toast.error("Pon al menos la CLABE o el número de cuenta");
      return;
    }
    setGuardando(true);
    try {
      const r = await api.put<ApiResponse<PaymentAccount>>("/balance/bank-info", cuenta);
      if (r.ok) toast.success("Cuenta de recargas guardada");
      else toast.error(r.message || "No se pudo guardar");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar la cuenta");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-success" />
        <h3 className="font-semibold text-foreground">Cuenta para recargar saldo (clientes sin crédito)</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Es la cuenta donde los clientes que pagan por adelantado (sin crédito) depositan para recargar su saldo. Les sale en su pantalla de recargar saldo. Es la misma que se ve en Recargas.
      </p>
      <PaymentAccountFields value={cuenta} onChange={setCuenta} />
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar cuenta de recargas
      </Button>
    </div>
  );
}
