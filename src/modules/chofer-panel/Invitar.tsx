import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, Clock, Copy, Landmark, Loader2, RefreshCw, Share2, UserPlus, Users } from 'lucide-react'

import { driverApi, ApiResponse } from '@/lib/driverApi'
import { useDriverAuthStore } from '@/stores/driverAuthStore'

/**
 * Pantalla "Afiliación" del chofer: misma que la del promotor en la app.
 * Muestra su código (CH + número), el botón para compartir y la lista de
 * promotores que invitó, con lo que generó cada uno y lo que le toca (10%).
 */

const C = {
  bg: '#F5F3EF',
  teal: '#08303F',
  tile: '#2B5563',
  text: '#1F2937',
  mute: '#6B7280',
  pill: '#ECEAE6',
}
const FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif"
const REGISTRO_URL = 'https://promotoriadigital.app/registro'
const MENSAJE_BASE =
  'Te invito a ganar dinero extra como promotor de Promotoría Digital 💰\n\nDescarga la app y regístrate desde este link:\n{link}'

interface Affiliation {
  code: string
  invited: number
  paid: number
  toPay: number
  pending: number
  earnings: number
}

interface Referral {
  id: number
  name: string
  isActive: boolean
  dt_register: string
  generated: number
  earnedForMe: number
}

interface PaymentInvitee {
  id: number
  name: string
  tasks: number
  amount: number
}

interface Payment {
  id: number
  folio: string | null
  dt_start: string
  dt_end: string
  total: number
  status: 'pagado' | 'por_pagar'
  dt_payment: string | null
  notes: string | null
  invitees: PaymentInvitee[]
}

interface BankAccount {
  id: number
  account_holder_name: string
  account_type: 'CLABE' | 'CARD'
  bank_name: string
  clabe: string | null
  card_number: string | null
}

