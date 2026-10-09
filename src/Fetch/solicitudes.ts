import { useAuthStore } from "../stores/authStore";

const API_URL = import.meta.env.VITE_API_URL;

// --- INTERFACES BASADAS EN TU ESTRUCTURA ---
export interface QuestionPayload {
  id_pregunta: number;
  precio_aplicado: number;
}

export interface ProductPayload {
  id_product: number;
  subtotal: number;
  preguntas: QuestionPayload[];
}

export interface CreateRequestPayload {
  id_user: number;
  id_cliente: number;
  nombre_solicitud: string;
  costo_total: number;
  vc_image?: string;
  productos: ProductPayload[];
}

export interface RequestData {
  id_request: number;
  id_user: number;
  id_client?: number;
  vc_name: string;
  f_value: number;
  dt_register: string;
  dt_update: string;
  id_status: number;
  productos?: any[]; // Puedes tipar esto más detalladamente si lo necesitas luego
}

type ApiResponse<T> = {
  error?: boolean; // Hice este opcional por si tu backend no siempre lo manda
  ok: boolean;
  data: T;
  message?: string;
};

// Headers con autenticación
const authHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as HeadersInit;
};

// ==========================================
// MÉTODOS FETCH
// ==========================================

// 1. POST: Crear una nueva solicitud
export const createRequest = async (payload: CreateRequestPayload): Promise<ApiResponse<any>> => {
  const res = await fetch(`${API_URL}/admin/requests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al crear la solicitud");
  }
  return res.json();
};

// 2. GET: Obtener solicitudes por cliente
export const getRequestsByClient = async (id_client: number): Promise<ApiResponse<RequestData[]>> => {
  const res = await fetch(`${API_URL}/admin/requests/client/${id_client}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al obtener las solicitudes del cliente");
  }
  return res.json();
};

// 3. GET: Obtener detalle completo de una solicitud (con productos y preguntas)
export const getRequestById = async (id_request: number): Promise<ApiResponse<RequestData>> => {
  const res = await fetch(`${API_URL}/requests/${id_request}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al obtener el detalle de la solicitud");
  }
  return res.json();
};

// 6. PUT: Actualizar solicitud completa (multipart — soporta imagen)
export const updateFullRequest = async (
  id_request: number,
  payload: {
    id_user: number;
    id_client: number;
    vc_name: string;
    f_value: number;
    products: { id_product: number; questions: { id_question: number }[] }[];
    rackImage?: File | null;
    url_rack_image?: string | null;
    b_preorder?: boolean;
    preorder_date_mode?: string;
  }
): Promise<ApiResponse<any>> => {
  const token = useAuthStore.getState().token;

  const formData = new FormData();
  formData.append("id_user", payload.id_user.toString());
  formData.append("id_client", payload.id_client.toString());
  formData.append("vc_name", payload.vc_name);
  formData.append("f_value", payload.f_value.toString());
  formData.append("products", JSON.stringify(payload.products));
  if (payload.b_preorder !== undefined) {
    formData.append("b_preorder", payload.b_preorder.toString());
  }
  if (payload.preorder_date_mode) {
    formData.append("preorder_date_mode", payload.preorder_date_mode);
  }

  if (payload.rackImage) {
    formData.append("rackImage", payload.rackImage);
  } else if (payload.url_rack_image) {
    formData.append("url_rack_image", payload.url_rack_image);
  }

  const res = await fetch(`${API_URL}/requests/${id_request}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al actualizar la solicitud");
  }
  return res.json();
};

// 5. DELETE: Eliminar solicitud (borrado lógico)
export const deleteRequest = async (id_request: number): Promise<ApiResponse<any>> => {
  const res = await fetch(`${API_URL}/requests/${id_request}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al eliminar la solicitud");
  }
  return res.json();
};