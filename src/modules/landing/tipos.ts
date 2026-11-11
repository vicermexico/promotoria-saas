// Contrato de datos de la portada pública. Lo devuelve GET /inicio (ver Fetch/landing.ts).

export type Fondo = { id: number; tipo: "imagen" | "video"; url: string };

// Foto de la persona YA recortada (PNG con transparencia).
export type Personaje = {
  id: number;
  nombre: string | null;
  puesto: string | null;
  // "video": grabado con fondo verde; el navegador le quita el verde al reproducirlo.
  tipo?: "imagen" | "video";
  url: string;
};

export const esVideoPersonaje = (p: Personaje) =>
  p.tipo === "video" || /\.(mp4|webm|mov|m4v)$/i.test(p.url.split("?")[0]);

export type Cliente = {
  id: number;
  nombre: string;
  tipo: "imagen" | "video";
  url: string;
  enlace: string | null;
};

// Fila única de configuración: título, contactos, redes y crédito. Vacío = no se muestra.
export type ConfigLanding = {
  titulo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  direccion: string | null;
  horario: string | null;
  sitio_web: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  dev_nombre: string | null;
  dev_whatsapp: string | null;
};

export type DatosLanding = {
  fondos: Fondo[];
  personajes: Personaje[];
  clientes: Cliente[];
  config: ConfigLanding;
};

export const CONFIG_VACIA: ConfigLanding = {
  titulo: null,
  telefono: null,
  whatsapp: null,
  correo: null,
  direccion: null,
  horario: null,
  sitio_web: null,
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  youtube_url: null,
  x_url: null,
  linkedin_url: null,
  dev_nombre: null,
  dev_whatsapp: null,
};

export const DATOS_VACIOS: DatosLanding = {
  fondos: [],
  personajes: [],
  clientes: [],
  config: CONFIG_VACIA,
};

// Texto de ejemplo mientras no se capture el título desde el panel.
export const TITULO_POR_DEFECTO = "Título de ejemplo";
