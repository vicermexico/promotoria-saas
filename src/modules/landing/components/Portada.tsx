import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Fondo, Personaje } from "../tipos";
import logoBlanco from "@/assets/promotorialogotipo_principalblanco.png";

// La portada, en este orden: sale el fondo → entra el personaje → aparece su PUESTO en grande
// y se achica a un costado → aparece su NOMBRE y se acomoda arriba del puesto → si hay otro
// personaje, el primero se retira y el siguiente entra por el lado contrario → el último se
// queda fijo. La tarjeta de entrar aparece de inmediato y no depende de los personajes.

const SEGUNDOS_POR_FOTO = 7;

function Fondos({ fondos }: { fondos: Fondo[] }) {
  const [actual, setActual] = useState(0);
  const total = fondos.length;
  const item = fondos[actual % Math.max(total, 1)];

  // Las fotos cambian solas; un video avanza cuando termina (o a los 30 s como respaldo)
  useEffect(() => {
    if (total < 2 || !item) return;
    const espera = item.tipo === "video" ? 30000 : SEGUNDOS_POR_FOTO * 1000;
    const t = setTimeout(() => setActual((previo) => (previo + 1) % total), espera);
    return () => clearTimeout(t);
  }, [actual, item, total]);

  if (total === 0) return null;
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {fondos.map((f, n) =>
        f.tipo === "imagen" ? (
          <img
            key={f.id}
            src={f.url}
            alt=""
            loading={n === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ${
              n === actual % total ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : n === actual % total ? (
          <video
            key={f.id}
            src={f.url}
            autoPlay
            muted
            playsInline
            loop={total === 1}
            onEnded={() => setActual((previo) => (previo + 1) % total)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null,
      )}
    </div>
  );
}

// Tiempos (milisegundos), desde que entra cada personaje
const INICIO_PERSONAJE = 1000;
const RETRASO_PUESTO = 1700; // el personaje tarda 1.5 s en deslizarse; luego entra el puesto
const RETRASO_NOMBRE = 3100;
const DURACION_ROTULO = 2600;
const SE_QUEDA = 9500; // cuánto está un personaje antes de retirarse (si no es el último)
const TARDA_EN_SALIR = 900;

// Puesto o nombre: entra deslizándose desde el costado hacia el centro, en grande; se queda un
// momento y se achica hasta acomodarse junto al personaje. Con "reducir movimiento" solo hace un
// fundido suave. Se mide dónde queda al final para calcular el recorrido.
function Rotulo({
  lado,
  retraso,
  className,
  children,
}: {
  lado: "izq" | "der";
  retraso: number;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let animacion: Animation | undefined;
    const reloj = setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animacion = el.animate(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 1600, easing: "ease-out", fill: "both" },
        );
        return;
      }
      const r = el.getBoundingClientRect();
      const ancho = window.innerWidth;
      let grande = ancho >= 1024 ? 2 : 1.5;
      // En celular el rótulo grande se centra en el espacio LIBRE junto al personaje
      // (no pasa por encima de la persona); en compu va al centro de la pantalla.
      let centroX = ancho / 2;
      const foto = document.querySelector("[data-personaje-foto]")?.getBoundingClientRect();
      if (foto && ancho < 1024) {
        const libreIzq = lado === "izq" ? foto.right + 8 : 8;
        const libreDer = lado === "izq" ? ancho - 8 : foto.left - 8;
        const libre = Math.max(40, libreDer - libreIzq);
        centroX = (libreIzq + libreDer) / 2;
        grande = Math.max(1, Math.min(grande, libre / r.width));
      }
      const aCentroX = centroX - (r.left + r.width / 2);
      // El destino vertical se acota al interior de la portada
      let destinoY = window.innerHeight * 0.5;
      const portada = el.closest("section")?.getBoundingClientRect();
      if (portada) {
        const medio = (r.height * grande) / 2 + 12;
        const arriba = Math.max(portada.top, 0) + medio;
        const abajo = portada.bottom - medio;
        destinoY =
          abajo >= arriba ? Math.min(Math.max(destinoY, arriba), abajo) : (portada.top + portada.bottom) / 2;
      }
      const aCentroY = destinoY - (r.top + r.height / 2);
      // Punto de partida: fuera de la pantalla. En compu, del lado de su personaje;
      // en celular, del lado contrario para no cruzar por encima de la persona.
      const mitad = (r.width * grande) / 2 + 24;
      const vieneDeIzquierda = ancho < 1024 ? lado === "der" : lado === "izq";
      const desdeX = (vieneDeIzquierda ? -mitad : ancho + mitad) - (r.left + r.width / 2);
      const grandeEnCentro = `translate(${aCentroX}px, ${aCentroY}px) scale(${grande})`;
      animacion = el.animate(
        [
          {
            opacity: 0,
            transform: `translate(${desdeX}px, ${aCentroY}px) scale(${grande})`,
            offset: 0,
            easing: "cubic-bezier(0.35, 0.1, 0.25, 1)",
          },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, transform: grandeEnCentro, offset: 0.4 },
          { opacity: 1, transform: grandeEnCentro, offset: 0.56, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
          { opacity: 1, transform: "none", offset: 1 },
        ],
        { duration: DURACION_ROTULO, fill: "both" },
      );
    }, retraso);
    return () => {
      clearTimeout(reloj);
      animacion?.cancel();
    };
  }, [lado, retraso]);

  // Oculto hasta que le toca entrar
  return (
    <p ref={ref} style={{ opacity: 0 }} className={`${className} [overflow-wrap:anywhere]`}>
      {children}
    </p>
  );
}

