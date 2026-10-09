import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

import { api, ApiResponse } from '@/lib'

type Estado = 'apagado' | 'hablando' | 'escuchando' | 'pensando'

const SALUDO_RESPALDO = '¡Hola! ¿En qué te puedo ayudar con tu panel?'
const NO_ENTENDI = 'No encontré una respuesta para eso. ¿Puedes decirlo de otra forma?'
const DESPEDIDA = 'Hasta luego.'

function quitarAcentos(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const DESPEDIDAS = [
  'adios', 'bye', 'bye bye', 'bai', 'bay', 'goodbye', 'good bye', 'god bye',
  'hasta pronto', 'hasta luego', 'hasta la vista', 'hasta manana', 'nos vemos', 'chao', 'ciao',
  'cierrate', 'cuelga', 'colgar', 'terminar la llamada', 'terminar llamada',
  'ya no ocupo nada mas', 'ya no necesito nada mas', 'no necesito nada mas', 'eso es todo',
  'caso cerrado', 'see you later', 'si yu leiter', 'siyulerer',
]

function esDespedida(texto: string): boolean {
  const t = quitarAcentos(texto).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (t === 'fin' || t === 'el fin' || t === 'fin de la llamada') return true
  if (t.split(' ').length > 6) return false
  return DESPEDIDAS.some((d) => (' ' + t + ' ').includes(' ' + d + ' '))
}

function hablarTexto(texto: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-MX'
    const voces = window.speechSynthesis.getVoices()
    const voz = voces.find((v) => v.lang === 'es-MX') || voces.find((v) => v.lang.startsWith('es'))
    if (voz) u.voice = voz
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

const ETIQUETA: Record<Estado, string> = {
  apagado: '',
  hablando: 'Hablando…',
  escuchando: 'Escuchando…',
  pensando: 'Pensando…',
}

export function AsistenteCliente() {
  const [estado, setEstado] = useState<Estado>('apagado')
  const activo = useRef(false)
  const navigate = useNavigate()
  const reco = useRef<any>(null)

  const detener = () => {
    activo.current = false
    try {
      reco.current?.abort()
    } catch {
      // nada
    }
    reco.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setEstado('apagado')
  }

  const responder = async (texto: string) => {
    if (!activo.current) return
    if (esDespedida(texto)) {
      setEstado('hablando')
      await hablarTexto(DESPEDIDA)
      detener()
      return
    }
    setEstado('pensando')
    let mensaje = NO_ENTENDI
    let destino: string | null = null
    try {
      const res = await api.post<ApiResponse<{ matched: boolean; vc_answer_text: string | null; vc_route?: string | null }>>(
        '/faq-cliente/ask',
        { message: texto },
      )
      if (res.data?.matched && res.data.vc_answer_text) {
        mensaje = res.data.vc_answer_text
        destino = res.data.vc_route || null
      }
    } catch (error) {
      console.error('Error al consultar el asistente:', error)
    }
    if (!activo.current) return
    setEstado('hablando')
    if (destino) navigate(destino)
    await hablarTexto(mensaje)
    escuchar()
  }

  const escuchar = () => {
    if (!activo.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return detener()
    setEstado('escuchando')
    const r = new SR()
    r.lang = 'es-MX'
    r.interimResults = false
    r.continuous = false
    let texto = ''
    r.onresult = (e: any) => {
      texto = e.results?.[0]?.[0]?.transcript || ''
    }
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Permite el uso del micrófono en tu navegador para hablar con el asistente')
        detener()
      }
    }
    r.onend = () => {
      if (!activo.current) return
      if (texto.trim()) responder(texto)
      else escuchar()
    }
    reco.current = r
    try {
      r.start()
    } catch {
      detener()
    }
  }

  const iniciar = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      toast.error('Tu navegador no permite hablar con el asistente. Usa Chrome o Edge.')
      return
    }
    activo.current = true
    setEstado('hablando')
    let saludo = SALUDO_RESPALDO
    try {
      const res = await api.get<ApiResponse<{ vc_value: string }>>('/faq-cliente/greeting')
      if (res.data?.vc_value) saludo = res.data.vc_value
    } catch (error) {
      console.error('Error al cargar el saludo:', error)
    }
    if (!activo.current) return
    await hablarTexto(saludo)
    escuchar()
  }

  const alternar = () => {
    if (estado === 'apagado') iniciar()
    else detener()
  }

  useEffect(() => {
    return () => detener()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const encendido = estado !== 'apagado'

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      {encendido && (
        <span className="rounded-full bg-card border border-border px-3 py-1 text-xs font-medium text-foreground shadow">
          {ETIQUETA[estado]}
        </span>
      )}
      <div className="relative">
        {encendido && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary opacity-50 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-primary opacity-20 animate-pulse" />
          </>
        )}
        <button
          type="button"
          onClick={alternar}
          title={encendido ? 'Terminar llamada con el asistente' : 'Hablar con el asistente'}
          aria-label={encendido ? 'Terminar llamada con el asistente' : 'Hablar con el asistente'}
          className={
            'relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ' +
            'bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 ' +
            (encendido ? 'ring-4 ring-primary/40' : '')
          }
        >
          IA
        </button>
      </div>
    </div>
  )
}
