import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Loader2, RefreshCw, Share2, UserPlus, Users } from 'lucide-react'

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

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export default function Invitar() {
  const driver = useDriverAuthStore((s) => s.driver)
  const [aff, setAff] = useState<Affiliation | null>(null)
  const [refs, setRefs] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [a, r] = await Promise.all([
        driverApi.get<ApiResponse<Affiliation>>('/drivers/me/affiliation'),
        driverApi.get<ApiResponse<Referral[]>>('/drivers/me/referrals'),
      ])
      setAff(a.data)
      setRefs(r.data ?? [])
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
          {driver?.vc_photo ? (
            <img src={driver.vc_photo} alt="" className="rounded-full object-cover" style={{ width: 52, height: 52 }} />
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
      </div>
    </div>
  )
}