// La foto del personaje llega YA recortada a la silueta (sin márgenes transparentes), así que
// su proporción real se lee al cargar la imagen. El tamaño se ajusta para que todos ocupen la
// misma "superficie" visual: una persona de pie mide ~0.3 de ancho/alto; las fotos más anchas
// se reducen un poco para no verse enormes.
const RAZON_PERSONA = 0.3;
function FotoPersonaje({ personaje, lado }: { personaje: Personaje; lado: "izq" | "der" }) {
  const [razon, setRazon] = useState<number | null>(null);
  const r = razon ?? RAZON_PERSONA;
  const factor = Math.min(1, Math.sqrt(RAZON_PERSONA / r));

  return (
    <div
      data-personaje-foto
      role="img"
      aria-label={personaje.nombre ?? ""}
      className={`personaje-${lado} relative shrink-0 h-[min(calc(min(46dvh,calc(max(85dvh,40rem)_-_22rem))*var(--f)),calc(52vw/var(--r)))] sm:h-[min(calc(min(46dvh,calc(max(85dvh,28rem)_-_15rem))*var(--f)),calc(52vw/var(--r)))] lg:h-[min(calc(72dvh*var(--f)),calc(30vw/var(--r)))]`}
      style={{ aspectRatio: r, "--r": r, "--f": factor } as CSSProperties}
    >
      <img
        src={personaje.url}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) setRazon(naturalWidth / naturalHeight);
        }}
        className="h-full w-full select-none object-contain object-bottom"
      />
    </div>
  );
}

