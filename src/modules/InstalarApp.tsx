import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { BellRing, Download, Loader2, Share, X } from 'lucide-react'

import { useAuthStore } from '@/stores'
import { api, type ApiResponse } from '@/lib/api'

/**
 * Avisos de la app para master y cliente (solo después de iniciar sesión):
 *  1) Si no tienen la app instalada, se les pide instalarla.
 *  2) Si no han aceptado las notificaciones, se les pide activarlas.
 * Si ya la instalaron y ya aceptaron, no sale nada y su celular se registra en silencio al entrar.
 * El chofer tiene su propio aviso dentro de su panel (AvisosChofer), por eso aquí no sale en /chofer.
 * "Ahora no" solo oculta el aviso durante esa visita.
 */

const OCULTO_KEY = 'instalar-app-oculto'
const OCULTO_NOTIF_KEY = 'avisos-staff-oculto'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const esInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

const leerOculto = (k: string) => {
  try {
    return sessionStorage.getItem(k) === '1'
  } catch {
    return false
  }
}
const guardarOculto = (k: string) => {
  try {
    sessionStorage.setItem(k, '1')
  } catch {
    /* sin storage */
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return reg
  } catch (e) {
    console.error('No se pudo registrar el service worker', e)
    return null
  }
}

/** Suscribe este navegador a los avisos y le avisa al servidor. */
async function suscribirYGuardar(reg: ServiceWorkerRegistration): Promise<void> {
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const k = await api.get<ApiResponse<{ publicKey: string }>>('/users/me/push-key')
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(k.data.publicKey) as BufferSource,
    })
  }
  const json = sub.toJSON()
  await api.post('/users/me/devices', {
    subscription: { endpoint: json.endpoint, keys: json.keys },
    platform: esIOS() ? 'ios' : 'web',
  })
}

type EstadoPush = 'no-soportado' | 'pendiente' | 'bloqueado' | 'activo'

export default function InstalarApp() {
  const { pathname } = useLocation()
  const token = useAuthStore((s) => s.token)
  const [instalada, setInstalada] = useState(true)
  const [oculta, setOculta] = useState(() => leerOculto(OCULTO_KEY))
  const [ocultaNotif, setOcultaNotif] = useState(() => leerOculto(OCULTO_NOTIF_KEY))
  const [tieneInstalador, setTieneInstalador] = useState(false)
  const [estadoPush, setEstadoPush] = useState<EstadoPush>('activo')
  const [trabajando, setTrabajando] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)
  const ios = esIOS()

  const enZonaChofer = pathname.startsWith('/chofer')
  const permitido = !enZonaChofer && !!token

  useEffect(() => {
    setInstalada(esInstalada())

    // El service worker es lo que permite que el navegador ofrezca instalar la app.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setTieneInstalador(true)
    }
    const onInstalled = () => {
      setInstalada(true)
      promptRef.current = null
      setTieneInstalador(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Con sesión iniciada: revisa el estado de las notificaciones y, si ya las aceptó,
  // registra este celular en silencio.
  useEffect(() => {
    if (!permitido) return
    let cancelado = false
    ;(async () => {
      const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!soporta) {
        if (!cancelado) setEstadoPush('no-soportado')
        return
      }
      const reg = await registrarServiceWorker()
      if (cancelado) return
      regRef.current = reg
      if (!reg) {
        setEstadoPush('no-soportado')
        return
      }
      if (Notification.permission === 'granted') {
        try {
          await suscribirYGuardar(reg)
          if (!cancelado) setEstadoPush('activo')
        } catch (e) {
          console.error('No se pudo registrar el celular para avisos', e)
          if (!cancelado) setEstadoPush('pendiente')
        }
      } else if (Notification.permission === 'denied') {
        setEstadoPush('bloqueado')
      } else {
        setEstadoPush('pendiente')
      }
    })()
    return () => {
      cancelado = true
    }
  }, [permitido, token])

  const instalar = useCallback(async () => {
    const p = promptRef.current
    if (!p) return
    await p.prompt()
    const r = await p.userChoice
    if (r.outcome === 'accepted') setInstalada(true)
    promptRef.current = null
    setTieneInstalador(false)
  }, [])

  const activarNotificaciones = useCallback(async () => {
    setTrabajando(true)
    try {
      const reg = regRef.current ?? (await registrarServiceWorker())
      if (!reg) {
        toast.error('Tu navegador no permite notificaciones')
        return
      }
      regRef.current = reg
      const permiso = await Notification.requestPermission()
      if (permiso === 'granted') {
        await suscribirYGuardar(reg)
        setEstadoPush('activo')
        toast.success('Listo, ya te llegarán los avisos importantes')
      } else if (permiso === 'denied') {
        setEstadoPush('bloqueado')
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudieron activar las notificaciones. Intenta de nuevo.')
    } finally {
      setTrabajando(false)
    }
  }, [])

  const ocultar = () => {
    guardarOculto(OCULTO_KEY)
    setOculta(true)
  }
  const ocultarNotif = () => {
    guardarOculto(OCULTO_NOTIF_KEY)
    setOcultaNotif(true)
  }

  const mostrarInstalar = !instalada && !oculta
  // En iPhone solo se pueden recibir avisos con la app ya instalada.
  const mostrarNotif = !ocultaNotif && (estadoPush === 'pendiente' || estadoPush === 'bloqueado') && (!ios || instalada)

  if (!permitido || (!mostrarInstalar && !mostrarNotif)) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-50 space-y-3">
      {mostrarInstalar && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Instala la app de Promotoría</p>
              {tieneInstalador ? (
                <p className="text-xs text-muted-foreground mt-0.5">Ábrela con un toque desde tu pantalla de inicio, sin buscarla en el navegador.</p>
              ) : ios ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toca el botón <Share size={12} className="inline -mt-0.5" /> <b>Compartir</b> de Safari y elige <b>“Agregar a pantalla de inicio”</b>. En iPhone es necesario para recibir avisos.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Abre el menú del navegador (los tres puntos) y elige <b>“Instalar app”</b> o <b>“Agregar a pantalla de inicio”</b>.
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {tieneInstalador && (
                  <button onClick={instalar} className="rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2">
                    Instalar
                  </button>
                )}
                <button onClick={ocultar} className="rounded-lg border border-border text-sm text-muted-foreground px-4 py-2">
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={ocultar} aria-label="Cerrar" className="text-muted-foreground p-1 -mr-1 -mt-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {mostrarNotif && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </div>
            <div className="flex-1 min-w-0">
              {estadoPush === 'bloqueado' ? (
                <>
                  <p className="font-semibold text-foreground text-sm">Tus notificaciones están bloqueadas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Para enterarte de lo importante, actívalas en los ajustes de tu celular o del navegador (permisos de la app → Notificaciones → Permitir) y vuelve a entrar.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground text-sm">Activa las notificaciones</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Te avisamos al momento de lo importante: recargas, pagos, visitas por revisar y facturas.</p>
                </>
              )}
              <div className="flex gap-2 mt-3">
                {estadoPush === 'pendiente' && (
                  <button
                    onClick={activarNotificaciones}
                    disabled={trabajando}
                    className="rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 flex items-center gap-2 disabled:opacity-60"
                  >
                    {trabajando && <Loader2 size={14} className="animate-spin" />}
                    Activar notificaciones
                  </button>
                )}
                <button onClick={ocultarNotif} className="rounded-lg border border-border text-sm text-muted-foreground px-4 py-2">
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={ocultarNotif} aria-label="Cerrar" className="text-muted-foreground p-1 -mr-1 -mt-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
