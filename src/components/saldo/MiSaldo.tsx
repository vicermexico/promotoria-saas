import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'
import HistorialSaldo from './HistorialSaldo'
import { useSaldo } from './useSaldo'

interface Recarga {
  id_topup: number
  f_amount: number | string
  vc_receipt_url: string | null
  vc_reference: string | null
  id_status: number
  vc_rejection_reason: string | null
  dt_register: string
  requester_name?: string | null
}

interface Lista {
  data: Recarga[]
}

const mxn = (n: number | string) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const fecha = (s: string) => {
  try {
    return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

const ESTADOS: Record<number, { label: string; cls: string }> = {
  1: { label: 'En revisión', cls: 'text-amber-600' },
  2: { label: 'Aprobada', cls: 'text-green-600' },
  3: { label: 'Rechazada', cls: 'text-red-600' },
}

export default function MiSaldo() {
  const { summary } = useSaldo()
  const [recargas, setRecargas] = useState<Recarga[]>([])

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<Lista>>('/balance/topups?limit=30')
      if (r.ok) setRecargas(r.data.data)
    } catch {
      /* sin conexion */
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const h = () => {
      cargar()
    }
    window.addEventListener('saldo:actualizar', h)
    return () => window.removeEventListener('saldo:actualizar', h)
  }, [cargar])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Mi saldo</h1>
        {summary && <p className="text-sm text-muted-foreground">Saldo actual: {mxn(summary.f_balance)}</p>}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Mis recargas</h2>
        {recargas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has enviado recargas.</p>
        ) : (
          recargas.map((r) => {
            const e = ESTADOS[r.id_status] ?? { label: '', cls: '' }
            return (
              <div key={r.id_topup} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className={`text-sm font-medium ${e.cls}`}>{e.label}</p>
                  {r.requester_name && <p className="text-xs text-muted-foreground">Envió: {r.requester_name}</p>}
                  {r.vc_reference && <p className="text-xs text-muted-foreground">Referencia: {r.vc_reference}</p>}
                  {r.id_status === 3 && r.vc_rejection_reason && (
                    <p className="text-xs text-red-600">Motivo: {r.vc_rejection_reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{fecha(r.dt_register)}</p>
                  {r.vc_receipt_url && (
                    <a href={r.vc_receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      Ver comprobante
                    </a>
                  )}
                </div>
                <p className="text-base font-semibold tabular-nums shrink-0">{mxn(r.f_amount)}</p>
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Movimientos de mi saldo</h2>
        <HistorialSaldo />
      </section>
    </div>
  )
}
