import { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/stores"
import { useDriverAuthStore } from "@/stores/driverAuthStore"

interface Props {
  children: ReactNode;
}

export function PrivateRoute({ children }: Props) {
  const token = useAuthStore((state) => state.token);
  const driverToken = useDriverAuthStore((state) => state.token);

  if (!token) {
    // Un chofer con sesión abierta que cae en "/" (por ejemplo al abrir la app instalada) va a su ruta.
    return <Navigate to={driverToken ? "/chofer/ruta" : "/login"} replace />;
  }

  return <>{children}</>;
}
