import { CONFIG_VACIA, DATOS_VACIOS, type DatosLanding } from "@/modules/landing/tipos";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Datos de la portada pública (GET /inicio). Endpoint público: se usa fetch directo,
 * sin token. Si el backend no responde, devuelve datos vacíos y cada sección se oculta.
 */
export async function getDatosLanding(): Promise<DatosLanding> {
  try {
    const res = await fetch(`${API_URL}/inicio`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return DATOS_VACIOS;
    const json = await res.json();
    const d = (json?.data ?? {}) as Partial<DatosLanding>;
    return {
      fondos: d.fondos ?? [],
      personajes: d.personajes ?? [],
      clientes: d.clientes ?? [],
      config: { ...CONFIG_VACIA, ...(d.config ?? {}) },
    };
  } catch {
    return DATOS_VACIOS;
  }
}
