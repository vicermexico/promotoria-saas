import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Archive,
  ArrowRight,
  Bell,
  Calculator,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ImagePlus,
  Info,
  LocateFixed,
  Lock,
  MapPin,
  Minus,
  Navigation,
  PartyPopper,
  Play,
  Plus,
  RotateCw,
  ScanBarcode,
  Send,
  Smartphone,
  Store,
  Truck,
  WandSparkles,
  XCircle,
} from 'lucide-react'

import { useDriverAuthStore } from '@/stores/driverAuthStore'

/**
 * DEMO para choferes: reproduce la tarea completa de la app del promotor con una tienda
 * de mentira. Todo vive solo en la memoria de esta pantalla: NO se manda nada al servidor
 * y las fotos, respuestas y firma se borran al terminar, al salir o al repetir el demo.
 */

const C = {
  bg: '#F5F3EF',
  teal: '#08303F',
  tealMid: '#4C6B75',
  text: '#4B5563',
  mute: '#9CA3AF',
  green1: '#66BB6A',
  green2: '#388E3C',
  orange: '#F57C00',
  orangeBg: '#FFF1E0',
  purple: '#9C27B0',
  blue: '#2388E8',
  red: '#E53935',
  line: '#E5E0D5',
}

const FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif"

const TIENDA = {
  codigo: 'Ruta demo - DEMO-TAR-000001',
  nombre: 'Tienda Demo',
  direccion: 'Calle Ejemplo 123, Col. Centro, Monterrey NL',
  ruta: 'Ruta demo',
  pago: 31.5,
}

const PRODUCTOS = [
  { id: 1, nombre: 'Galletas Quaker', detalle: 'Caja con 6 paquetes', min: 6, color: '#2E7D32' },
  { id: 2, nombre: 'Avena Quaker 400 g', detalle: 'Bolsa de 400 g', min: 4, color: '#C62828' },
]

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const dosDig = (n: number) => String(n).padStart(2, '0')
const reloj = (s: number) => `${dosDig(Math.floor(s / 3600))}:${dosDig(Math.floor((s % 3600) / 60))}:${dosDig(s % 60)}`

/* ---------- piezas visuales ---------- */

function BotonGrande({
  children,
  onClick,
  color = C.teal,
  disabled = false,
  icon,
  outline = false,
  small = false,
}: {
  children: ReactNode
  onClick?: () => void
  color?: string
  disabled?: boolean
  icon?: ReactNode
  outline?: boolean
  small?: boolean
}) {
  const fondo = disabled ? '#E0E0E0' : outline ? '#FFF6F5' : color
  const texto = disabled ? '#9E9E9E' : outline ? C.red : '#FFFFFF'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 font-bold uppercase active:opacity-80"
      style={{
        background: fondo,
        color: texto,
        border: outline ? `1.5px solid #EF9A9A` : 'none',
        borderRadius: 18,
        height: small ? 52 : 58,
        fontSize: small ? 15 : 18,
        letterSpacing: 0.4,
        fontFamily: FONT,
      }}
    >
      {icon}
      {children}
    </button>
  )
}

