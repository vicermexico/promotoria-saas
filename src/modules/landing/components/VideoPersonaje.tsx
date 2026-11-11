import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { aplicarChroma, SENSIBILIDAD_VIDEO } from "../chromaKey";

type ConCuadros = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

const MAX_ANCHO = 960; // se procesa a este ancho como máximo para que corra fluido en celular

// Reproduce un video grabado con fondo verde y le quita el verde cuadro por cuadro.
// El <video> real queda invisible; lo que se ve es un canvas con transparencia.
// - "portada": ocupa de lado a lado, pegado abajo (la altura sigue la de los personajes).
// - "vista": vista previa chica en el panel (en bucle y sin sonido).
export function VideoPersonaje({
  url,
  modo = "portada",
  onEnded,
}: {
  url: string;
  modo?: "portada" | "vista";
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finRef = useRef(onEnded);
  finRef.current = onEnded;
  const [aspecto, setAspecto] = useState(16 / 9);
  const [sinSonido, setSinSonido] = useState(false);

  useEffect(() => {
    const v = videoRef.current as ConCuadros | null;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let vivo = true;
    let raf = 0;
    let vfc = 0;

    const siguiente = () => {
      if (!vivo) return;
      if (v.requestVideoFrameCallback) vfc = v.requestVideoFrameCallback(pintar);
      else raf = requestAnimationFrame(pintar);
    };
    function pintar() {
      if (!vivo || !v || !c || !ctx) return;
      if (v.readyState >= 2 && v.videoWidth > 0) {
        const esc = Math.min(1, MAX_ANCHO / v.videoWidth);
        const w = Math.round(v.videoWidth * esc);
        const h = Math.round(v.videoHeight * esc);
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
        }
        ctx.drawImage(v, 0, 0, w, h);
        try {
          const img = ctx.getImageData(0, 0, w, h);
          aplicarChroma(img.data, SENSIBILIDAD_VIDEO);
          ctx.putImageData(img, 0, 0);
        } catch {
          // sin permiso para leer los cuadros (CORS): se queda el cuadro tal cual
        }
      }
      siguiente();
    }

    const alMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) setAspecto(v.videoWidth / v.videoHeight);
    };
    const alTerminar = () => finRef.current?.();
    v.addEventListener("loadedmetadata", alMeta);
    v.addEventListener("ended", alTerminar);

    // Con sonido si el navegador lo deja; si no, mudo y se activa con el primer toque o con el botón
    const vista = modo === "vista";
    v.muted = vista;
    v.play().catch(() => {
      if (vista) return;
      v.muted = true;
      setSinSonido(true);
      v.play().catch(() => undefined);
    });
    const destapar = () => {
      if (v.muted && !vista) {
        v.muted = false;
        setSinSonido(false);
      }
    };
    window.addEventListener("pointerdown", destapar, { once: true });
    window.addEventListener("keydown", destapar, { once: true });

    siguiente();
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      v.cancelVideoFrameCallback?.(vfc);
      v.removeEventListener("loadedmetadata", alMeta);
      v.removeEventListener("ended", alTerminar);
      window.removeEventListener("pointerdown", destapar);
      window.removeEventListener("keydown", destapar);
      v.pause();
    };
  }, [url, modo]);

  const activarSonido = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setSinSonido(false);
  };

  const video = (
    <video
      ref={videoRef}
      src={url}
      crossOrigin="anonymous"
      playsInline
      preload="auto"
      loop={modo === "vista"}
      className="pointer-events-none absolute h-px w-px opacity-0"
      aria-hidden="true"
    />
  );

  if (modo === "vista") {
    return (
      <>
        {video}
        <canvas ref={canvasRef} className="max-h-80 max-w-full object-contain" />
      </>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden [--h-video:min(46dvh,calc(max(85dvh,40rem)_-_22rem))] sm:[--h-video:min(46dvh,calc(max(85dvh,28rem)_-_15rem))] lg:[--h-video:72dvh]">
      {video}
      <canvas
        ref={canvasRef}
        className="max-w-none shrink-0"
        style={{ aspectRatio: aspecto, height: `min(85dvh, max(var(--h-video), calc(100vw / ${aspecto})))` }}
        role="img"
        aria-label="Personaje"
      />
      {sinSonido && (
        <button
          type="button"
          onClick={activarSonido}
          className="pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/75"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          Activar sonido
        </button>
      )}
    </div>
  );
}
