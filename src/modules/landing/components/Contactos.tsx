import type { ConfigLanding } from "../tipos";
import {
  enlaceCorreo,
  enlaceMapa,
  enlaceSeguro,
  enlaceTel,
  enlaceWhatsapp,
  formatoTelefono10,
  sitioCorto,
} from "../lib/enlaces";
import { Icono, type NombreIcono } from "./Iconos";
import { Revelar } from "./Revelar";
import { Titulo } from "./Titulo";

type Dato = { icono: NombreIcono; etiqueta: string; valor: string; href: string | null };

// Solo entran los campos que el master llenó; si no hay ninguno, la sección no aparece.
function datosDe(c: ConfigLanding): Dato[] {
  const datos: Dato[] = [];
  if (c.telefono) datos.push({ icono: "telefono", etiqueta: "Teléfono", valor: c.telefono, href: enlaceTel(c.telefono) });
  if (c.whatsapp) {
    datos.push({
      icono: "whatsapp",
      etiqueta: "WhatsApp",
      valor: formatoTelefono10(c.whatsapp),
      href: enlaceWhatsapp(c.whatsapp),
    });
  }
  if (c.correo) datos.push({ icono: "correo", etiqueta: "Correo", valor: c.correo, href: enlaceCorreo(c.correo) });
  if (c.direccion) datos.push({ icono: "direccion", etiqueta: "Dirección", valor: c.direccion, href: enlaceMapa(c.direccion) });
  if (c.horario) datos.push({ icono: "horario", etiqueta: "Horario", valor: c.horario, href: null });
  const web = enlaceSeguro(c.sitio_web);
  if (web) datos.push({ icono: "web", etiqueta: "Sitio web", valor: sitioCorto(web), href: web });
  return datos;
}

export function Contactos({ config }: { config: ConfigLanding }) {
  const datos = datosDe(config);
  if (datos.length === 0) return null;

  return (
    <section className="bg-muted px-6 py-16 sm:py-20" aria-label="Nuestros contactos">
      <div className="mx-auto max-w-4xl">
        <Titulo>Nuestros contactos</Titulo>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datos.map((d, n) => {
            const interior = (
              <>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sidebar text-brand">
                  <Icono nombre={d.icono} />
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block text-muted-foreground">{d.etiqueta}</span>
                  <span className="block break-words text-base font-medium text-foreground [overflow-wrap:anywhere]">
                    {d.valor}
                  </span>
                </span>
              </>
            );
            const clases = "flex h-full items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm";
            return (
              <li key={d.etiqueta}>
                <Revelar retraso={n * 80} className="h-full">
                  {d.href ? (
                    <a
                      href={d.href}
                      target={d.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className={`${clases} transition-colors hover:border-brand hover:shadow-md`}
                    >
                      {interior}
                    </a>
                  ) : (
                    <div className={clases}>{interior}</div>
                  )}
                </Revelar>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
