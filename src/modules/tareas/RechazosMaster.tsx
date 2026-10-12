import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'
import { useAuthStore } from '@/stores'

interface Rechazo {
  id_task: number
  id_order: number
  order_folio: string | null
  id_client: number
  client_name: string | null
  store_name: string | null
  promoter_name: string | null
  reason: string | null
  dt_rejected: string
}

type Accion = { id: number; tipo: 'confirmar' | 'mantener' } | null

const fecha = (s: string) => {
  try {
    return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40'

export default function RechazosMaster() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [items, setItems] = useState<Rechazo[]>([])
  const [cargando, setCargando] = useState(false)
  const [accion, setAccion] = useState<Accion>(null)
  const [nota, setNota] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api.get<ApiResponse<Rechazo[]>>('/tasks/disputes')
      setItems(r.ok ? r.data : [])
    } catch {
      toast.error('No se pudieron cargar los rechazos')
      setItems([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (user?.i_rol !== 1) {
    return <div className="p-6 text-sm text-muted-foreground">Esta pantalla es solo para el administrador principal.</div>
  }

  const resolver = async () => {
    if (!accion) return
    if (accion.tipo === 'mantener' && !nota.trim()) {
      toast.error('Escribe el motivo por el que se mantiene aceptada')
      return
    }
    setTrabajando(true)
    try {
      const ruta = accion.tipo === 'confirmar' ? 'confirm' : 'uphold'
      const r = await api.patch<ApiResponse<unknown>>(`/tasks/${accion.id}/dispute/${ruta}`, { note: nota.trim() })
      if (r.ok) {
        toast.success(r.message || 'Listo')
        setAccion(null)
        setNota('')
        cargar()
        window.dispatchEvent(new Event('saldo:actualizar'))
      } else {
        toast.error(r.message || 'No se pudo completar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo completar')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rechazos por revisar</h1>
          <p className="text-sm text-muted-foreground">
            Visitas que el cliente rechazó. Revisa el trabajo y decide: si hubo error del promotor, confirma el rechazo y
            el dinero regresa al cliente; si no, mantén la visita aceptada.
          </p>
        </div>
        <button onClick={cargar} className="rounded-md border border-border px-3 py-1.5 text-sm shrink-0">
          Actualizar
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay rechazos pendientes de revisión.</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id_task} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium">{t.client_name || `Cliente ${t.id_client}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Orden {t.order_folio || `#${t.id_order}`} · Visita #{t.id_task}
                  </p>
                  <p className="text-sm">Tienda: {t.store_name || '—'}</p>
                  <p className="text-sm">Promotor: {t.promoter_name || '—'}</p>
                </div>
                <p className="text-xs text-muted-foreground">Rechazada: {fecha(t.dt_rejected)}</p>
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Motivo del cliente</p>
                <p className="text-sm">{t.reason || 'Sin motivo'}</p>
              </div>

              {accion?.id === t.id_task ? (
                <div className="space-y-2">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={nota}
                    placeholder={
                      accion.tipo === 'mantener'
                        ? 'Motivo por el que NO se rechaza (obligatorio, lo verá el cliente)'
                        : 'Nota (opcional)'
                    }
                    onChange={(e) => setNota(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={resolver}
                      disabled={trabajando}
                      className={`rounded-md px-3 py-1.5 text-sm text-white disabled:opacity-60 ${
                        accion.tipo === 'confirmar' ? 'bg-destructive' : 'bg-primary'
                      }`}
                    >
                      {trabajando
                        ? 'Guardando…'
                        : accion.tipo === 'confirmar'
                          ? 'Sí, confirmar rechazo y devolver dinero'
                          : 'Sí, mantener aceptada y pagar al promotor'}
                    </button>
                    <button
                      onClick={() => {
                        setAccion(null)
                        setNota('')
                      }}
                      className="rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/tareas/${t.id_task}`)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm"
                  >
                    Ver trabajo completo
                  </button>
                  <button
                    onClick={() => {
                      setAccion({ id: t.id_task, tipo: 'confirmar' })
                      setNota('')
                    }}
                    className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white"
                  >
                    Confirmar rechazo
                  </button>
                  <button
                    onClick={() => {
                      setAccion({ id: t.id_task, tipo: 'mantener' })
                      setNota('')
                    }}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  >
                    Mantener aceptada
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