function BarraApp({ titulo, sub, progreso, onBack }: { titulo: string; sub?: string; progreso?: number; onBack: () => void }) {
  return (
    <div className="shrink-0" style={{ background: C.teal }}>
      <div className="flex items-center gap-4 px-4" style={{ height: 66 }}>
        <button type="button" onClick={onBack} aria-label="Regresar" className="text-white">
          <ChevronLeft size={30} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-white font-bold" style={{ fontSize: 20, lineHeight: 1.15 }}>
            {titulo}
          </p>
          {sub && (
            <p className="truncate font-semibold" style={{ fontSize: 14, color: '#9FB3BC' }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      {progreso !== undefined && (
        <div style={{ height: 3, background: C.bg }}>
          <div style={{ height: '100%', width: `${progreso * 100}%`, background: C.teal }} />
        </div>
      )}
    </div>
  )
}

function MapaFalso({ avance = 0, ruta = false }: { avance?: number; ruta?: boolean }) {
  const ini = { x: 70, y: 330 }
  const fin = { x: 300, y: 120 }
  const px = ini.x + (fin.x - ini.x) * avance
  const py = ini.y + (fin.y - ini.y) * avance
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: '#F1EEE8' }}>
      <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <rect width="400" height="460" fill="#F1EEE8" />
        <path d="M-10 60 C80 40 150 90 260 50 S380 20 420 40 L420 0 L-10 0Z" fill="#A9D8F2" />
        <rect x="20" y="210" width="90" height="70" rx="10" fill="#CFE7C8" />
        <rect x="290" y="260" width="100" height="90" rx="10" fill="#CFE7C8" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`h${i}`} x1="0" x2="400" y1={90 + i * 52} y2={90 + i * 52} stroke="#FFFFFF" strokeWidth="5" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} y1="0" y2="460" x1={20 + i * 55} x2={20 + i * 55} stroke="#FFFFFF" strokeWidth="5" />
        ))}
        <path d="M-10 330 L420 160" stroke="#D7DEEA" strokeWidth="22" fill="none" />
        <path d="M-10 330 L420 160" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeDasharray="10 10" />
        <text x="22" y="238" fontSize="13" fill="#3F8F4A" fontWeight="700">
          Parque Demo
        </text>
        <text x="215" y="215" fontSize="13" fill="#6B7280" fontWeight="700" transform="rotate(-23 215 215)">
          Av. Principal
        </text>
        <text x="296" y="312" fontSize="13" fill="#3F8F4A" fontWeight="700">
          Plaza Centro
        </text>
        {ruta && <line x1={px} y1={py} x2={fin.x} y2={fin.y} stroke="#4285F4" strokeWidth="6" strokeLinecap="round" opacity="0.85" />}
        <circle cx={fin.x} cy={fin.y} r="18" fill="#7E57C2" />
        <circle cx={fin.x} cy={fin.y} r="7" fill="#FFFFFF" />
        <circle cx={px} cy={py} r="22" fill="#4285F4" opacity="0.22" />
        <circle cx={px} cy={py} r="9" fill="#4285F4" stroke="#FFFFFF" strokeWidth="3" />
      </svg>
      <div
        className="absolute flex items-center justify-center bg-white"
        style={{ right: 14, bottom: 14, width: 52, height: 52, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.18)', color: '#4B5563' }}
      >
        <LocateFixed size={26} />
      </div>
    </div>
  )
}

function Foto({
  foto,
  bloqueada,
  onFoto,
  texto,
  avisoBloqueo,
}: {
  foto: string | null
  bloqueada?: boolean
  onFoto: (e: ChangeEvent<HTMLInputElement>) => void
  texto: string
  avisoBloqueo?: string
}) {
  if (bloqueada) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" style={{ background: '#EEEEEE', border: '2px solid #E0E0E0', borderRadius: 24, padding: '30px 16px' }}>
        <Lock size={46} color="#9E9E9E" />
        <div className="flex items-center gap-2 font-bold" style={{ background: '#E0E0E0', color: '#A8A8A8', borderRadius: 14, padding: '13px 30px', fontSize: 19 }}>
          <Camera size={22} /> {texto}
        </div>
        <p className="font-semibold" style={{ color: '#9E9E9E', fontSize: 17 }}>
          {avisoBloqueo}
        </p>
      </div>
    )
  }
  if (foto) {
    return (
      <div className="relative overflow-hidden" style={{ borderRadius: 24 }}>
        <img src={foto} alt="Foto del demo" className="w-full object-cover" style={{ height: 250 }} />
        <label
          className="absolute flex cursor-pointer items-center gap-2 font-bold text-white"
          style={{ right: 12, bottom: 12, background: 'rgba(0,0,0,.72)', borderRadius: 12, padding: '10px 16px', fontSize: 17 }}
        >
          <Camera size={20} /> Cambiar
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFoto} />
        </label>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-4" style={{ background: '#FAFAFA', border: '2px solid #E3E3E3', borderRadius: 24, padding: '34px 16px' }}>
      <ImagePlus size={60} color="#B0B0B0" />
      <label
        className="flex cursor-pointer items-center gap-2 font-bold text-white"
        style={{ background: C.teal, borderRadius: 14, padding: '13px 30px', fontSize: 20 }}
      >
        <Camera size={22} /> {texto}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFoto} />
      </label>
    </div>
  )
}

function Encab({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {icono}
      <h3 className="font-bold" style={{ fontSize: 21, color: '#3F3F46' }}>
        {texto}
      </h3>
    </div>
  )
}

function CajaProducto({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full">
      <rect x="10" y="22" width="100" height="56" rx="6" fill={color} />
      <rect x="10" y="22" width="100" height="14" rx="6" fill="#FFFFFF" opacity="0.25" />
      <rect x="30" y="42" width="60" height="22" rx="4" fill="#FFFFFF" opacity="0.9" />
      <circle cx="60" cy="53" r="7" fill={color} />
      <path d="M10 22 L24 10 H96 L110 22Z" fill={color} opacity="0.8" />
    </svg>
  )
}

