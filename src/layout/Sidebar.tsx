import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Store, ChevronLeft, ChevronRight, HomeIcon, ClipboardList, ClipboardCheck, UsersRound, Users, Package, MessageCircleQuestion, Receipt, FileText, Banknote, UserCircle, Building2, CheckSquare2, BarChart3, HandCoins, CreditCard, UserPlus, Settings, Map, Truck, Clapperboard, HelpCircle, LucideIcon } from "lucide-react"


import { cn } from "@/lib"
import { useAuthStore } from "@/stores"
import { puedeVer, permisosDe } from "@/lib/permisos"
import { LogoutButton } from "@/components"


import logoFull from "@/assets/promotorialogotipo_negativo.png"
import logoMark from "@/assets/isologo_promotoria_B.png"


interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  route: string;
  icon: LucideIcon;
  label: string;
  show: boolean;
  mobileOnly?: boolean;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const isAdmin = user?.i_rol === 1;
  const isNegocio = user?.i_rol === 2;

  const sections: MenuSection[] = [
    {
      label: "Operación",
      items: [
        { route: "/", icon: HomeIcon, label: "Inicio", show: true },
        { route: "/solicitudes", icon: ClipboardList, label: "Solicitudes", show: isAdmin || isNegocio },
        { route: "/pedidos", icon: FileText, label: "Órdenes de visita", show: isAdmin || isNegocio },
        { route: "/tareas", icon: CheckSquare2, label: "Visitas", show: isAdmin || isNegocio },
        { route: "/rechazos", icon: ClipboardCheck, label: "Rechazos por revisar", show: isAdmin },
        { route: "/logistica", icon: Map, label: "Logística", show: isNegocio },
        { route: "/mis-prepedidos", icon: ClipboardCheck, label: "Mis Pedidos", show: isNegocio },
        { route: "/choferes", icon: Truck, label: "Choferes", show: isNegocio },
      ],
    },
    {
      label: "Catálogo",
      items: [
        { route: "/clientes", icon: UsersRound, label: "Clientes", show: isAdmin },
        { route: "/promotores", icon: Users, label: "Promotores", show: isAdmin },
        { route: "/productos", icon: Package, label: "Productos", show: isAdmin || isNegocio },
        { route: "/establecimientos", icon: Store, label: "Establecimientos", show: isAdmin },
        { route: "/mis-establecimientos", icon: Store, label: "Mis establecimientos", show: isNegocio },
        { route: "/canales-venta", icon: CreditCard, label: "Canales de venta", show: isAdmin },
        { route: "/preguntas", icon: MessageCircleQuestion, label: "Preguntas", show: isAdmin },
      ],
    },
    {
      label: "Reportes",
      items: [
      ],
    },
    {
      label: "Negocio",
      items: [
        { route: "/mi-negocio", icon: Building2, label: "Mi Negocio", show: isNegocio },
        { route: "/perfil", icon: UserCircle, label: "Mi perfil", show: true, mobileOnly: true },
      ],
    },
    {
      label: "Sistema",
      items: [
        { route: "/configurar-app", icon: Settings, label: "Configurar app", show: isAdmin },
        { route: "/videos-introduccion", icon: Clapperboard, label: "Videos de introducción", show: isAdmin },
        { route: "/dudas-preguntas", icon: HelpCircle, label: "Dudas del promotor", show: isAdmin },
        { route: "/dudas-cliente", icon: HelpCircle, label: "Dudas del cliente", show: isAdmin },
        { route: "/equipo", icon: Users, label: "Equipo", show: isAdmin && permisosDe(user) === null },
      ],
    },
    {
      label: "Finanzas",
      items: [
        { route: "/finanzas/cobro-clientes", icon: HandCoins, label: "Cobro a clientes", show: isAdmin },
        { route: "/recargas", icon: CreditCard, label: "Ingresos de recargas de saldo", show: isAdmin },
        { route: "/finanzas/pago-promotores", icon: Banknote, label: "Pago a promotores", show: isAdmin },
        { route: "/finanzas/pago-activadores", icon: UserPlus, label: "Pago a activadores", show: isAdmin },
        { route: "/finanzas/pago-choferes", icon: Truck, label: "Pago a choferes", show: isAdmin },
        { route: "/finanzas/gestion-pagos", icon: CreditCard, label: "Gestión de pagos", show: isNegocio },
      ],
    },
  ];

  const NavLink = ({ item, isMobile }: { item: MenuItem; isMobile: boolean }) => {
    const isActive = pathname === item.route;
    const showLabel = isMobile || isExpanded;

    return (
      <Link
        to={item.route}
        onClick={isMobile ? onClose : undefined}
        title={!showLabel ? item.label : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
          !showLabel && "justify-center px-0",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon
          className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        {showLabel && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  // Contenido del menú (compartido entre desktop y mobile)
  const MenuContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <nav className="flex flex-col gap-5">
        {sections.map((section) => {
          const visible = section.items.filter(
            (item) => item.show && puedeVer(user, item.route) && (!item.mobileOnly || isMobile),
          );
          if (visible.length === 0) return null;

          return (
            <div key={section.label}>
              {(isMobile || isExpanded) ? (
                <p className="eyebrow !text-sidebar-foreground/50 px-3 mb-1.5">
                  {section.label}
                </p>
              ) : (
                <div className="mx-3 mb-2 border-t border-sidebar-border" />
              )}
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink key={item.route} item={item} isMobile={isMobile} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {isMobile && (
        <div className="space-y-3 shrink-0">
          <div className="border-t border-sidebar-border"></div>
          <LogoutButton isExpanded={true} />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Sidebar Desktop - DIV NORMAL (parte del flex) */}
      <div
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300 ease-in-out h-full shrink-0",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          isExpanded ? "w-60" : "w-[68px]",
        )}
      >
        {/* Header */}
        <div className="relative shrink-0 h-16 flex items-center px-4 border-b border-sidebar-border">
          <img
            src={isExpanded ? logoFull : logoMark}
            alt="Promotoria"
            className={cn(
              "object-contain transition-all duration-300",
              isExpanded ? "h-8" : "h-7 mx-auto",
            )}
          />

          {/* Botón de toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Colapsar menú" : "Expandir menú"}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 z-10",
              "bg-card text-foreground border border-border rounded-full p-1 shadow-sm",
              "hover:bg-accent transition-colors",
            )}
          >
            {isExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-2.5 py-4 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
          <MenuContent isMobile={false} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className={cn("font-mono text-[10px] tracking-widest uppercase text-sidebar-foreground/40", !isExpanded && "text-center")}>
            {isExpanded ? "© 2025 Promotoria" : "©"}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 px-4 shrink-0 flex items-center justify-between border-b border-sidebar-border">
          <img src={logoFull} alt="Promotoria" className="h-8 object-contain" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-accent rounded-md transition-colors"
            type="button"
            aria-label="Cerrar menú"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-2.5 py-4 flex flex-col justify-between overflow-y-auto">
          <MenuContent isMobile={true} />
        </div>

        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className="font-mono text-[10px] tracking-widest uppercase text-sidebar-foreground/40">
            © 2025 Promotoria
          </p>
        </div>
      </div>
    </>
  );
}
