import { Input, Textarea } from "@/components"
import type { PaymentAccount } from "@/Fetch/appConfig"

export const EMPTY_PAYMENT_ACCOUNT: PaymentAccount = { bank: "", holder: "", clabe: "", account: "", instructions: "" };

interface Props {
  value: PaymentAccount;
  onChange: (v: PaymentAccount) => void;
}

export function PaymentAccountFields({ value, onChange }: Props) {
  const set = (k: keyof PaymentAccount) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Banco</label>
        <Input value={value.bank} onChange={set("bank")} placeholder="Ej. BBVA" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Titular de la cuenta</label>
        <Input value={value.holder} onChange={set("holder")} />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">CLABE interbancaria</label>
        <Input value={value.clabe} onChange={set("clabe")} />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Número de cuenta o tarjeta (opcional)</label>
        <Input value={value.account} onChange={set("account")} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-muted-foreground mb-1 block">Indicaciones (opcional)</label>
        <Textarea value={value.instructions} onChange={set("instructions")} rows={2} placeholder="Ej. En el concepto pon tu folio de factura" />
      </div>
    </div>
  );
}
