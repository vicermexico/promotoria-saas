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
