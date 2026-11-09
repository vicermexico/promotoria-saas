import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores";
import { useDriverAuthStore } from "@/stores/driverAuthStore";
import { Layout } from "@/layout";
import { PrivateRoute } from "@/modules/auth";
import { Landing } from "./Landing";

// Elemento de la ruta "/". En exactamente "/":
//  - sesión de admin  -> Layout (Home), como siempre (tiene prioridad si hubiera ambas)
//  - sesión de chofer -> redirige a /chofer/ruta
//  - sin sesión       -> portada
// En cualquier otra ruta hija ("/clientes", "/pedidos"...) se comporta como antes:
// PrivateRoute + Layout (sin sesión de admin redirige a "/").
export function RaizPublica() {
  const token = useAuthStore((s) => s.token);
  const driverToken = useDriverAuthStore((s) => s.token);
  const { pathname } = useLocation();

  if (!token && pathname === "/") {
    if (driverToken) return <Navigate to="/chofer/ruta" replace />;
    return <Landing />;
  }

  return (
    <PrivateRoute>
      <Layout />
    </PrivateRoute>
  );
}
