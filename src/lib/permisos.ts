// Permisos del menu para usuarios super admin del equipo.
// vc_permisos NULL (o ausente) = usuario master: ve todo.
export interface ItemMenuAdmin {
  route: string
  label: string
  seccion: string
  extra?: string[]
}

export const CATALOGO_MENU: ItemMenuAdmin[] = [
  { route: "/solicitudes", label: "Solicitudes", seccion: "Operación", extra: ["/crearSolicitud", "/detalle-solicitud", "/editar-solicitud"] },
  { route: "/pedidos", label: "Órdenes de visita", seccion: "Operación", extra: ["/crearPedido", "/detalle-pedido"] },
  { route: "/tareas", label: "Visitas", seccion: "Operación" },
  { route: "/logistica", label: "Logística", seccion: "Operación" },
  { route: "/clientes", label: "Clientes", seccion: "Catálogo", extra: ["/crearCliente"] },
  { route: "/promotores", label: "Promotores", seccion: "Catálogo" },
  { route: "/productos", label: "Productos", seccion: "Catálogo", extra: ["/producto"] },
  { route: "/establecimientos", label: "Establecimientos", seccion: "Catálogo", extra: ["/establecimiento"] },
  { route: "/canales-venta", label: "Canales de venta", seccion: "Catálogo" },
  { route: "/preguntas", label: "Preguntas", seccion: "Catálogo" },
  { route: "/configurar-app", label: "Configurar app", seccion: "Sistema" },
  { route: "/videos-introduccion", label: "Videos de introducción", seccion: "Sistema" },
  { route: "/dudas-preguntas", label: "Dudas del promotor", seccion: "Sistema" },
  { route: "/dudas-cliente", label: "Dudas del cliente", seccion: "Sistema" },
  { route: "/finanzas/cobro-clientes", label: "Cobro a clientes", seccion: "Finanzas" },
  { route: "/finanzas/pago-promotores", label: "Pago a promotores", seccion: "Finanzas" },
  { route: "/finanzas/pago-activadores", label: "Pago a activadores", seccion: "Finanzas" },
]

// null = sin restricciones (master, clientes, o sesion vieja sin el dato)
export function permisosDe(user: any): string[] | null {
  if (!user || user.i_rol !== 1) return null
  const raw = user.vc_permisos
  if (raw === null || raw === undefined) return null
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function puedeVer(user: any, ruta: string): boolean {
  const permisos = permisosDe(user)
  if (permisos === null) return true
  if (ruta === "/" || ruta === "/perfil" || ruta.startsWith("/perfil/")) return true
  if (ruta === "/equipo" || ruta.startsWith("/equipo/")) return false
  const coincide = (r: string) => ruta === r || ruta.startsWith(r + "/")
  const item = CATALOGO_MENU.find((i) => coincide(i.route) || (i.extra ?? []).some(coincide))
  if (!item) return true
  return permisos.includes(item.route)
}
