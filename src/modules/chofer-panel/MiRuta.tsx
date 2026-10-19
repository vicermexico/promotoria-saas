import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, MapPin, CheckCircle2, ChevronRight, CalendarDays, CalendarClock } from 'lucide-react'

import { getMyRoutes, DriverRouteDTO } from '@/Fetch/driverPanel'
import { fechaLocalISO } from './fechas'

// Lo usan las direcciones viejas (/chofer/mapa y /chofer/lista).
export function IrAMiRuta() {
  return <Navigate to="/chofer/ruta" replace />
}

type Dia = 'hoy' | 'manana'

export default function MiRuta() {
  const navigate = useNavigate()
  const [routes, setRoutes] = useState<DriverRouteDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [dia, setDia] = useState<Dia>('hoy')

  useEffect(() => {
    setLoading(true)
    getMyRoutes()
      .then((res) => setRoutes(res.data ?? []))
      .catch(() => toast.error('Error al cargar tus rutas'))
      .finally(() => setLoading(false))
  }, [])

  const hoy = fechaLocalISO(0)
  const manana = fechaLocalISO(1)

  const rutasHoy = useMemo(() => routes.filter((r) => r.route_date.slice(0, 10) === hoy), [routes, hoy])
  const rutasManana = useMemo(() => routes.filter((r) => r.route_date.slice(0, 10) === manana), [routes, manana])
  const visibles = dia === 'hoy' ? rutasHoy : rutasManana
  const n = visibles.length

  const boton = (id: Dia, titulo: string, cuantas: number, Icon: typeof CalendarDays) => {
    const activo = dia === id
    return (
      <button
        onClick={() => setDia(id)}
        className={`flex-1 rounded-xl border p-3 text-left transition-colors ${
          activo ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-white border-border text-foreground'
        }`}
      >
        <Icon size={18} className="mb-1" />
        <p className="font-semibold text-sm">{titulo}</p>
        <p className={`text-xs ${activo ? 'opacity-90' : 'text-muted-foreground'}`}>
          {cuantas} {cuantas === 1 ? 'ruta' : 'rutas'}
        </p>
      </button>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-foreground mb-3">Mi ruta</h1>

      <div className="flex gap-3 mb-4">
        {boton('hoy', 'Rutas de hoy', rutasHoy.length, CalendarDays)}
        {boton('manana', 'Rutas de mañana', rutasManana.length, CalendarClock)}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground mb-3">
            Tienes {n} {n === 1 ? 'ruta disponible' : 'rutas disponibles'}
          </p>

          {n === 0 ? (
            <div className="rounded-xl border border-border bg-white p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No tienes rutas asignadas para {dia === 'hoy' ? 'hoy' : 'mañana'}.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibles.map((route, index) => (
                <button
                  key={route.id_route}
                  onClick={() => navigate(`/chofer/ruta/${route.id_route}`)}
                  className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-border bg-white hover:border-input transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{route.route_template?.name ?? `Ruta ${index + 1}`}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={11} /> {route.stops.length} tienda{route.stops.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {route.is_finished && (
                    <span className="flex items-center gap-1 text-xs text-success shrink-0">
                      <CheckCircle2 size={14} /> Finalizada
                    </span>
                  )}
                  <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
