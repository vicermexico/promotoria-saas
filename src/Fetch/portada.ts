import { api, ApiResponse } from "@/lib";
import type { DatosLanding, ConfigLanding, Fondo, Personaje, Cliente } from "@/modules/landing/tipos";

// Admin de la portada (master). La lectura es GET /inicio; el resto exige sesión de master.
export type SeccionPortada = "fondos" | "personajes" | "clientes";

export const getInicioAdmin = () => api.get<ApiResponse<DatosLanding>>(`/inicio`);

const fd = (
  archivo?: File | Blob,
  campos: Record<string, string | null | undefined> = {},
  nombreArchivo?: string,
) => {
  const f = new FormData();
  if (archivo) f.append("archivo", archivo, nombreArchivo ?? (archivo instanceof File ? archivo.name : "archivo"));
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && v !== null) f.append(k, v);
  return f;
};

// Fondos
export const addFondo = (archivo: File) => api.upload<ApiResponse<Fondo>>(`/inicio/fondos`, fd(archivo));
export const deleteFondo = (id: number) => api.delete<ApiResponse<unknown>>(`/inicio/fondos/${id}`);

// Personajes (el archivo es el PNG ya recortado)
export const addPersonaje = (archivo: Blob, nombre: string, puesto: string) =>
  api.upload<ApiResponse<Personaje>>(`/inicio/personajes`, fd(archivo, { nombre, puesto }, "personaje.png"));
export const updatePersonaje = (id: number, campos: { nombre: string; puesto: string }, archivo?: Blob) =>
  api.uploadPut<ApiResponse<Personaje>>(`/inicio/personajes/${id}`, fd(archivo, campos, "personaje.png"));
export const deletePersonaje = (id: number) => api.delete<ApiResponse<unknown>>(`/inicio/personajes/${id}`);

// Clientes
export const addCliente = (archivo: File, nombre: string, enlace: string) =>
  api.upload<ApiResponse<Cliente>>(`/inicio/clientes`, fd(archivo, { nombre, enlace }));
export const updateCliente = (id: number, campos: { nombre: string; enlace: string }, archivo?: File) =>
  api.uploadPut<ApiResponse<Cliente>>(`/inicio/clientes/${id}`, fd(archivo, campos));
export const deleteCliente = (id: number) => api.delete<ApiResponse<unknown>>(`/inicio/clientes/${id}`);

// Config general y orden
export const updateConfigPortada = (config: Partial<ConfigLanding>) =>
  api.put<ApiResponse<ConfigLanding>>(`/inicio/config`, config);
export const reordenarPortada = (seccion: SeccionPortada, ids: number[]) =>
  api.put<ApiResponse<unknown>>(`/inicio/${seccion}/orden`, { ids });
