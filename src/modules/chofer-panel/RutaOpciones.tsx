import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Map as MapIcon, ListChecks, MapPin } from 'lucide-react'

import { getMyRoutes, DriverRouteDTO } from '@/Fetch/driverPanel'
import { fechaLocalISO } from './fechas'

export default function RutaOpciones() {
  const { id_route } = useParams()
  const navigate = useNavigate()
  const [route, setRoute] = useState<DriverRouteDTO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMyRoutes()
      .then((res) => setRoute((res.data ?? []).find((r) => r.id_route === Number(id_route)) ?? null))
      .catch(() => toast.error('Error al cargar la ruta'))
      .finally(() => setLoading(false))
  }, [id_route])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  if (!route) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-muted-foreground">No encontramos esta ruta.</p>
        </div>
      </div>
    )
  }

  const dia = route.route_date.slice(0, 10)
  const cuando = dia === fechaLocalISO(0) ? 'Hoy' : dia === fechaLocalISO(1) ? 'Mañana' : dia
  const n = route.stops.length

  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground">{cuando}</p>
      <h1 className="text-lg font-bold text-foreground">{route.route_template?.name ?? `Ruta ${route.id_route}`}</h1>
      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-5">
        <MapPin size={13} /> {n} tienda{n !== 1 ? 's' : ''}
      </p>

      <div className="space-y-3">
        <button
          onClick={() => navigate(`/chofer/ruta/${route.id_route}/mapa`)}
          className="w-full flex items-center gap-3 rounded-xl bg-primary text-primary-foreground p-4 shadow-md font-semibold"
        >
          <MapIcon size={22} /> Visualizar mapa
        </button>
        <button
          onClick={() => navigate(`/chofer/ruta/${route.id_route}/lista`)}
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-white text-foreground p-4 font-semibold"
        >
          <ListChecks size={22} /> Visualizar lista
        </button>
      </div>
    </div>
  )
}
