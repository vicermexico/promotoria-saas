// Quita el verde de un cuadro de imagen/video (chroma key) cambiando su transparencia.
// `sensibilidad` va de 10 a 120 (más alto = quita más verde).
export function aplicarChroma(px: Uint8ClampedArray, sensibilidad: number) {
  const alto = sensibilidad
  const bajo = sensibilidad * 0.35
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2]
    const dominancia = g - Math.max(r, b) // cuánto más verde que rojo/azul
    if (dominancia <= bajo) continue
    if (dominancia >= alto) { px[i + 3] = 0; continue }
    // borde: transparencia parcial y se le quita el tinte verde
    const t = (dominancia - bajo) / (alto - bajo)
    px[i + 3] = Math.round(px[i + 3] * (1 - t))
    px[i + 1] = Math.max(r, b)
  }
}

export const SENSIBILIDAD_VIDEO = 60

// La fuerza del recorte de un video se guarda en el nombre del archivo ("personaje-f45.mp4"),
// así no hace falta tocar la base de datos. f0 = no quitar el verde. Sin marca = valor normal.
export function sensibilidadDeUrl(url: string): number {
  const m = /-f(\d{1,3})\.(mp4|webm|mov|m4v)$/i.exec(url.split("?")[0])
  return m ? Math.min(120, Number(m[1])) : SENSIBILIDAD_VIDEO
}
export const nombreArchivoVideo = (extension: string, sensibilidad: number) =>
  `personaje-f${Math.round(sensibilidad)}.${extension}`
