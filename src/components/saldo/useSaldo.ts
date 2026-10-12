import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores'

export interface SaldoSummary {
  id_client: number
  name: string | null
  vc_payment_mode: string
  f_balance: number
  pending_topups: number
}

/**
 * Saldo del cliente. Para el cliente (rol 2) siempre es el de su sesion;
 * para el master (rol 1) es el del cliente que se le pase.
 */
export function useSaldo(idClientParam?: number | null) {
  const user = useAuthStore((s) => s.user)
  const rol = user?.i_rol
  const idClient = rol === 2 ? null : (idClientParam ?? null)
  const habilitado = rol === 2 || (rol === 1 && !!idClient)
  const [summary, setSummary] = useState<SaldoSummary | null>(null)

  const reload = useCallback(async () => {
    if (!habilitado) {
      setSummary(null)
      return
    }
    try {
      const qs = rol === 2 ? '' : `?id_client=${idClient}`
      const res = await api.get<ApiResponse<SaldoSummary>>(`/balance/summary${qs}`)
      setSummary(res.ok ? res.data : null)
    } catch {
      setSummary(null)
    }
  }, [habilitado, rol, idClient])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const h = () => {
      reload()
    }
    window.addEventListener('saldo:actualizar', h)
    return () => window.removeEventListener('saldo:actualizar', h)
  }, [reload])

  return { summary, reload }
}
