import { useEffect, useRef, useState } from "react";
import type { Cliente } from "../tipos";
import { enlaceSeguro } from "../lib/enlaces";
import { Revelar } from "./Revelar";
import { Titulo } from "./Titulo";

// "Nuestros clientes": una empresa a la vez, con fundido entre una y otra, en bucle.
// Una imagen dura SEGUNDOS_POR_CLIENTE; un video avanza cuando termina (o a los 30 s).
// Si el cliente tiene enlace, toda la tarjeta es clicable; si no, es un bloque plano.
// Sin clientes la sección no aparece.

const SEGUNDOS_POR_CLIENTE = 4.5;
const MAX_VIDEO_MS = 30000;

type PropsTarjeta = {
  cliente: Cliente;
  activo: boolean;
  unico: boolean;
  alTerminar: () => void;
};

function Media({ cliente, activo, unico, alTerminar }: PropsTarjeta) {
  const video = useRef<HTMLVideoElement>(null);
  const clase = "max-h-32 w-auto max-w-full object-contain sm:max-h-44";

  // El video solo corre mientras es el actual y arranca desde el principio
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (activo) {
      el.currentTime = 0;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [activo]);

  if (cliente.tipo === "imagen") {
    return <img src={cliente.url} alt={cliente.nombre} loading="lazy" draggable={false} className={clase} />;
  }
  return (
    <video
      ref={video}
      src={cliente.url}
      muted
      playsInline
      preload="metadata"
      loop={unico}
      onEnded={() => activo && alTerminar()}
      aria-label={cliente.nombre}
      className={clase}
    />
  );
}

function Tarjeta(props: PropsTarjeta) {
  const { cliente, activo } = props;
  const href = enlaceSeguro(cliente.enlace);
  const base = `absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 transition-opacity duration-700 ${
    activo ? "opacity-100" : "pointer-events-none opacity-0"
  }`;
  const interior = (
    <>
      <Media {...props} />
      <p className={`text-center text-base font-semibold text-foreground ${href ? "group-hover:underline" : ""}`}>
        {cliente.nombre}
      </p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={activo ? 0 : -1}
        aria-hidden={!activo}
        aria-label={`${cliente.nombre} (se abre en una pestaña nueva)`}
        className={`${base} group`}
      >
        {interior}
      </a>
    );
  }
  return (
    <div aria-hidden={!activo} className={base}>
      {interior}
    </div>
  );
}

export function Clientes({ clientes }: { clientes: Cliente[] }) {
  const [actual, setActual] = useState(0);
  const total = clientes.length;
  const indice = total > 0 ? actual % total : 0;
  const item = clientes[indice];

  useEffect(() => {
    if (total < 2 || !item) return;
    const espera = item.tipo === "video" ? MAX_VIDEO_MS : SEGUNDOS_POR_CLIENTE * 1000;
    const t = setTimeout(() => setActual((previo) => (previo + 1) % total), espera);
    return () => clearTimeout(t);
  }, [actual, item, total]);

  if (total === 0) return null;

  const siguiente = () => setActual((previo) => (previo + 1) % total);

  return (
    <section className="bg-background px-6 py-16 sm:py-20" aria-label="Nuestros clientes">
      <div className="mx-auto max-w-3xl">
        <Titulo>Nuestros clientes</Titulo>
        <Revelar>
          <div className="relative mx-auto h-56 w-full max-w-md sm:h-72">
            {clientes.map((c, n) => (
              <Tarjeta key={c.id} cliente={c} activo={n === indice} unico={total === 1} alTerminar={siguiente} />
            ))}
          </div>
          {total > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {clientes.map((c, n) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActual(n)}
                  aria-label={`Ver ${c.nombre}`}
                  aria-current={n === indice}
                  className={`h-2.5 rounded-full transition-all ${
                    n === indice ? "w-6 bg-primary" : "w-2.5 bg-primary/25 hover:bg-primary/50"
                  }`}
                />
              ))}
            </div>
          )}
        </Revelar>
      </div>
    </section>
  );
}