function Personajes({ personajes }: { personajes: Personaje[] }) {
  const total = personajes.length;
  const [indice, setIndice] = useState(-1); // -1: todavía no entra ninguno
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (total === 0) return;
    const relojes: ReturnType<typeof setTimeout>[] = [];

    function mostrar(i: number) {
      setIndice(i);
      setSaliendo(false);
      // el último se queda fijo: no se programa nada más
      if (i < total - 1) {
        relojes.push(
          setTimeout(() => {
            setSaliendo(true);
            relojes.push(setTimeout(() => mostrar(i + 1), TARDA_EN_SALIR));
          }, SE_QUEDA),
        );
      }
    }

    relojes.push(setTimeout(() => mostrar(0), INICIO_PERSONAJE));
    return () => relojes.forEach(clearTimeout);
  }, [total]);

  const personaje = personajes[indice];
  if (!personaje) return null;
  // El primero entra por la izquierda, el segundo por la derecha, y así
  const izquierda = indice % 2 === 0;
  const lado = izquierda ? "izq" : "der";

  return (
    <div
      key={personaje.id}
      className={`pointer-events-none absolute inset-0 z-10 [clip-path:inset(0_0_-6rem_0)] ${saliendo ? `grupo-sale-${lado}` : ""}`}
    >
      <div
        className={`absolute -bottom-9 flex items-end gap-3 lg:-bottom-14 lg:gap-8 ${
          izquierda ? "left-3 flex-row lg:left-[8%]" : "right-3 flex-row-reverse lg:right-[8%]"
        }`}
      >
        <FotoPersonaje personaje={personaje} lado={lado} />
        {(personaje.nombre || personaje.puesto) && (
          <div
            className={`flex min-w-0 max-w-[42vw] flex-col gap-1.5 pb-[16dvh] lg:max-w-[26vw] lg:gap-3 lg:pb-[38dvh] ${
              izquierda ? "items-start text-left" : "items-end text-right"
            }`}
          >
            {personaje.nombre && (
              <Rotulo
                lado={lado}
                retraso={RETRASO_NOMBRE}
                className="sombra-texto font-display text-xl font-bold uppercase leading-tight tracking-[0.1em] text-white lg:text-4xl"
              >
                {personaje.nombre}
              </Rotulo>
            )}
            {personaje.puesto && (
              <Rotulo
                lado={lado}
                retraso={RETRASO_PUESTO}
                className="sombra-texto-suave eyebrow text-[10px] leading-snug text-white/90! lg:text-sm"
              >
                {personaje.puesto}
              </Rotulo>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Portada({
  fondos,
  personajes,
  encabezado,
  children,
}: {
  fondos: Fondo[];
  personajes: Personaje[];
  encabezado: ReactNode;
  children: ReactNode;
}) {
  // La tarjeta de entrar aparece enseguida, con un fundido suave; no espera a los personajes
  const [tarjeta, setTarjeta] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTarjeta(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative z-10 h-[85dvh] min-h-[40rem] overflow-x-clip sm:min-h-[28rem] bg-sidebar text-white">
      {/* El recorte del fondo va en su propia caja; la sección no recorta hacia abajo para que el personaje se asome */}
      <div className="absolute inset-0 overflow-hidden">
        {fondos.length === 0 && <div className="absolute inset-0 bg-dotgrid" aria-hidden="true" />}
        <Fondos fondos={fondos} />
        {/* Oscurece un poco (petróleo) para que se lea todo */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-sidebar/55 via-sidebar/25 to-sidebar/70"
          aria-hidden="true"
        />
      </div>

      {/* Tarjeta de entrar: arriba a la derecha; nada más se pone ahí */}
      <div
        className={`absolute inset-x-3 top-3 z-30 transition-opacity duration-1000 sm:fixed sm:inset-x-auto sm:right-5 sm:top-5 sm:w-80 ${
          tarjeta ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!tarjeta}
        inert={!tarjeta}
      >
        {children}
      </div>

      {/* Logo y nombre de la marca: lejos de la tarjeta */}
      <div className="absolute left-1/2 top-[15rem] z-20 sm:top-[9.5rem] flex w-full -translate-x-1/2 flex-col items-center gap-3 px-4 lg:bottom-[5dvh] lg:top-auto">
        <img src={logoBlanco} alt="Promotoria Digital" className="h-10 w-auto lg:h-14" />
        {encabezado}
      </div>

      <Personajes personajes={personajes} />
    </section>
  );
}
