import { useEffect, useState } from "react";

import { getDatosLanding } from "@/Fetch/landing";
import { Portada } from "./components/Portada";
import { TarjetaLogin } from "./components/TarjetaLogin";
import { Clientes } from "./components/Clientes";
import { Contactos } from "./components/Contactos";
import { RedesYPie } from "./components/RedesYPie";
import { DATOS_VACIOS, TITULO_POR_DEFECTO, type DatosLanding } from "./tipos";

// Portada pública (visitantes sin sesión). Todo el contenido lo edita el master desde el panel;
// mientras carga, o si el backend no responde, se ve la portada base con el título de ejemplo.
export function Landing() {
  const [datos, setDatos] = useState<DatosLanding>(DATOS_VACIOS);

  useEffect(() => {
    let vigente = true;
    getDatosLanding().then((d) => {
      if (vigente) setDatos(d);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const titulo = datos.config.titulo?.trim() || TITULO_POR_DEFECTO;

  return (
    <main className="min-h-dvh overflow-x-clip bg-background">
      <Portada
        fondos={datos.fondos}
        personajes={datos.personajes}
        encabezado={
          <h1 className="sombra-texto text-center font-display text-2xl font-bold tracking-tight text-white lg:text-4xl">
            {titulo}
          </h1>
        }
      >
        <TarjetaLogin />
      </Portada>

      <Clientes clientes={datos.clientes} />
      <Contactos config={datos.config} />
      <RedesYPie config={datos.config} />
    </main>
  );
}