/* ---------- pantalla principal ---------- */

export default function ChoferDemo() {
  const navigate = useNavigate()
  const nombreChofer = useDriverAuthStore((s) => (s as unknown as { driver?: { name?: string } }).driver?.name)
  const nombre = (nombreChofer || 'amigo').split(' ')[0]

  // 0 inicio, 1 esperando, 2 oferta, 3 aceptada, 4 en camino, 5 acomodo, 6 producto, 7 pedido, 8 fin
  const [step, setStep] = useState(0)
  const [notif, setNotif] = useState(false)
  const [prod, setProd] = useState(0)
  const [antes, setAntes] = useState<string | null>(null)
  const [despues, setDespues] = useState<string | null>(null)
  const [stock, setStock] = useState<Record<number, number>>({ 1: 0, 2: 0 })
  const [pedido, setPedido] = useState<Record<number, number>>({ 1: 0, 2: 0 })
  const [whats, setWhats] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [resumen, setResumen] = useState(false)
  const [mins, setMins] = useState(15)
  const [segs, setSegs] = useState(7199)

  const urls = useRef<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)

  const entrega = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    const lista = urls.current
    return () => {
      lista.forEach((u) => URL.revokeObjectURL(u))
      lista.length = 0
    }
  }, [])

  // paso 1: llega la notificacion a los 3 segundos
  useEffect(() => {
    if (step !== 1) return
    const t = setTimeout(() => {
      setNotif(true)
      try {
        navigator.vibrate?.([200, 100, 200])
      } catch {
        // el telefono no vibra
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [step])

  // paso 4: cuenta regresiva y avance en el mapa
  useEffect(() => {
    if (step !== 4) return
    const a = setInterval(() => setSegs((s) => Math.max(0, s - 1)), 1000)
    const b = setInterval(() => setMins((m) => Math.max(1, m - 1)), 1800)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [step])

  const limpiar = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u))
    urls.current.length = 0
    setAntes(null)
    setDespues(null)
    setStock({ 1: 0, 2: 0 })
    setPedido({ 1: 0, 2: 0 })
    setWhats('')
    setFirmado(false)
    setResumen(false)
    setProd(0)
    setMins(15)
    setSegs(7199)
    setNotif(false)
  }

  const salir = () => {
    limpiar()
    navigate('/chofer/mapa')
  }
  const reiniciar = () => {
    limpiar()
    setStep(0)
  }

  const tomarFoto = (poner: (u: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const u = URL.createObjectURL(f)
    urls.current.push(u)
    poner(u)
    e.target.value = ''
  }

  const aPedido = () => {
    const p: Record<number, number> = {}
    PRODUCTOS.forEach((x) => {
      p[x.id] = Math.max(0, x.min - (stock[x.id] || 0))
    })
    setPedido(p)
    setStep(7)
  }

  const mensaje =
    `Hola, soy tu promotor de Promotoria. Pedido para ${TIENDA.nombre}:\n` +
    (PRODUCTOS.filter((x) => (pedido[x.id] || 0) > 0)
      .map((x) => `- ${pedido[x.id]} x ${x.nombre}`)
      .join('\n') || '- (sin faltantes)') +
    `\nEntrega: ${entrega}, por la mañana.`

  // ---- firma ----
  const punto = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { c, x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height }
  }
  const firmaInicio = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = punto(e)
    const ctx = p?.c.getContext('2d')
    if (!p || !ctx) return
    dibujando.current = true
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111111'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  const firmaMueve = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return
    const p = punto(e)
    const ctx = p?.c.getContext('2d')
    if (!p || !ctx) return
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setFirmado(true)
  }
  const firmaFin = () => {
    dibujando.current = false
  }
  const firmaBorrar = () => {
    const c = canvasRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setFirmado(false)
  }

  /* ---------- tarjetas reutilizadas ---------- */
  const TarjetaTienda = ({ extra, boton }: { extra?: ReactNode; boton: ReactNode }) => (
    <div className="shrink-0 px-4 pb-5">
      <div className="bg-white" style={{ borderRadius: 30, padding: 22, boxShadow: '0 6px 22px rgba(0,0,0,.10)' }}>
        <p className="font-semibold" style={{ color: C.mute, fontSize: 16 }}>
          {TIENDA.ruta}
        </p>
        <p className="font-bold" style={{ color: C.text, fontSize: 28, lineHeight: 1.15, marginTop: 4 }}>
          {TIENDA.nombre}
        </p>
        <p className="font-semibold" style={{ color: C.mute, fontSize: 17, marginTop: 8 }}>
          {TIENDA.direccion}
        </p>
        {extra}
        <div style={{ marginTop: 18 }}>{boton}</div>
      </div>
    </div>
  )

  const TarjetaSuperior = ({ children }: { children: ReactNode }) => (
    <div className="absolute left-4 right-4 z-10 bg-white" style={{ top: 14, borderRadius: 24, padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,.14)' }}>
      {children}
    </div>
  )

  /* ---------- pantallas ---------- */
  let pantalla: ReactNode = null

  if (step === 0 || step === 1) {
    pantalla = (
      <div className="flex h-full flex-col">
        <div className="shrink-0 px-3 pt-3">
          <button type="button" onClick={salir} aria-label="Salir del demo" style={{ color: C.text }}>
            <ChevronLeft size={32} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <PartyPopper size={74} color={C.orange} />
          {step === 0 ? (
            <>
              <h1 className="font-bold" style={{ fontSize: 28, color: C.text }}>
                Practica una tarea
              </h1>
              <p className="font-semibold" style={{ fontSize: 17, color: C.mute, lineHeight: 1.45 }}>
                Vas a hacer una visita de práctica con todos los pasos que hace un promotor: aceptar la tarea, llegar a la tienda, fotos, inventario y pedido con firma.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-bold" style={{ fontSize: 26, color: C.text }}>
                Buscando tareas…
              </h1>
              <p className="font-semibold" style={{ fontSize: 17, color: C.mute }}>
                En unos segundos te llegará un aviso.
              </p>
            </>
          )}
        </div>
        {step === 0 && (
          <div className="shrink-0 px-4 pb-6">
            <BotonGrande onClick={() => setStep(1)} icon={<Play size={22} />}>
              Iniciar
            </BotonGrande>
          </div>
        )}
      </div>
    )
  }

  if (step === 2) {
    pantalla = (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4">
          <div className="flex flex-col items-center gap-5">
            <PartyPopper size={64} color={C.orange} />
            <h1 className="font-bold" style={{ fontSize: 30, color: C.text }}>
              ¡Hola, {nombre}!
            </h1>
            <div
              className="w-full text-center text-white"
              style={{ background: `linear-gradient(135deg, ${C.green1}, ${C.green2})`, borderRadius: 28, padding: '22px 12px', boxShadow: '0 10px 24px rgba(56,142,60,.30)' }}
            >
              <p className="font-bold" style={{ fontSize: 17, letterSpacing: 2 }}>
                VAS A GANAR
              </p>
              <p className="font-bold" style={{ fontSize: 46, lineHeight: 1.1, marginTop: 4 }}>
                {money(TIENDA.pago)} MXN
              </p>
            </div>
          </div>
          <div className="bg-white" style={{ borderRadius: 28, padding: 22, marginTop: 24 }}>
            <div className="mx-auto flex items-center justify-center font-bold" style={{ width: 108, height: 108, borderRadius: 54, background: '#F4F4F4', border: '2px solid #ECECEC', color: '#C4C4C4', fontSize: 52 }}>
              T
            </div>
            <p className="font-bold" style={{ color: C.teal, fontSize: 17, marginTop: 26 }}>
              {TIENDA.codigo}
            </p>
            <p className="font-bold" style={{ color: C.text, fontSize: 30, marginTop: 12 }}>
              {TIENDA.nombre}
            </p>
            <p className="flex gap-2 font-semibold" style={{ color: C.mute, fontSize: 17, marginTop: 10 }}>
              <MapPin size={20} className="mt-0.5 shrink-0" /> {TIENDA.direccion}
            </p>
            <p className="font-semibold" style={{ color: '#6B7280', fontSize: 19, lineHeight: 1.5, marginTop: 20 }}>
              Solo necesitas contar el producto y acomodar el exhibidor para ganártelos. La tienda está muy cerca de ti — ¡quizá ya estás ahí! Dale clic en Aceptar para llevarte tu dinero.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-4 px-4 pb-6 pt-3">
          <div className="flex-1">
            <BotonGrande outline icon={<XCircle size={24} />} onClick={reiniciar}>
              Rechaza
            </BotonGrande>
          </div>
          <div className="flex-1">
            <BotonGrande color={C.tealMid} icon={<CheckCircle2 size={24} />} onClick={() => setStep(3)}>
              Acepta
            </BotonGrande>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    pantalla = (
      <div className="relative flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <MapaFalso />
          <TarjetaSuperior>
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setStep(2)} aria-label="Regresar" style={{ color: C.text }}>
                <ChevronLeft size={28} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold" style={{ color: C.teal, fontSize: 20 }}>
                  ¡Gracias por aceptar la tarea!
                </p>
                <p className="font-semibold" style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.4, marginTop: 4 }}>
                  Ve a {TIENDA.nombre} y acomoda su exhibidor como se indica. Si tiene preventa activada, recuerda levantar el pedido con el dueño.
                </p>
              </div>
              <button type="button" onClick={reiniciar} className="flex shrink-0 items-center gap-1 font-bold" style={{ color: C.red, fontSize: 15 }}>
                <XCircle size={18} /> Cancelar tarea
              </button>
            </div>
          </TarjetaSuperior>
        </div>
        <TarjetaTienda
          boton={
            <BotonGrande icon={<Navigation size={22} fill="currentColor" />} onClick={() => setStep(4)}>
              Iniciar ruta
            </BotonGrande>
          }
        />
      </div>
    )
  }

  if (step === 4) {
    pantalla = (
      <div className="relative flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <MapaFalso ruta avance={(15 - mins) / 15} />
          <TarjetaSuperior>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep(3)} aria-label="Regresar" style={{ color: C.text }}>
                <ChevronLeft size={28} />
              </button>
              <p className="min-w-0 flex-1 truncate font-bold" style={{ color: C.text, fontSize: 20 }}>
                {TIENDA.nombre}
              </p>
              <span className="shrink-0 font-bold" style={{ background: '#FDF0DC', color: '#C27A12', borderRadius: 12, padding: '6px 12px', fontSize: 14 }}>
                En camino
              </span>
              <button type="button" onClick={reiniciar} className="flex shrink-0 items-center gap-1 font-bold" style={{ color: C.red, fontSize: 14 }}>
                <XCircle size={18} /> Rechazar tarea
              </button>
            </div>
          </TarjetaSuperior>
        </div>
        <TarjetaTienda
          extra={
            <div style={{ marginTop: 10 }}>
              <p className="flex items-center gap-2 font-bold" style={{ color: '#4CAF50', fontSize: 19 }}>
                <Car size={22} color="#2196F3" /> {mins} m restantes
              </p>
              <p className="flex items-center gap-2 font-bold" style={{ color: '#F59E0B', fontSize: 19, marginTop: 6 }}>
                <Clock size={22} /> Tiempo: {reloj(segs)}
              </p>
            </div>
          }
          boton={
            <BotonGrande color={C.purple} icon={<Play size={20} fill="currentColor" />} onClick={() => setStep(5)}>
              ¡Ya llegaste! Iniciar
            </BotonGrande>
          }
        />
      </div>
    )
  }

  if (step === 5) {
    pantalla = (
      <div className="flex h-full flex-col">
        <BarraApp titulo="Acomodo de productos" sub="Paso 1 de 2" progreso={0.5} onBack={() => setStep(4)} />
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-5">
          <Encab icono={<WandSparkles size={28} color={C.teal} />} texto="Referencia de acomodo" />
          <div className="overflow-hidden" style={{ borderRadius: 22, background: '#DEDEDE' }}>
            <svg viewBox="0 0 300 180" className="w-full">
              <rect width="300" height="180" fill="#E2E2E2" />
              <rect x="14" y="52" width="272" height="7" fill="#9AA3AD" />
              <rect x="14" y="116" width="272" height="7" fill="#9AA3AD" />
              <rect x="14" y="170" width="272" height="6" fill="#9AA3AD" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={`a${i}`} x={26 + i * 52} y={8} width="40" height="44" rx="5" fill="#2E7D32" />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={`b${i}`} x={26 + i * 52} y={68} width="40" height="48" rx="5" fill="#C62828" />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={`c${i}`} x={26 + i * 52} y={126} width="40" height="44" rx="5" fill="#F9A825" />
              ))}
            </svg>
          </div>

          <Encab icono={<Camera size={28} color={C.orange} />} texto="Tu fotografía" />
          <div className="font-bold" style={{ background: '#FDEFDD', color: '#EA6A00', borderRadius: 16, padding: '16px 18px', fontSize: 19, lineHeight: 1.35 }}>
            Toma una foto del estado actual del anaquel antes de realizar el acomodo.
          </div>
          <Foto foto={antes} onFoto={tomarFoto(setAntes)} texto="Tomar foto" />

          <Encab icono={<CheckCircle2 size={28} color={C.teal} />} texto="Tu fotografía después de acomodar" />
          <div className="font-bold" style={{ background: '#E4E7E8', color: '#0B3A4A', borderRadius: 16, padding: '16px 18px', fontSize: 19, lineHeight: 1.35 }}>
            Deja el exhibidor tal cual la foto de referencia de arriba, y sube tu foto cuando ya hayas terminado el acomodo.
          </div>
          <Foto foto={despues} bloqueada={!antes} onFoto={tomarFoto(setDespues)} texto="Tomar foto 2" avisoBloqueo="Primero toma la foto 1" />
        </div>
        <div className="shrink-0 px-4 pb-6 pt-2">
          <BotonGrande color={C.blue} disabled={!antes || !despues} icon={<ArrowRight size={22} />} onClick={() => { setProd(0); setStep(6) }}>
            Continuar
          </BotonGrande>
        </div>
      </div>
    )
  }

  if (step === 6) {
    const p = PRODUCTOS[prod]
    const cant = stock[p.id] || 0
    const poner = (n: number) => setStock({ ...stock, [p.id]: Math.max(0, Math.min(9999, n)) })
    pantalla = (
      <div className="flex h-full flex-col">
        <BarraApp
          titulo={p.nombre}
          sub="Paso 2 de 2"
          progreso={1}
          onBack={() => (prod > 0 ? setProd(prod - 1) : setStep(5))}
        />
        <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-5">
          <div className="flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #8E24AA, #AB47BC)', borderRadius: 22, padding: 16 }}>
            <div className="shrink-0 overflow-hidden bg-white" style={{ width: 112, height: 112, borderRadius: 16, padding: 8 }}>
              <CajaProducto color={p.color} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white" style={{ fontSize: 26, lineHeight: 1.15 }}>
                {p.nombre}
              </p>
              <p className="font-bold" style={{ color: '#F3E5F5', fontSize: 18, marginTop: 6 }}>
                {p.detalle}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden bg-white" style={{ borderRadius: 18, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
            <div className="flex items-center gap-3 font-semibold" style={{ background: '#EAF2FB', padding: '14px 18px', fontSize: 19, color: '#374151' }}>
              <Calculator size={26} color="#1565C0" /> ¿Cuántas piezas hay en existencia?
            </div>
            <div className="flex items-center justify-center gap-4" style={{ padding: '22px 16px' }}>
              <button type="button" onClick={() => poner(cant - 1)} className="flex items-center justify-center text-white" style={{ width: 66, height: 66, borderRadius: 14, background: C.teal }}>
                <Minus size={26} />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={cant}
                onChange={(e) => poner(Number(e.target.value) || 0)}
                className="text-center font-bold"
                style={{ width: 120, height: 66, borderRadius: 16, border: `2px solid ${C.line}`, fontSize: 30, color: '#111827', background: '#FFFFFF' }}
              />
              <button type="button" onClick={() => poner(cant + 1)} className="flex items-center justify-center text-white" style={{ width: 66, height: 66, borderRadius: 14, background: C.teal }}>
                <Plus size={26} />
              </button>
            </div>
          </div>

          <div className="flex-1" />
          <button
            type="button"
            onClick={() => toast.success('Producto correcto (demo)')}
            className="my-6 flex items-center gap-4 text-white"
            style={{ background: C.teal, borderRadius: 20, padding: '18px 20px', boxShadow: '0 6px 14px rgba(0,0,0,.22)' }}
          >
            <ScanBarcode size={38} className="shrink-0" />
            <span className="text-center font-bold uppercase" style={{ fontSize: 16, lineHeight: 1.25 }}>
              Verificador de código de barras para corroborar si es el producto correcto
            </span>
          </button>
        </div>
        <div className="shrink-0 px-4 pb-6 pt-2">
          <BotonGrande
            color={C.blue}
            icon={<Send size={22} />}
            onClick={() => (prod < PRODUCTOS.length - 1 ? setProd(prod + 1) : aPedido())}
          >
            Continuar
          </BotonGrande>
        </div>
      </div>
    )
  }

  if (step === 7) {
    const listo = whats.length === 10 && firmado
    pantalla = (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-4 bg-white px-4" style={{ height: 66 }}>
          <button type="button" onClick={() => { setProd(PRODUCTOS.length - 1); setStep(6) }} aria-label="Regresar" style={{ color: '#111827' }}>
            <ChevronLeft size={30} />
          </button>
          <p className="font-bold" style={{ fontSize: 26, color: '#111827' }}>
            Pedido
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-5">
          <div className="flex gap-3 font-bold" style={{ background: '#FBEBDD', color: '#E8590C', borderRadius: 18, padding: '18px 16px', fontSize: 19, lineHeight: 1.35 }}>
            <Info size={26} className="mt-0.5 shrink-0" />
            <span>A {TIENDA.nombre} le faltan estos productos contra el mínimo. Coméntaselo al encargado y ajusta las cantidades finales que acuerden.</span>
          </div>

          <h3 className="font-bold uppercase" style={{ fontSize: 21, color: '#111827' }}>
            Pedido nuevo
          </h3>
          <div className="bg-white" style={{ borderRadius: 18, padding: '14px 14px 6px', border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-end gap-2 pb-2 font-semibold" style={{ fontSize: 15, color: C.mute, borderBottom: `1.5px solid ${C.line}` }}>
              <span style={{ width: 42, textAlign: 'center' }}>Tiene</span>
              <span style={{ width: 54, textAlign: 'center' }}>Mínimo</span>
              <span className="font-bold" style={{ width: 130, textAlign: 'center', color: '#111827' }}>
                Pedido
              </span>
            </div>
            {PRODUCTOS.map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="flex shrink-0 items-center justify-center" style={{ width: 56, height: 56, borderRadius: 14, background: '#F1F1F1', color: '#9CA3AF' }}>
                  <Archive size={26} />
                </div>
                <p className="min-w-0 flex-1 font-bold" style={{ fontSize: 17, color: C.text, lineHeight: 1.15 }}>
                  {x.nombre}
                </p>
                <span className="flex items-center justify-center font-bold" style={{ width: 40, height: 46, borderRadius: 10, background: '#F1F1F1', color: C.text, fontSize: 19 }}>
                  {stock[x.id] || 0}
                </span>
                <span className="flex items-center justify-center font-bold" style={{ width: 40, height: 46, borderRadius: 10, background: '#F1F1F1', color: C.text, fontSize: 19 }}>
                  {x.min}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setPedido({ ...pedido, [x.id]: Math.max(0, (pedido[x.id] || 0) - 1) })} className="flex items-center justify-center" style={{ width: 28, height: 34, color: C.text }}>
                    <Minus size={20} />
                  </button>
                  <span className="flex items-center justify-center font-bold" style={{ width: 46, height: 52, borderRadius: 10, border: `2px solid #B8C4C8`, background: '#EDF1F2', fontSize: 23, color: '#111827' }}>
                    {pedido[x.id] || 0}
                  </span>
                  <button type="button" onClick={() => setPedido({ ...pedido, [x.id]: (pedido[x.id] || 0) + 1 })} className="flex items-center justify-center" style={{ width: 28, height: 34, color: C.text }}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-bold" style={{ fontSize: 23, color: '#111827', paddingTop: 8 }}>
            ¿Cuándo lo quiere?
          </h3>
          <div className="flex items-center gap-4 font-bold" style={{ background: '#E4E6E6', border: '2px solid #C9D0D2', borderRadius: 18, padding: '18px 16px', fontSize: 19, color: '#111827', lineHeight: 1.3 }}>
            <Truck size={30} className="shrink-0" />
            <span>Entrega asignada por la ruta de esta tienda: {entrega}, por la mañana.</span>
          </div>

          <h3 className="font-bold" style={{ fontSize: 23, color: '#111827', paddingTop: 8 }}>
            WhatsApp del encargado/dueño
          </h3>
          <div className="flex items-center gap-4 bg-white" style={{ border: `2px solid ${C.line}`, borderRadius: 30, padding: '4px 22px', height: 68 }}>
            <Smartphone size={30} color="#111827" />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={whats}
              onChange={(e) => setWhats(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10 dígitos"
              className="min-w-0 flex-1 bg-transparent font-bold outline-none"
              style={{ fontSize: 23, color: '#111827' }}
            />
          </div>

          <h3 className="font-bold" style={{ fontSize: 23, color: '#111827', paddingTop: 8 }}>
            Firma del encargado/dueño
          </h3>
          <p className="font-semibold" style={{ fontSize: 18, color: '#6B7280', lineHeight: 1.4 }}>
            Pásale el celular para que firme aquí, confirmando que está de acuerdo con el pedido.
          </p>
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full bg-white"
            style={{ touchAction: 'none', border: `1px solid ${C.line}`, borderRadius: 6, aspectRatio: '640 / 360' }}
            onPointerDown={firmaInicio}
            onPointerMove={firmaMueve}
            onPointerUp={firmaFin}
            onPointerLeave={firmaFin}
          />
          <div className="flex justify-end">
            <button type="button" onClick={firmaBorrar} className="flex items-center gap-2 font-bold" style={{ color: C.teal, fontSize: 21 }}>
              <RotateCw size={20} /> Borrar firma
            </button>
          </div>
        </div>
        <div className="shrink-0 px-4 pb-6 pt-2">
          <BotonGrande disabled={!listo} icon={<Send size={22} />} small onClick={() => setResumen(true)}>
            Guardar y enviar por WhatsApp
          </BotonGrande>
        </div>

        {resumen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.55)' }}>
            <div className="w-full bg-white" style={{ borderRadius: 24, padding: 22 }}>
              <p className="font-bold" style={{ fontSize: 22, color: C.text }}>
                Pedido guardado (demo)
              </p>
              <p className="font-semibold" style={{ fontSize: 15, color: C.mute, marginTop: 6 }}>
                Así se le mandaría al dueño por WhatsApp. En el demo no se envía nada.
              </p>
              <p className="whitespace-pre-line" style={{ background: '#E7F8EC', color: '#14532D', borderRadius: 14, padding: 14, fontSize: 16, marginTop: 14 }}>
                {mensaje}
              </p>
              <div style={{ marginTop: 18 }}>
                <BotonGrande small onClick={() => { limpiar(); setStep(8) }}>
                  Terminar tarea
                </BotonGrande>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 8) {
    pantalla = (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <PartyPopper size={74} color={C.orange} />
          <h1 className="font-bold" style={{ fontSize: 30, color: C.text }}>
            ¡Tarea completada!
          </h1>
          <div
            className="w-full text-white"
            style={{ background: `linear-gradient(135deg, ${C.green1}, ${C.green2})`, borderRadius: 28, padding: '22px 12px', boxShadow: '0 10px 24px rgba(56,142,60,.30)' }}
          >
            <p className="font-bold" style={{ fontSize: 17, letterSpacing: 2 }}>
              GANASTE
            </p>
            <p className="font-bold" style={{ fontSize: 46, lineHeight: 1.1, marginTop: 4 }}>
              {money(TIENDA.pago)} MXN
            </p>
          </div>
          <p className="font-semibold" style={{ fontSize: 17, color: C.mute, lineHeight: 1.45 }}>
            En una tarea real, tu pago se acredita cuando el cliente aprueba la visita. Las fotos, respuestas y firma de este demo ya se borraron.
          </p>
        </div>
        <div className="flex shrink-0 gap-4 px-4 pb-6">
          <div className="flex-1">
            <BotonGrande outline small onClick={reiniciar}>
              Repetir demo
            </BotonGrande>
          </div>
          <div className="flex-1">
            <BotonGrande small icon={<Store size={20} />} onClick={salir}>
              Salir
            </BotonGrande>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: C.bg, fontFamily: FONT }}>
      <style>{`@keyframes demoBajar{from{transform:translateY(-120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div className="shrink-0 text-center font-bold" style={{ background: '#FFF3C4', color: '#7A5B00', fontSize: 11, padding: '3px 0' }}>
        MODO DEMO · no se guarda nada
      </div>
      <div className="relative mx-auto min-h-0 w-full max-w-[480px] flex-1" style={{ background: C.bg }}>
        {pantalla}
        {step === 1 && notif && (
          <button
            type="button"
            onClick={() => {
              setNotif(false)
              setStep(2)
            }}
            className="absolute left-3 right-3 z-40 flex items-start gap-3 bg-white text-left"
            style={{ top: 10, borderRadius: 22, padding: 16, boxShadow: '0 8px 28px rgba(0,0,0,.28)', animation: 'demoBajar .35s ease-out' }}
          >
            <div className="flex shrink-0 items-center justify-center text-white" style={{ width: 40, height: 40, borderRadius: 20, background: C.teal }}>
              <Bell size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold" style={{ fontSize: 12, color: C.mute }}>
                Promotoria · ahora
              </p>
              <p className="font-bold" style={{ fontSize: 17, color: '#111827' }}>
                ¡Nueva tarea disponible!
              </p>
              <p className="font-semibold" style={{ fontSize: 15, color: '#6B7280' }}>
                Gana {money(TIENDA.pago)} en {TIENDA.nombre}
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
