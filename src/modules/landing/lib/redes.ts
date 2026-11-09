// Redes sociales de la portada. Pura (sin dependencias). Se acepta un enlace de la red correcta
// o, en las que lo permiten, solo el usuario («@empresa» o «empresa»).

export type Red = "instagram" | "facebook" | "tiktok" | "youtube" | "x" | "linkedin";

export type InfoRed = {
  red: Red;
  nombre: string;
  campo: `${Red}_url`; // columna en la configuración
  ejemplo: string;
  dominios: string[];
  // Arma el enlace a partir del usuario; null = esta red exige el enlace completo
  base: ((usuario: string) => string) | null;
};

export const REDES: InfoRed[] = [
  { red: "instagram", nombre: "Instagram", campo: "instagram_url", ejemplo: "https://www.instagram.com/empresa", dominios: ["instagram.com"], base: (u) => `https://www.instagram.com/${u}` },
  { red: "facebook", nombre: "Facebook", campo: "facebook_url", ejemplo: "https://www.facebook.com/empresa", dominios: ["facebook.com", "fb.com", "fb.me"], base: (u) => `https://www.facebook.com/${u}` },
  { red: "tiktok", nombre: "TikTok", campo: "tiktok_url", ejemplo: "https://www.tiktok.com/@empresa", dominios: ["tiktok.com"], base: (u) => `https://www.tiktok.com/@${u}` },
  { red: "youtube", nombre: "YouTube", campo: "youtube_url", ejemplo: "https://www.youtube.com/@empresa", dominios: ["youtube.com", "youtu.be"], base: (u) => `https://www.youtube.com/@${u}` },
  { red: "x", nombre: "X", campo: "x_url", ejemplo: "https://x.com/empresa", dominios: ["x.com", "twitter.com"], base: (u) => `https://x.com/${u}` },
  { red: "linkedin", nombre: "LinkedIn", campo: "linkedin_url", ejemplo: "https://www.linkedin.com/company/empresa", dominios: ["linkedin.com"], base: null },
];

export type ResultadoRed = { ok: true; url: string | null } | { ok: false; error: string };

export function normalizarRed(red: Red, valor: unknown): ResultadoRed {
  const info = REDES.find((r) => r.red === red);
  if (!info) return { ok: false, error: "Red no válida." };
  const texto = String(valor ?? "").trim();
  if (!texto) return { ok: true, url: null };
  if (texto.length > 200) return { ok: false, error: `El enlace de ${info.nombre} es muy largo.` };

  // Solo el usuario («@usuario» o «usuario»)
  if (
    info.base &&
    /^@?[A-Za-z0-9._]{2,60}$/.test(texto) &&
    !info.dominios.some((d) => texto.toLowerCase().includes(d))
  ) {
    return { ok: true, url: info.base(texto.replace(/^@/, "")) };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return { ok: false, error: `El enlace de ${info.nombre} no se entiende. Ejemplo: ${info.ejemplo}` };
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|web|mobile)\./, "");
  if (!info.dominios.some((d) => host === d || host.endsWith(`.${d}`))) {
    return { ok: false, error: `Ese enlace no es de ${info.nombre}. Ejemplo: ${info.ejemplo}` };
  }
  url.protocol = "https:";
  return { ok: true, url: url.toString() };
}
