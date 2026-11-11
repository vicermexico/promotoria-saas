import { useEffect, useRef, useState } from "react";
import { aplicarChroma } from "../chromaKey";

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
  sensibilidad,
  onEnded,
  alNecesitarSonido,
}: {
  url: string;
  modo?: "portada" | "vista";
  sensibilidad: number; // 0 = no quitar el verde
  onEnded?: () => void;
  // Si el navegador no deja empezar con sonido, avisa con la función que lo activa (o null cuando ya no hace falta)
  alNecesitarSonido?: (activar: (() => void) | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finRef = useRef(onEnded);
  finRef.current = onEnded;
  const sensRef = useRef(sensibilidad);
  sensRef.current = sensibilidad; // se puede mover en vivo sin reiniciar el video
  const [aspecto, setAspecto] = useState(16 / 9);
  const avisoRef = useRef(alNecesitarSonido);
  avisoRef.current = alNecesitarSonido;

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
          if (sensRef.current > 0) {
            aplicarChroma(img.data, sensRef.current);
            ctx.putImageData(img, 0, 0);
          }
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
    // Quitar el silencio solo funciona dentro de un toque o clic ya completado; si no, el navegador pausa el video.
    // Por eso se escucha pointerup/click (no pointerdown) y después se vuelve a dar play por si se detuvo.
    const activar = () => {
      v.muted = false;
      v.play().catch(() => undefined);
      avisoRef.current?.(null);
      quitarEscuchas();
    };
    const destapar = () => {
      if (v.muted && !vista) activar();
    };
    const quitarEscuchas = () => {
      window.removeEventListener("pointerup", destapar);
      window.removeEventListener("click", destapar);
      window.removeEventListener("keydown", destapar);
    };
    v.muted = vista;
    v.play().catch(() => {
      if (vista) return;
      v.muted = true;
      avisoRef.current?.(activar);
      window.addEventListener("pointerup", destapar);
      window.addEventListener("click", destapar);
      window.addEventListener("keydown", destapar);
      v.play().catch(() => undefined);
    });

    siguiente();
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      v.cancelVideoFrameCallback?.(vfc);
      v.removeEventListener("loadedmetadata", alMeta);
      v.removeEventListener("ended", alTerminar);
      quitarEscuchas();
      avisoRef.current?.(null);
      v.pause();
    };
  }, [url, modo]);

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
    // Mismo alto y misma altura que los personajes en foto: pegado abajo y asomando un poco hacia lo blanco
    <div className="absolute inset-x-0 -bottom-9 flex justify-center overflow-hidden lg:-bottom-14 [--h-video:min(46dvh,calc(max(85dvh,40rem)_-_22rem))] sm:[--h-video:min(46dvh,calc(max(85dvh,28rem)_-_15rem))] lg:[--h-video:72dvh]">
      {video}
      <canvas
        ref={canvasRef}
        className="max-w-none shrink-0"
        style={{ aspectRatio: aspecto, height: "var(--h-video)" }}
        role="img"
        aria-label="Personaje"
      />
    </div>
  );
}
