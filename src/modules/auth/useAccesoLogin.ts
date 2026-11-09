import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useAuthStore } from "@/stores"
import { useDriverAuthStore } from "@/stores/driverAuthStore"
import { loginUser } from "@/Fetch/login"
import { driverLogin } from "@/Fetch/driverPanel"

/**
 * Logica de acceso compartida (pantalla /login y tarjeta de la portada).
 * Se intenta primero como cliente/master. Si no coincide, se prueba como
 * chofer (usa telefono en vez de usuario/correo) — asi la persona no tiene
 * que saber de antemano cual es su tipo de cuenta.
 */
export function useAccesoLogin() {
  const navigate = useNavigate();
  const authstore = useAuthStore();
  const driverLoginStore = useDriverAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const acceder = async (phone: string, password: string) => {
    if (!phone || !password || loading) return;
    setLoading(true);
    try {
      const response = await loginUser(phone.trim(), password);
      authstore.login(response.data.token, response.data.user);
      navigate(response.data.user.must_change_password ? "/cambiar-password-obligatorio" : "/");
      return;
    } catch (adminError) {
      try {
        const driverResponse = await driverLogin(phone.trim(), password);
        driverLoginStore(driverResponse.data.token, driverResponse.data.driver);
        navigate(driverResponse.data.driver.must_change_password ? "/chofer/nueva-password" : "/chofer/mapa");
        return;
      } catch (driverError) {
        console.error(adminError, driverError);
        toast.error("Celular o contraseña incorrectos");
      }
    } finally {
      setLoading(false);
    }
  };

  return { acceder, loading };
}
