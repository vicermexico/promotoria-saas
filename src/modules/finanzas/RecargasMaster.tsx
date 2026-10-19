import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores'
import HistorialSaldo from '@/components/saldo/HistorialSaldo'

interface Banco {
  bank: string
  holder: string
  clabe: string
  account: string
  instructions: string
}

interface Recarga {
  id_topup: number
  id_client: number
  f_amount: number | string
  vc_receipt_url: string | null
  vc_reference: string | null
  id_status: number
  vc_rejection_reason: string | null
  requester_name?: string | null
  validator_name?: string | null
  dt_resolved?: string | null
  dt_register: string
  client?: { id_client: number; name: string | null }
}

interface Lista {
  data: Recarga[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const BANCO_VACIO: Banco = { bank: '', holder: '', clabe: '', account: '', instructions: '' }

const dinero = (n: number | string) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const fecha = (s: string) => {
  try {
    return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

const TABS = [
  { id: 1, label: 'Pendientes' },
  { id: 2, label: 'Aprobadas' },
  { id: 3, label: 'Rechazadas' },
  { id: 0, label: 'Movimientos' },
]

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40'

export default function RecargasMaster() {
  const user = useAuthStore((s) => s.user)
  const [estado, setEstado] = useState<number>(1)
  const [lista, setLista] = useState<Recarga[]>([])
  const [cargando, setCargando] = useState(false)
  const [rechazandoId, setRechazandoId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [trabajandoId, setTrabajandoId] = useState<number | null>(null)

  const cargarLista = useCallback(async () => {
    if (estado === 0) return
    setCargando(true)
    try {
      const r = await api.get<ApiResponse<Lista>>(`/balance/topups?id_status=${estado}&limit=50`)
      setLista(r.ok ? r.data.data : [])
    } catch {
      toast.error('No se pudieron cargar las recargas')
      setLista([])
    } finally {
      setCargando(false)
    }
  }, [estado])

  useEffect(() => {
    cargarLista()
  }, [cargarLista])

  if (user?.i_rol !== 1) {
    return <div className="p-6 text-sm text-muted-foreground">Esta pantalla es solo para el administrador principal.</div>
  }

  const aprobar = async (r: Recarga) => {
    const nombre = r.client?.name || `cliente ${r.id_client}`
    if (!window.confirm(`¿Aprobar ${dinero(r.f_amount)} para ${nombre}? Se acredita al saldo en este momento.`)) return
    setTrabajandoId(r.id_topup)
    try {
      const res = await api.patch<ApiResponse<unknown>>(`/balance/topups/${r.id_topup}/approve`, {})
      if (res.ok) {
        toast.success(res.message || 'Recarga aprobada')
        window.dispatchEvent(new Event('saldo:actualizar'))
        cargarLista()
      } else {
        toast.error(res.message || 'No se pudo aprobar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo aprobar')
    } finally {
      setTrabajandoId(null)
    }
  }

  const rechazar = async (r: Recarga) => {
    if (!motivo.trim()) {
      toast.error('Escribe el motivo del rechazo')
      return
    }
    setTrabajandoId(r.id_topup)
    try {
      const res = await api.patch<ApiResponse<unknown>>(`/balance/topups/${r.id_topup}/reject`, { reason: motivo.trim() })
      if (res.ok) {
        toast.success(res.message || 'Recarga rechazada')
        setRechazandoId(null)
        setMotivo('')
        cargarLista()
      } else {
        toast.error(res.message || 'No se pudo rechazar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo rechazar')
    } finally {
      setTrabajandoId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Ingresos de recargas de saldo</h1>
        <p className="text-sm text-muted-foreground">Comprobantes de las recargas que mandan los clientes sin crédito, por aprobar. La cuenta donde depositan se cambia en Configurar app → Cuentas de pago.</p>
      </div>

      <section className="space-y-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setEstado(t.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                estado === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {estado === 0 ? (
          <HistorialSaldo global />
        ) : cargando ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay recargas en esta lista.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((r) => (
              <div key={r.id_topup} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.client?.name || `Cliente ${r.id_client}`}</p>
                    <p className="text-xs text-muted-foreground">{fecha(r.dt_register)}</p>
                  </div>
                  <p className="text-lg font-semibold">{dinero(r.f_amount)}</p>
                </div>
                {r.requester_name && <p className="text-sm">Pidió: {r.requester_name}</p>}
                {r.id_status !== 1 && (
                  <p className="text-sm">
                    {r.id_status === 2 ? 'Autorizó' : 'Rechazó'}: {r.validator_name || 'sin dato'}
                    {r.dt_resolved ? ` · ${fecha(r.dt_resolved)}` : ''}
                  </p>
                )}
                {r.vc_reference && <p className="text-sm">Referencia: {r.vc_reference}</p>}
                {r.vc_receipt_url ? (
                  <a href={r.vc_receipt_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                    Ver comprobante
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin comprobante visible</p>
                )}
                {r.id_status === 3 && r.vc_rejection_reason && (
                  <p className="text-sm text-destructive">Motivo: {r.vc_rejection_reason}</p>
                )}

                {r.id_status === 1 && (
                  <div className="pt-1 space-y-2">
                    {rechazandoId === r.id_topup ? (
                      <div className="space-y-2">
                        <input
                          className={inputCls}
                          placeholder="Motivo del rechazo"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => rechazar(r)}
                            disabled={trabajandoId === r.id_topup}
                            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white disabled:opacity-60"
                          >
                            Confirmar rechazo
                          </button>
                          <button
                            onClick={() => {
                              setRechazandoId(null)
                              setMotivo('')
                            }}
                            className="rounded-md border border-border px-3 py-1.5 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => aprobar(r)}
                          disabled={trabajandoId === r.id_topup}
                          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"
                        >
                          Aprobar y abonar
                        </button>
                        <button
                          onClick={() => {
                            setRechazandoId(r.id_topup)
                            setMotivo('')
                          }}
                          className="rounded-md border border-border px-3 py-1.5 text-sm"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
