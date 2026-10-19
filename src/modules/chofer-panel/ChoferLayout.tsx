import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Route as RouteIcon, LogOut, PlayCircle, UserPlus, ArrowLeft, Store } from 'lucide-react'

import { useDriverAuthStore } from '@/stores/driverAuthStore'

const NAV_ITEMS = [
  { path: '/chofer/ruta', icon: RouteIcon, label: 'Mi ruta' },
  { path: '/chofer/invitar', icon: UserPlus, label: 'Invitar' },
  { path: '/chofer/nueva-tienda', icon: Store, label: 'Nueva tienda' },
  { path: '/chofer/demo', icon: PlayCircle, label: 'DEMO' },
]

export default function ChoferLayout() {
  const isAuthenticated = useDriverAuthStore((s) => s.isAuthenticated())
  const driver = useDriverAuthStore((s) => s.driver)
  const logout = useDriverAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [fotoRota, setFotoRota] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/chofer/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/chofer/login')
  }

  const path = location.pathname
  const esPantallaPrincipal = NAV_ITEMS.some((i) => path === i.path)
  const enPerfil = path === '/chofer/perfil'
  const inicial = (driver?.name ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-border flex items-center justify-between px-3 z-30">
        {esPantallaPrincipal ? (
          <span className="font-bold text-foreground">RetaiLink</span>
        ) : (
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-foreground p-1.5 -ml-1.5">
            <ArrowLeft size={20} /> Atrás
          </button>
        )}

        <button
          onClick={() => navigate('/chofer/perfil')}
          aria-label="Mi perfil"
          className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold bg-primary text-primary-foreground border-2 ${
            enPerfil ? 'border-primary ring-2 ring-primary/30' : 'border-border'
          }`}
        >
          {driver?.vc_photo && !fotoRota ? (
            <img src={driver.vc_photo} alt={driver.name} className="w-full h-full object-cover" onError={() => setFotoRota(true)} />
          ) : (
            inicial
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-14 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex items-stretch h-16 z-20">
        {NAV_ITEMS.map((item) => {
          const active = path === item.path || path.startsWith(item.path + '/')
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
