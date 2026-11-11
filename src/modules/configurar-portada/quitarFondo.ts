// Recorte de fondo verde (chroma key) en el navegador, sin servicios externos.
// Devuelve un PNG con transparencia. `sensibilidad` va de 10 a 120 (más alto = quita más verde).

import { aplicarChroma } from "@/modules/landing/chromaKey"

const MAX_LADO = 1400

export async function cargarImagen(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    // decode ya terminó: el bitmap queda en memoria
    URL.revokeObjectURL(url)
  }
}

export function dibujarRecorte(img: HTMLImageElement, canvas: HTMLCanvasElement, quitarVerde: boolean, sensibilidad: number) {
  const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * escala))
  const h = Math.max(1, Math.round(img.naturalHeight * escala))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  if (!quitarVerde) return

  const data = ctx.getImageData(0, 0, w, h)
  aplicarChroma(data.data, sensibilidad)
  ctx.putImageData(data, 0, 0)
}

export function canvasAPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo preparar la imagen"))), "image/png"),
  )
}
