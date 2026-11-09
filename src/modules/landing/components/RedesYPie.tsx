import { Link } from "react-router-dom";
import type { ConfigLanding } from "../tipos";
import { enlaceSeguro, enlaceWhatsapp } from "../lib/enlaces";
import { REDES, type Red } from "../lib/redes";
import { Icono } from "./Iconos";
import { Revelar } from "./Revelar";
import { Titulo } from "./Titulo";

// Redes sociales (solo las que tienen enlace), enlaces legales y crédito del desarrollador.
// Sin redes no sale "Síguenos"; sin nombre del desarrollador no sale el crédito; sin su
// WhatsApp el crédito sale sin el botón. El pie con los enlaces legales siempre aparece.
export function RedesYPie({ config }: { config: ConfigLanding }) {
  const redes = REDES.map((r) => ({
    red: r.red,
    nombre: r.nombre,
    href: enlaceSeguro(config[r.campo]),
  })).filter((r): r is { red: Red; nombre: string; href: string } => !!r.href);

  const devNombre = config.dev_nombre?.trim() || null;
  const devEnlace = enlaceWhatsapp(
    config.dev_whatsapp,
    devNombre ? `Hola ${devNombre}, vi su crédito en la plataforma y quiero más información.` : undefined,
  );

  return (
    <footer className="bg-sidebar px-6 pb-10 pt-16 text-white">
      <div className="mx-auto max-w-4xl">
        {redes.length > 0 && (
          <div>
            <Titulo oscuro>Síguenos</Titulo>
            <Revelar>
              <ul className="flex flex-wrap justify-center gap-4">
                {redes.map((r) => (
                  <li key={r.red}>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${r.nombre} (se abre en una pestaña nueva)`}
                      title={r.nombre}
                      className="grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform hover:-translate-y-1"
                    >
                      <Icono nombre={r.red} className="h-7 w-7" />
                    </a>
                  </li>
                ))}
              </ul>
            </Revelar>
          </div>
        )}

        {devNombre && (
          <Revelar className={redes.length > 0 ? "mt-14 border-t border-white/20 pt-8" : ""}>
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-white/80">
                <strong className="font-semibold text-white">{devNombre}</strong> — desarrollador de esta plataforma
              </p>
              {devEnlace && (
                <a
                  href={devEnlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center rounded-md bg-brand px-6 text-sm font-medium text-brand-foreground shadow-sm transition-shadow hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_35%,transparent)]"
                >
                  Contáctanos
                </a>
              )}
            </div>
          </Revelar>
        )}

        <nav
          aria-label="Información legal"
          className={`flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70 ${
            redes.length > 0 || devNombre ? "mt-12 border-t border-white/20 pt-6" : ""
          }`}
        >
          <Link to="/aviso-de-privacidad" className="hover:text-white hover:underline">
            Aviso de privacidad
          </Link>
          <Link to="/terminos" className="hover:text-white hover:underline">
            Términos y condiciones
          </Link>
        </nav>
      </div>
    </footer>
  );
}
