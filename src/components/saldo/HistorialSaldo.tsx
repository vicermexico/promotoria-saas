import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'

interface Mov {
  id_movement: number
  id_client: number
  vc_type: string
  f_amount: number | string
  f_balance_after: number | string
  vc_note: string | null
  dt_register: string
  user_name?: string | null
  client_name?: string | null
}

interface Resp {
  data: Mov[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface Opciones {
  clients: { id_client: number; name: string | null }[]
  users: { id_user: number; name: string }[]
}

interface Filtros {
  from: string
  to: string
  id_user: string
  id_client: string
}

const FILTROS_VACIOS: Filtros = { from: '', to: '', id_user: '', id_client: '' }

const TIPOS: Record<string, { label: string; verbo: string }> = {
  RECARGA: { label: 'Recarga', verbo: 'Autorizó' },
  CARGO_PEDIDO: { label: 'Cargo por orden de visita', verbo: 'Creó la orden' },
  DEVOLUCION: { label: 'Devolución', verbo: 'Registró' },
  AJUSTE: { label: 'Ajuste manual', verbo: 'Ajustó' },
}

const mxn = (n: number | string) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const fecha = (s: string) => {
  try {
    return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return s
  }
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const inputCls =
  'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40'

export default function HistorialSaldo({ global = false }: { global?: boolean }) {
  const [items, setItems] = useState<Mov[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [opciones, setOpciones] = useState<Opciones>({ clients: [], users: [] })

  useEffect(() => {
    api
      .get<ApiResponse<Opciones>>('/balance/movement-filters')
      .then((r) => {
        if (r.ok) setOpciones(r.data)
      })
      .catch(() => undefined)
  }, [])

  const cargar = useCallback(
    async (p: number) => {
      setCargando(true)
      try {
        const qs = new URLSearchParams({ page: String(p), limit: '30' })
        if (filtros.from) qs.set('from', filtros.from)
        if (filtros.to) qs.set('to', filtros.to)
        if (filtros.id_user) qs.set('id_user', filtros.id_user)
        if (global && filtros.id_client) qs.set('id_client', filtros.id_client)
        const r = await api.get<ApiResponse<Resp>>(`/balance/movements?${qs.toString()}`)
        if (r.ok) {
          setItems((prev) => (p === 1 ? r.data.data : [...prev, ...r.data.data]))
          setPage(p)
          setTotalPages(r.data.meta.totalPages)
          setTotal(r.data.meta.total)
        }
      } catch {
        /* sin conexion: se queda como esta */
      } finally {
        setCargando(false)
      }
    },
    [filtros, global],
  )

  useEffect(() => {
    cargar(1)
  }, [cargar])

  useEffect(() => {
    const h = () => {
      cargar(1)
    }
    window.addEventListener('saldo:actualizar', h)
    return () => window.removeEventListener('saldo:actualizar', h)
  }, [cargar])

  const poner = (k: keyof Filtros, v: string) => setFiltros((f) => ({ ...f, [k]: v }))

  const atajo = (dias: number | 'mes') => {
    const hoy = new Date()
    const desde = new Date()
    if (dias === 'mes') desde.setDate(1)
    else desde.setDate(hoy.getDate() - dias)
    setFiltros((f) => ({ ...f, from: ymd(desde), to: ymd(hoy) }))
  }

  const hayFiltros = Object.values(filtros).some(Boolean)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Desde</span>
            <input type="date" className={inputCls} value={filtros.from} onChange={(e) => poner('from', e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Hasta</span>
            <input type="date" className={inputCls} value={filtros.to} onChange={(e) => poner('to', e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Quién lo hizo</span>
            <select className={inputCls} value={filtros.id_user} onChange={(e) => poner('id_user', e.target.value)}>
              <option value="">Todos</option>
              {opciones.users.map((u) => (
                <option key={u.id_user} value={u.id_user}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          {global && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Cliente</span>
              <select className={inputCls} value={filtros.id_client} onChange={(e) => poner('id_client', e.target.value)}>
                <option value="">Todos</option>
                {opciones.clients.map((c) => (
                  <option key={c.id_client} value={c.id_client}>
                    {c.name || `Cliente ${c.id_client}`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => atajo(0)} className="rounded-md border border-border px-2.5 py-1 text-xs">
            Hoy
          </button>
          <button type="button" onClick={() => atajo(6)} className="rounded-md border border-border px-2.5 py-1 text-xs">
            Últimos 7 días
          </button>
          <button type="button" onClick={() => atajo('mes')} className="rounded-md border border-border px-2.5 py-1 text-xs">
            Este mes
          </button>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_VACIOS)}
              className="rounded-md px-2.5 py-1 text-xs text-primary underline"
            >
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {total} movimiento{total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {!cargando && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hayFiltros ? 'No hay movimientos con estos filtros.' : 'Todavía no hay movimientos.'}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => {
            const t = TIPOS[m.vc_type] ?? { label: m.vc_type, verbo: 'Por' }
            const monto = Number(m.f_amount)
            return (
              <div key={m.id_movement} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{t.label}</p>
                  {global && m.client_name && <p className="text-xs">Cliente: {m.client_name}</p>}
                  {m.vc_note && <p className="text-xs text-muted-foreground">{m.vc_note}</p>}
                  {m.user_name && (
                    <p className="text-xs text-muted-foreground">
                      {!global && m.vc_type === 'RECARGA' ? 'Recargó' : t.verbo}: {m.user_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{fecha(m.dt_register)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-semibold tabular-nums ${monto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monto >= 0 ? '+' : ''}
                    {mxn(monto)}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo: {mxn(m.f_balance_after)}</p>
                </div>
              </div>
            )
          })}
          {page < totalPages && (
            <button
              onClick={() => cargar(page + 1)}
              disabled={cargando}
              className="w-full rounded-md border border-border py-2 text-sm disabled:opacity-60"
            >
              {cargando ? 'Cargando…' : 'Ver más'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
