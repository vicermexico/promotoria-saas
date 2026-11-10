// Recorte de fondo verde (chroma key) en el navegador, sin servicios externos.
// Devuelve un PNG con transparencia. `sensibilidad` va de 10 a 120 (más alto = quita más verde).

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
  const px = data.data
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
  ctx.putImageData(data, 0, 0)
}

export function canvasAPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo preparar la imagen"))), "image/png"),
  )
}