const fecha = (iso?: string | null) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export default function Invitar() {
  const driver = useDriverAuthStore((s) => s.driver)
  const [aff, setAff] = useState<Affiliation | null>(null)
  const [refs, setRefs] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [bank, setBank] = useState<BankAccount | null>(null)
  const [openPayment, setOpenPayment] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fotoRota, setFotoRota] = useState(false)
  const [form, setForm] = useState({ type: 'CLABE' as 'CLABE' | 'CARD', holder: '', bank: '', number: '' })

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [a, r, p, b] = await Promise.all([
        driverApi.get<ApiResponse<Affiliation>>('/drivers/me/affiliation'),
        driverApi.get<ApiResponse<Referral[]>>('/drivers/me/referrals'),
        driverApi.get<ApiResponse<Payment[]>>('/drivers/me/payments').catch(() => null),
        driverApi.get<ApiResponse<BankAccount | null>>('/drivers/me/bank-account').catch(() => null),
      ])
      setAff(a.data)
      setRefs(r.data ?? [])
      setPayments(p?.data ?? [])
      setBank(b?.data ?? null)
    } catch (e: any) {
      setError(true)
      toast.error(e?.message || 'No se pudo cargar tu información')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const copiar = async () => {
    if (!aff) return
    try {
      await navigator.clipboard.writeText(aff.code)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar el código')
    }
  }

  const compartir = async () => {
    if (!aff) return
    let plantilla = MENSAJE_BASE
    try {
      const res = await driverApi.get<ApiResponse<{ value?: string }>>('/app-config/referral-share-message')
      if (res.data?.value) plantilla = res.data.value
    } catch {
      // se usa el mensaje base
    }
    const link = `${REGISTRO_URL}?ref=${encodeURIComponent(aff.code)}`
    const texto = plantilla.includes('{link}') ? plantilla.replace('{link}', link) : `${plantilla}\n${link}`
    try {
      if (navigator.share) {
        await navigator.share({ text: texto })
        return
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const inicial = (driver?.name || '?').trim().charAt(0).toUpperCase()

  const abrirForm = () => {
    setForm({
      type: bank?.account_type ?? 'CLABE',
      holder: bank?.account_holder_name ?? driver?.name ?? '',
      bank: bank?.bank_name ?? '',
      number: '',
    })
    setShowForm(true)
  }

  const guardarCuenta = async () => {
    setSaving(true)
    try {
      const res = await driverApi.post<ApiResponse<BankAccount>>('/drivers/me/bank-account', {
        account_type: form.type,
        account_holder_name: form.holder,
        bank_name: form.bank,
        number: form.number,
      })
      setBank(res.data)
      setShowForm(false)
      toast.success('Cuenta guardada')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { height: 54, borderRadius: 14, border: '1px solid #E0DDD8', padding: '0 14px', fontSize: 17, width: '100%', background: '#fff', color: C.text }

  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 4rem)', fontFamily: FONT }}>
      <div className="flex items-center justify-between bg-white px-5" style={{ height: 92 }}>
        <h1 className="font-bold" style={{ fontSize: 32, color: C.text }}>
          Afiliación
        </h1>
        <div className="flex items-center gap-5">
          <button type="button" onClick={cargar} aria-label="Actualizar" style={{ color: '#C9C9C9' }}>
            <RefreshCw size={26} className={loading ? 'animate-spin' : ''} />
          </button>
          {driver?.vc_photo && !fotoRota ? (
            <img src={driver.vc_photo} alt="" className="rounded-full object-cover" style={{ width: 52, height: 52 }} onError={() => setFotoRota(true)} />
          ) : (
            <div className="flex items-center justify-center rounded-full font-bold text-white" style={{ width: 52, height: 52, background: C.tile, fontSize: 22 }}>
              {inicial}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-6 pb-8">
        <h2 className="font-bold" style={{ fontSize: 24, color: C.text }}>
          Genera ganancias extra
        </h2>
        <p className="font-semibold" style={{ fontSize: 18, color: C.mute, lineHeight: 1.45, marginTop: 8 }}>
          Invita amigos a que bajen la app y obtén el 10% de sus tareas
        </p>

        <div className="mt-6" style={{ background: C.teal, borderRadius: 28, padding: 22, boxShadow: '0 10px 24px rgba(8,48,63,.28)' }}>
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 items-center justify-center" style={{ width: 62, height: 62, borderRadius: 16, background: C.tile }}>
              <UserPlus size={30} color="#FFFFFF" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold" style={{ fontSize: 15, color: '#A9BDC5' }}>
                Tu código de invitación
              </p>
              {aff ? (
                <p className="font-bold text-white" style={{ fontSize: 36, lineHeight: 1.15 }}>
                  {aff.code}
                </p>
              ) : (
                <div className="flex items-center" style={{ height: 41 }}>
                  {loading ? <Loader2 className="animate-spin text-white" size={26} /> : <span className="text-white">—</span>}
                </div>
              )}
            </div>
            <button type="button" onClick={copiar} disabled={!aff} aria-label="Copiar código" className="shrink-0 text-white">
              <Copy size={30} />
            </button>
          </div>
          <button
            type="button"
            onClick={compartir}
            disabled={!aff}
            className="mt-5 flex w-full items-center justify-center gap-3 bg-white font-bold active:opacity-80"
            style={{ height: 62, borderRadius: 18, fontSize: 21, color: C.teal, opacity: aff ? 1 : 0.6 }}
          >
            <Share2 size={24} /> Compartir invitación
          </button>
        </div>

        {aff && (
          <div className="mt-6">
            <h2 className="font-bold" style={{ fontSize: 28, color: C.text }}>
              Mis ganancias
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { t: 'Total ganado', v: aff.earnings, bg: C.teal, fg: '#FFFFFF', sub: '#A9BDC5' },
                { t: 'Ya me pagaron', v: aff.paid, bg: '#E6F4EA', fg: '#2E7D32', sub: '#4C7A52' },
                { t: 'Corte por pagar', v: aff.toPay, bg: '#FFF3E0', fg: '#E65100', sub: '#A56A2F' },
                { t: 'Aún sin corte', v: aff.pending, bg: '#FFFFFF', fg: C.text, sub: C.mute },
              ].map((x) => (
                <div key={x.t} style={{ background: x.bg, borderRadius: 20, padding: '14px 16px' }}>
                  <p className="font-semibold" style={{ fontSize: 13, color: x.sub }}>{x.t}</p>
                  <p className="font-bold" style={{ fontSize: 22, color: x.fg }}>{money(x.v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-bold" style={{ fontSize: 28, color: C.text }}>
            Mi cuenta para depósitos
          </h2>
          <div className="mt-3 bg-white" style={{ borderRadius: 24, padding: 18 }}>
            {!bank && !showForm && (
              <>
                <div className="flex items-center gap-3">
                  <Landmark size={32} color="#B8B8B8" className="shrink-0" />
                  <p className="font-semibold" style={{ fontSize: 17, color: '#9CA3AF', lineHeight: 1.4 }}>
                    Aún no registras tu cuenta. Sin ella no podemos depositarte tus ganancias.
                  </p>
                </div>
                <button type="button" onClick={abrirForm} className="mt-4 w-full font-bold text-white active:opacity-80" style={{ height: 56, borderRadius: 16, background: C.teal, fontSize: 18 }}>
                  Registrar tarjeta o CLABE
                </button>
              </>
            )}

            {bank && !showForm && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: C.pill }}>
                    <Landmark size={24} color={C.teal} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold" style={{ fontSize: 18, color: C.text }}>{bank.bank_name}</p>
                    <p className="font-semibold" style={{ fontSize: 15, color: C.mute }}>
                      {bank.account_type === 'CLABE' ? 'CLABE' : 'Tarjeta'} {bank.clabe ?? bank.card_number}
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: C.mute }}>{bank.account_holder_name}</p>
                  </div>
                </div>
                <button type="button" onClick={abrirForm} className="mt-4 w-full font-bold active:opacity-80" style={{ height: 50, borderRadius: 14, background: C.pill, color: C.teal, fontSize: 16 }}>
                  Cambiar cuenta
                </button>
              </>
            )}

            {showForm && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['CLABE', 'CARD'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className="flex-1 font-bold"
                      style={{ height: 48, borderRadius: 14, fontSize: 16, background: form.type === t ? C.teal : C.pill, color: form.type === t ? '#fff' : C.teal }}
                    >
                      {t === 'CLABE' ? 'CLABE (18 dígitos)' : 'Tarjeta (16 dígitos)'}
                    </button>
                  ))}
                </div>
                <input style={inputStyle} placeholder="Nombre del titular" value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
                <input style={inputStyle} placeholder="Banco" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
                <input
                  style={inputStyle}
                  placeholder={form.type === 'CLABE' ? 'CLABE interbancaria' : 'Número de tarjeta'}
                  inputMode="numeric"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value.replace(/[^\d\s]/g, '') })}
                />
                <p style={{ fontSize: 13, color: C.mute }}>Tu número se guarda cifrado. Solo master lo consulta para depositarte.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="flex-1 font-bold" style={{ height: 52, borderRadius: 14, background: C.pill, color: C.teal, fontSize: 16 }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={guardarCuenta} disabled={saving} className="flex flex-1 items-center justify-center gap-2 font-bold text-white" style={{ height: 52, borderRadius: 14, background: C.teal, fontSize: 16 }}>
                    {saving && <Loader2 size={18} className="animate-spin" />} Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
          {aff && aff.toPay > 0 && !bank && !showForm && (
            <p className="font-semibold" style={{ fontSize: 14, color: '#E65100', marginTop: 8 }}>
              Tienes {money(aff.toPay)} por pagar: registra tu cuenta para que te depositen.
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <h2 className="font-bold" style={{ fontSize: 28, color: C.text }}>
            Mis invitados
          </h2>
          <span className="flex items-center justify-center font-semibold" style={{ minWidth: 46, height: 46, borderRadius: 16, background: C.pill, color: C.text, fontSize: 18 }}>
            {refs.length}
          </span>
        </div>

        {aff && refs.length > 0 && (
          <p className="font-semibold" style={{ fontSize: 16, color: C.mute, marginTop: 6 }}>
            Llevas ganado {money(aff.earnings)} por tus invitados
          </p>
        )}

        <div className="mt-4 space-y-3">
          {refs.length === 0 ? (
            <div className="flex items-center gap-4 bg-white" style={{ borderRadius: 24, padding: '26px 22px' }}>
              <Users size={44} color="#B8B8B8" className="shrink-0" />
              <p className="font-semibold" style={{ fontSize: 19, color: '#9CA3AF', lineHeight: 1.4 }}>
                {error ? 'No se pudo cargar tu lista. Toca actualizar.' : 'Aún no tienes invitados. Comparte tu código para empezar a ganar.'}
              </p>
            </div>
          ) : (
            refs.map((r) => (
              <div key={r.id} className="bg-white" style={{ borderRadius: 24, padding: 18 }}>
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: 48, height: 48, background: C.pill, color: C.teal, fontSize: 20 }}>
                    {r.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <p className="min-w-0 flex-1 truncate font-bold" style={{ fontSize: 20, color: C.text }}>
                    {r.name}
                  </p>
                  <span
                    className="shrink-0 font-bold"
                    style={{
                      fontSize: 14,
                      borderRadius: 12,
                      padding: '5px 12px',
                      background: r.isActive ? '#E6F4EA' : '#EEEEEE',
                      color: r.isActive ? '#2E7D32' : '#757575',
                    }}
                  >
                    {r.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-3 flex gap-3">
                  <div className="flex-1" style={{ background: '#F5F3EF', borderRadius: 16, padding: '10px 14px' }}>
                    <p className="font-semibold" style={{ fontSize: 13, color: C.mute }}>
                      Ha generado
                    </p>
                    <p className="font-bold" style={{ fontSize: 19, color: C.text }}>
                      {money(r.generated)}
                    </p>
                  </div>
                  <div className="flex-1" style={{ background: '#E6F4EA', borderRadius: 16, padding: '10px 14px' }}>
                    <p className="font-semibold" style={{ fontSize: 13, color: '#4C7A52' }}>
                      Te tocó
                    </p>
                    <p className="font-bold" style={{ fontSize: 19, color: '#2E7D32' }}>
                      {money(r.earnedForMe)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <h2 className="font-bold" style={{ fontSize: 28, color: C.text }}>
            Mis cortes
          </h2>
          <span className="flex items-center justify-center font-semibold" style={{ minWidth: 46, height: 46, borderRadius: 16, background: C.pill, color: C.text, fontSize: 18 }}>
            {payments.length}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {payments.length === 0 ? (
            <div className="flex items-center gap-4 bg-white" style={{ borderRadius: 24, padding: '26px 22px' }}>
              <Clock size={44} color="#B8B8B8" className="shrink-0" />
              <p className="font-semibold" style={{ fontSize: 19, color: '#9CA3AF', lineHeight: 1.4 }}>
                Aún no tienes cortes. Cuando master genere tu corte aparecerá aquí.
              </p>
            </div>
          ) : (
            payments.map((p) => {
              const pagado = p.status === 'pagado'
              const abierto = openPayment === p.id
              return (
                <div key={p.id} className="bg-white" style={{ borderRadius: 24, padding: 18 }}>
                  <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setOpenPayment(abierto ? null : p.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold" style={{ fontSize: 18, color: C.text }}>{p.folio ?? `Corte #${p.id}`}</p>
                      <p style={{ fontSize: 14, color: C.mute }}>
                        Del {fecha(p.dt_start)} al {fecha(p.dt_end)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ fontSize: 20, color: C.text }}>{money(p.total)}</p>
                      <span
                        className="inline-flex items-center gap-1 font-bold"
                        style={{ fontSize: 13, borderRadius: 10, padding: '3px 10px', background: pagado ? '#E6F4EA' : '#FFF3E0', color: pagado ? '#2E7D32' : '#E65100' }}
                      >
                        {pagado ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                        {pagado ? 'Pagado' : 'Por pagar'}
                      </span>
                    </div>
                    <ChevronDown size={20} color={C.mute} className="shrink-0" style={{ transform: abierto ? 'rotate(180deg)' : undefined }} />
                  </button>

                  {abierto && (
                    <div className="mt-3 space-y-2" style={{ borderTop: '1px solid #EEE', paddingTop: 12 }}>
                      {pagado && p.dt_payment && (
                        <p className="font-semibold" style={{ fontSize: 14, color: '#2E7D32' }}>Pagado el {fecha(p.dt_payment)}</p>
                      )}
                      {p.notes && <p style={{ fontSize: 14, color: C.mute }}>Nota: {p.notes}</p>}
                      {p.invitees.map((i) => (
                        <div key={i.id} className="flex items-center justify-between" style={{ fontSize: 15, color: C.text }}>
                          <span className="min-w-0 flex-1 truncate">{i.name} · {i.tasks} tarea{i.tasks !== 1 ? 's' : ''}</span>
                          <span className="font-bold">{money(i.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
