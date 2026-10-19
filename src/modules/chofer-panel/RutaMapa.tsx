import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { Loader2 } from 'lucide-react'

import { useJsApiLoader, GOOGLE_MAPS_CONFIG } from '@/lib'
import { getMyRoutes, updateDriverLocation, DriverRouteStopDTO } from '@/Fetch/driverPanel'

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const DEFAULT_CENTER = { lat: 25.7460, lng: -100.2792 }

export default function RutaMapa() {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG)
  const navigate = useNavigate()
  const [stops, setStops] = useState<DriverRouteStopDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const { id_route } = useParams()
  const selectedRouteId = Number(id_route)

  useEffect(() => {
    setLoading(true)
    getMyRoutes()
      .then((res) => {
        const route = (res.data ?? []).find((r) => r.id_route === selectedRouteId)
        setStops(route?.stops ?? [])
      })
      .catch(() => toast.error('Error al cargar tu ruta'))
      .finally(() => setLoading(false))

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateDriverLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}),
        () => {},
      )
    }
  }, [selectedRouteId])

  const stopsWithCoords = stops.filter((s) => s.store.address?.latitude && s.store.address?.longitude)

  const mapCenter = useMemo(() => {
    if (stopsWithCoords.length === 0) return DEFAULT_CENTER
    const lat = stopsWithCoords.reduce((sum, s) => sum + (s.store.address!.latitude ?? 0), 0) / stopsWithCoords.length
    const lng = stopsWithCoords.reduce((sum, s) => sum + (s.store.address!.longitude ?? 0), 0) / stopsWithCoords.length
    return { lat, lng }
  }, [stopsWithCoords])

  // El mapa a veces se queda en blanco si el contenedor todavia no tenia su
  // tamano final justo cuando Google Maps se inicializo (por ejemplo, justo
  // al entrar a esta pantalla). Forzar un "resize" despues de un instante
  // hace que vuelva a medir el contenedor y se pinte bien, sin que el
  // chofer tenga que salir y volver a entrar para verlo.
  useEffect(() => {
    if (!map) return
    const timeout = setTimeout(() => {
      google.maps.event.trigger(map, 'resize')
      map.setCenter(mapCenter)
    }, 200)
    return () => clearTimeout(timeout)
  }, [map, mapCenter])

  return (
    <div className="h-[calc(100vh-8.5rem)] relative">
      {(loading || !isLoaded) && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      )}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter}
          zoom={stopsWithCoords.length > 0 ? 12 : 6}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
        >
          {stopsWithCoords.map((stop) => (
            <OverlayView
              key={stop.id_stop}
              position={{ lat: stop.store.address!.latitude!, lng: stop.store.address!.longitude! }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={() => ({ x: -20, y: -20 })}
            >
              <button
                type="button"
                onClick={() => navigate(`/chofer/parada/${stop.id_stop}`)}
                className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white font-bold border-2 border-white"
                style={{ backgroundColor: stop.i_status === 1 ? '#2F7654' : '#C18434' }}
                title={stop.store.name}
              >
                {stop.i_order}
              </button>
            </OverlayView>
          ))}
        </GoogleMap>
      )}
      {!loading && stops.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <p className="text-sm text-muted-foreground">Esta ruta no tiene tiendas asignadas.</p>
        </div>
      )}
    </div>
  )
}
