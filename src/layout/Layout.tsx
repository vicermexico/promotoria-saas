import { useState } from "react"
import { Menu, X, LogOut, User } from "lucide-react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { puedeVer } from "@/lib/permisos"

import { usePageTransition } from "@/lib/motion";
import { Sidebar } from "./Sidebar"
import { AsistenteCliente } from "@/components/asistente/AsistenteCliente"
import { useAuthStore } from "@/stores"
import { SidebarProvider, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, ThemeToggleHeader } from '@/components'
import { useAuthCheck } from '@/hooks'


const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/clientes": "Clientes",
  "/crearCliente": "Nuevo cliente",
  "/productos": "Productos",
  "/producto": "Nuevo producto",
  "/establecimientos": "Establecimientos",
  "/mis-establecimientos": "Mis establecimientos",
  "/equipo": "Equipo",
  "/dudas-cliente": "Dudas del cliente",
  "/establecimiento": "Nuevo establecimiento",
  "/preguntas": "Preguntas",
  "/solicitudes": "Solicitudes",
  "/crearSolicitud": "Nueva solicitud",
  "/pedidos": "Órdenes de visita",
  "/crearPedido": "Nueva orden de visita",
  "/finanzas": "Finanzas",
  "/finanzas/cobro-clientes": "Cobro a clientes",
  "/finanzas/pago-promotores": "Pago a promotores",
  "/finanzas/pago-activadores": "Pago a activadores",
  "/finanzas/gestion-pagos": "Gestión de pagos",
  "/finanzas/gestion-gastos": "Gestión de gastos",
  "/configurar-app": "Configurar app",
  "/videos-introduccion": "Videos de introducción",
  "/reportes/pedidos": "Reporte de pedidos",
  "/mi-negocio": "Mi Negocio",
  "/perfil": "Mi Perfil",
  "/servicios": "Servicios",
};

function getRouteLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Dynamic routes
  if (pathname.startsWith("/clientes/")) return "Detalle de cliente";
  if (pathname.startsWith("/producto/detalle/")) return "Detalle de producto";
  if (pathname.startsWith("/producto/")) return "Editar producto";
  if (pathname.startsWith("/establecimiento/detalle/")) return "Detalle de establecimiento";
  if (pathname.startsWith("/establecimiento/")) return "Editar establecimiento";
  if (pathname.startsWith("/preguntas/detalle/")) return "Detalle de pregunta";
  if (pathname.startsWith("/cotizaciones/detalle/")) return "Detalle de cotización";
  if (pathname.startsWith("/detalle-solicitud/")) return "Detalle de solicitud";
  if (pathname.startsWith("/editar-solicitud/")) return "Editar solicitud";
  if (pathname.startsWith("/detalle-pedido/")) return "Detalle de pedido";
  return "Promotoria";
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary text-primary-foreground">
      {initials || "U"}
    </div>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const pageRef = usePageTransition<HTMLDivElement>();
  useAuthCheck();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  const pageLabel = getRouteLabel(location.pathname);
  const userName = [user?.name, user?.lastname].filter(Boolean).join(" ") || "Usuario";

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <SidebarProvider>
      <div className="relative flex h-screen w-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
        {user?.i_rol === 2 && <AsistenteCliente />}

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
            onClick={handleCloseSidebar}
            style={{ pointerEvents: "auto" }}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center p-4 border-b border-border bg-card/80 backdrop-blur relative z-50">
            <button
              onClick={handleMenuToggle}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              type="button"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="ml-3 font-semibold text-base text-foreground flex-1 min-w-0 truncate">
              {pageLabel}
            </h1>
            <ThemeToggleHeader className="shrink-0" />
          </div>

          {/* Desktop top header */}
          <div className="hidden lg:flex items-center justify-between px-6 h-14 shrink-0 border-b border-border bg-card/80 backdrop-blur">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground shrink-0">
                Promotoria
              </span>
              <span className="text-muted-foreground/50 text-xs shrink-0">/</span>
              <span className="text-sm font-semibold text-foreground truncate">
                {pageLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
            <ThemeToggleHeader />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="text-right">
                    <p className="text-xs font-medium leading-none text-foreground">
                      {userName}
                    </p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {user?.i_rol === 1 ? "Super Admin" : "Administrador"}
                    </p>
                  </div>
                  <UserAvatar name={userName} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer gap-2">
                  <User className="w-4 h-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-auto bg-background">
            <div ref={pageRef} className="min-h-full">
              {puedeVer(user, location.pathname) ? <Outlet /> : <Navigate to="/" replace />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
