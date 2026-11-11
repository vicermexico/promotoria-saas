import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { Button, Input } from "@/components";
import { useAccesoLogin } from "@/modules/auth/useAccesoLogin";

// Tarjeta de "Iniciar sesión" de la portada. Usa la misma lógica de acceso que /login
// (useAccesoLogin: detecta admin o chofer, mismos errores y redirecciones), sin navegar a otra pantalla.
export function TarjetaLogin() {
  const { acceder, loading } = useAccesoLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await acceder(phone, password);
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-brand bg-card text-card-foreground shadow-2xl ring-4 ring-white/30">
      <h2 className="eyebrow flex items-center gap-2 bg-sidebar px-4 py-2 text-white!">
        <LogIn className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        Iniciar sesión
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-2 gap-y-2 p-3 sm:grid-cols-1 sm:gap-3 sm:p-4">
        <div>
          <label htmlFor="tarjeta-phone" className="mb-1 block text-xs font-medium text-foreground sm:mb-1.5 sm:text-sm">
            Celular
          </label>
          <Input
            id="tarjeta-phone"
            type="tel"
            placeholder="10 dígitos"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="tarjeta-password" className="mb-1 block text-xs font-medium text-foreground sm:mb-1.5 sm:text-sm">
            Contraseña
          </label>
          <Input
            id="tarjeta-password"
            type="password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full"
          />
        </div>
        <Button type="submit" variant="brand" size="lg" className="col-span-2 w-full sm:col-span-1" disabled={loading || !phone || !password}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
        <div className="col-span-2 text-center text-xs text-muted-foreground sm:col-span-1">
          <Link to="/restore-pwd" className="font-medium text-foreground hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </div>
  );
}
