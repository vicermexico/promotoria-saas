import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Navigation, History, CheckCircle2, Circle } from 'lucide-react'

import { Button, Badge } from '@/components'
import { getMyRoutes, updateDriverLocation, DriverRouteStopDTO } from '@/Fetch/driverPanel'

// Formula de haversine, para ordenar de la parada mas cercana a la mas lejana.
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function RutaListada() {
  const navigate = useNavigate()
  const [stops, setStops] = useState<DriverRouteStopDTO[]>([])
  const [routeName, setRouteName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { id_route } = useParams()
  const selectedRouteId = Number(id_route)

  const loadRoutes = () => {
    setLoading(true)
    getMyRoutes()
      .then((res) => {
        const route = (res.data ?? []).find((r) => r.id_route === selectedRouteId)
        setStops(route?.stops ?? [])
        setRouteName(route?.route_template?.name ?? null)
      })
      .catch(() => toast.error('Error al cargar tu ruta'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRoutes()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setMyLocation(coords)
          updateDriverLocation(coords.lat, coords.lng).catch(() => {})
        },
        () => {},
      )
    }
  }, [selectedRouteId])

  const sortedStops = useMemo(() => {
    if (!myLocation) return stops
    return [...stops].sort((a, b) => {
      const aLat = a.store.address?.latitude, aLng = a.store.address?.longitude
      const bLat = b.store.address?.latitude, bLng = b.store.address?.longitude
      if (!aLat || !aLng) return 1
      if (!bLat || !bLng) return -1
      const dA = distanceKm(myLocation.lat, myLocation.lng, aLat, aLng)
      const dB = distanceKm(myLocation.lat, myLocation.lng, bLat, bLng)
      return dA - dB
    })
  }, [stops, myLocation])

  const openMaps = (stop: DriverRouteStopDTO) => {
    const lat = stop.store.address?.latitude
    const lng = stop.store.address?.longitude
    if (!lat || !lng) {
      toast.error('Esta tienda no tiene coordenadas guardadas')
      return
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-foreground">{routeName ?? 'Tu ruta'}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {sortedStops.length} tienda(s) {myLocation ? '· de la más cercana a la más lejana' : ''}
      </p>

      {sortedStops.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-muted-foreground">Esta ruta no tiene tiendas asignadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStops.map((stop, i) => (
            <div key={stop.id_stop} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="font-semibold text-foreground">{stop.store.name}</p>
                </div>
                {stop.i_status === 1 ? (
                  <Badge className="bg-success/10 text-success border-success/30 gap-1 shrink-0">
                    <CheckCircle2 size={12} /> Visitada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 shrink-0">
                    <Circle size={12} /> Por visitar
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openMaps(stop)}>
                  <Navigation size={14} className="mr-1.5" /> Ir a tienda
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/chofer/parada/${stop.id_stop}`)}>
                  <History size={14} className="mr-1.5" /> Historial
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
