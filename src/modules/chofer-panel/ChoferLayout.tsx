import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Map as MapIcon, ListChecks, UserCircle, LogOut, Route as RouteIcon, PlayCircle } from 'lucide-react'

import { useDriverAuthStore } from '@/stores/driverAuthStore'
import RouteSelectorDialog from './RouteSelectorDialog'

const NAV_ITEMS = [
  { path: '/chofer/mapa', icon: MapIcon, label: 'Ruta mapa' },
  { path: '/chofer/lista', icon: ListChecks, label: 'Ruta lista' },
  { path: '/chofer/perfil', icon: UserCircle, label: 'Perfil' },
  { path: '/chofer/demo', icon: PlayCircle, label: 'DEMO' },
]

export default function ChoferLayout() {
  const isAuthenticated = useDriverAuthStore((s) => s.isAuthenticated())
  const logout = useDriverAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [showRouteSelector, setShowRouteSelector] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/chofer/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/chofer/login')
  }

  const showRouteButton = location.pathname === '/chofer/mapa' || location.pathname === '/chofer/lista'

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {showRouteButton && (
        <button
          onClick={() => setShowRouteSelector(true)}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-4 shadow-md"
        >
          <RouteIcon size={18} /> Ver rutas asignadas
        </button>
      )}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <RouteSelectorDialog open={showRouteSelector} onClose={() => setShowRouteSelector(false)} />

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex items-stretch h-16 z-20">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground"
        >
          <LogOut size={20} />
          Cerrar sesión
        </button>
      </nav>
    </div>
  )
}
