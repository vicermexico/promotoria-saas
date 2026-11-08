import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, Download, Loader2, Share, X } from 'lucide-react'

import { driverApi, ApiResponse } from '@/lib/driverApi'

/**
 * Avisos al chofer cada vez que entra al panel:
 *  1) Si no tiene la app instalada, le pide instalarla.
 *  2) Si no ha aceptado las notificaciones, le pide activarlas.
 * Si ya aceptó, su celular se vuelve a registrar en silencio en cada entrada.
 */

const SW_URL = '/sw.js'
const SW_SCOPE = '/chofer/'
const OCULTO_KEY = 'avisos-chofer-oculto'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const esInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

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
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
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
    const k = await driverApi.get<ApiResponse<{ publicKey: string }>>('/drivers/me/push-key')
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(k.data.publicKey) as BufferSource,
    })
  }
  const json = sub.toJSON()
  await driverApi.post('/drivers/me/devices', {
    subscription: { endpoint: json.endpoint, keys: json.keys },
    platform: esIOS() ? 'ios' : 'web',
  })
}

type EstadoPush = 'no-soportado' | 'pendiente' | 'bloqueado' | 'activo'

export default function AvisosChofer() {
  const [instalada, setInstalada] = useState(true)
  const [estadoPush, setEstadoPush] = useState<EstadoPush>('activo')
  const [ocultaInstalar, setOcultaInstalar] = useState(() => sessionStorage.getItem(OCULTO_KEY + '-i') === '1')
  const [ocultaNotif, setOcultaNotif] = useState(() => sessionStorage.getItem(OCULTO_KEY + '-n') === '1')
  const [trabajando, setTrabajando] = useState(false)
  const [tieneInstalador, setTieneInstalador] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)

  const ios = esIOS()

  useEffect(() => {
    setInstalada(esInstalada())

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
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

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
        toast.success('Listo, ya te llegarán los avisos de tus rutas')
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

  const ocultar = (cual: 'i' | 'n') => {
    sessionStorage.setItem(OCULTO_KEY + '-' + cual, '1')
    if (cual === 'i') setOcultaInstalar(true)
    else setOcultaNotif(true)
  }

  const mostrarInstalar = !instalada && !ocultaInstalar
  // En iPhone solo se pueden recibir avisos con la app ya instalada.
  const mostrarNotif = !ocultaNotif && (estadoPush === 'pendiente' || estadoPush === 'bloqueado') && (!ios || instalada)

  if (!mostrarInstalar && !mostrarNotif) return null

  return (
    <div className="px-3 pt-3 space-y-3">
      {mostrarInstalar && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Instala la app en tu celular</p>
              {tieneInstalador ? (
                <p className="text-xs text-muted-foreground mt-0.5">Así la abres con un toque desde tu pantalla de inicio y te llegan los avisos de tus rutas.</p>
              ) : ios ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toca el botón <Share size={12} className="inline -mt-0.5" /> <b>Compartir</b> de Safari y elige <b>“Agregar a pantalla de inicio”</b>. En iPhone es necesario para recibir los avisos.
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
                <button onClick={() => ocultar('i')} className="rounded-lg border border-border text-sm text-muted-foreground px-4 py-2">
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={() => ocultar('i')} aria-label="Cerrar" className="text-muted-foreground p-1 -mr-1 -mt-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {mostrarNotif && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </div>
            <div className="flex-1 min-w-0">
              {estadoPush === 'bloqueado' ? (
                <>
                  <p className="font-semibold text-foreground text-sm">Tus notificaciones están bloqueadas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Para enterarte de tus rutas, actívalas en los ajustes de tu celular o del navegador (permisos de la app → Notificaciones → Permitir) y vuelve a entrar.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground text-sm">Activa las notificaciones</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Te avisamos cuando te asignen una ruta nueva o cuando cambie la que ya tenías.</p>
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
                <button onClick={() => ocultar('n')} className="rounded-lg border border-border text-sm text-muted-foreground px-4 py-2">
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={() => ocultar('n')} aria-label="Cerrar" className="text-muted-foreground p-1 -mr-1 -mt-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
