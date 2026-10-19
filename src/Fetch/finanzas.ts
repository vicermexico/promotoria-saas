import { api, ApiResponse } from "@/lib";
import { useAuthStore } from "@/stores";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

// Coincide 1 a 1 con CLIENT_CHARGE_STATUS del backend
export const INVOICE_STATUS = {
  PENDIENTE_PAGO: 1,
  EN_VALIDACION: 2,
  OBSERVADO: 3,
  PAGADO: 4,
  CANCELADO: 5,
} as const;

export type InvoiceStatusId = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatusId, string> = {
  1: "Pendiente de pago",
  2: "En validación",
  3: "Observada",
  4: "Pagada",
  5: "Cancelada",
};

export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "oxxo";

// Una FACTURA individual (1 pedido = 1 factura), dentro de un CORTE (periodo)
export interface ClientInvoice {
  id: number;
  id_charge: number;
  id_order: number;
  vc_folio: string | null;
  f_amount: string;
  id_status: InvoiceStatusId;
  dt_due: string | null;
  dt_payment: string | null;
  vc_payment_method: string | null;
  vc_rejection_reason: string | null;
  dt_register: string;
  dt_updated: string;
  charge: {
    id_charge: number;
    id_client: number;
    vc_folio: string | null;
    dt_start: string;
    dt_end: string;
    f_total: string;
  };
  order: {
    id_order: number;
    id_client: number;
  };
}

export interface InvoiceEvidence {
  id_asset: number;
  vc_url: string;
  vc_mime: string | null;
}

export interface InvoiceLog {
  id_charge_log: number;
  vc_log: string;
  dt_register: string;
}

export interface ClientChargeTaskItem {
  id: number;
  id_charge: number;
  id_order: number;
  id_task: number;
  f_amount: string;
  task: {
    id_task: number;
    store?: Record<string, any> | null;
    request?: Record<string, any> | null;
    promoter?: { id: number; name: string; lastname: string | null; email: string | null; phone: string } | null;
  };
}

export interface ClientInvoiceDetail extends ClientInvoice {
  tasks: ClientChargeTaskItem[];
  evidences: InvoiceEvidence[];
  logs: InvoiceLog[];
}

export interface InvoiceListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceListResponse {
  data: ClientInvoice[];
  meta: InvoiceListMeta;
}

export interface InvoiceFilters {
  id_client?: number;
  id_status?: InvoiceStatusId;
  dt_start?: string;
  dt_end?: string;
  vc_folio?: string;
  b_overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface SubmitInvoicePaymentPayload {
  dt_payment: string;
  vc_payment_method: MetodoPago;
  evidence: File;
}

export type InvoiceStatusAction = "approve" | "reject" | "cancel";

export interface UpdateInvoiceStatusPayload {
  action: InvoiceStatusAction;
  vc_rejection_reason?: string;
}

// Helper: ¿esta factura está vencida? (sigue sin pagar y ya pasó su fecha límite)
export const isInvoiceOverdue = (invoice: ClientInvoice): boolean => {
  if (!invoice.dt_due) return false;
  if (invoice.id_status !== INVOICE_STATUS.PENDIENTE_PAGO && invoice.id_status !== INVOICE_STATUS.OBSERVADO) return false;
  return new Date(invoice.dt_due) < new Date();
};

// ─── CLIENTE: MIS FACTURAS ────────────────────────────────────────────────────

export const getMyInvoices = (filters?: Omit<InvoiceFilters, "id_client">) => {
  const params = new URLSearchParams();
  if (filters?.id_status) params.set("id_status", String(filters.id_status));
  if (filters?.dt_start) params.set("dt_start", filters.dt_start);
  if (filters?.dt_end) params.set("dt_end", filters.dt_end);
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.b_overdue) params.set("b_overdue", "true");
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<InvoiceListResponse>>(`/finances/client-charges/invoices/all${qs ? `?${qs}` : ""}`);
};

export const getMyInvoiceDetail = (id_invoice: number) =>
  api.get<ApiResponse<ClientInvoiceDetail>>(`/finances/client-charges/invoices/${id_invoice}`);

export interface PendingOrderItem {
  id_order: number;
  f_amount: number;
  task_count: number;
  order: Record<string, any> | null;
}

export const getPendingOrders = () =>
  api.get<ApiResponse<PendingOrderItem[]>>(`/finances/client-charges/pending-orders`);

// El endpoint es PATCH con multipart/form-data; api.upload solo hace POST,
// así que aquí hacemos el fetch directo para poder usar PATCH.
export const submitInvoicePayment = async (id_invoice: number, payload: SubmitInvoicePaymentPayload) => {
  const fd = new FormData();
  fd.append("dt_payment", payload.dt_payment);
  fd.append("vc_payment_method", payload.vc_payment_method);
  fd.append("evidence", payload.evidence);

  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_URL}/finances/client-charges/invoices/${id_invoice}/payment`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Error ${response.status}`);
  }
  return response.json() as Promise<ApiResponse<ClientInvoice>>;
};

// ─── MASTER: TODAS LAS FACTURAS / CORTES ──────────────────────────────────────

export const getAllInvoices = (filters?: InvoiceFilters) => {
  const params = new URLSearchParams();
  if (filters?.id_client) params.set("id_client", String(filters.id_client));
  if (filters?.id_status) params.set("id_status", String(filters.id_status));
  if (filters?.dt_start) params.set("dt_start", filters.dt_start);
  if (filters?.dt_end) params.set("dt_end", filters.dt_end);
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.b_overdue) params.set("b_overdue", "true");
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<InvoiceListResponse>>(`/finances/client-charges/invoices/all${qs ? `?${qs}` : ""}`);
};

export const getInvoiceById = (id_invoice: number) =>
  api.get<ApiResponse<ClientInvoiceDetail>>(`/finances/client-charges/invoices/${id_invoice}`);

export const updateInvoiceStatus = (id_invoice: number, payload: UpdateInvoiceStatusPayload) =>
  api.patch<ApiResponse<ClientInvoice>>(`/finances/client-charges/invoices/${id_invoice}/status`, payload);

export const updateInvoiceDueDate = (id_invoice: number, dt_due: string) =>
  api.patch<ApiResponse<ClientInvoice>>(`/finances/client-charges/invoices/${id_invoice}/due-date`, { dt_due });

export interface GenerateChargesPayload {
  dt_start: string;
  dt_end: string;
  dt_due: string;
  id_client?: number;
}

export const previewCharges = (payload: GenerateChargesPayload) =>
  api.post<ApiResponse<{ clients: Array<{ id_client: number; f_total: number; orders: Array<{ id_order: number; f_amount: number }> }> }>>(
    `/finances/client-charges/preview`,
    payload
  );

export const generateCharges = (payload: GenerateChargesPayload) =>
  api.post<ApiResponse<unknown>>(`/finances/client-charges`, payload);

export interface ClientCharge {
  id_charge: number;
  id_client: number;
  vc_folio: string | null;
  dt_start: string;
  dt_end: string;
  f_total: string;
  id_user_creator: number;
  dt_register: string;
  dt_updated: string;
}

export const getAllCharges = (filters?: { id_client?: number; dt_start?: string; dt_end?: string; vc_folio?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.id_client) params.set("id_client", String(filters.id_client));
  if (filters?.dt_start) params.set("dt_start", filters.dt_start);
  if (filters?.dt_end) params.set("dt_end", filters.dt_end);
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<{ data: ClientCharge[]; meta: InvoiceListMeta }>>(`/finances/client-charges${qs ? `?${qs}` : ""}`);
};

export const getChargeById = (id_charge: number) =>
  api.get<ApiResponse<unknown>>(`/finances/client-charges/${id_charge}`);

// ==================== PAGOS A ACTIVADORES (COMISIÓN POR REFERIDOS) ====================

export const ACTIVATOR_PAYMENT_STATUS = {
  POR_PAGAR: 1,
  PAGADO: 2,
  CANCELADO: 3,
} as const;

export type ActivatorPaymentStatusId = typeof ACTIVATOR_PAYMENT_STATUS[keyof typeof ACTIVATOR_PAYMENT_STATUS];

export const ACTIVATOR_PAYMENT_STATUS_LABEL: Record<ActivatorPaymentStatusId, string> = {
  1: "Por pagar",
  2: "Pagado",
  3: "Cancelado",
};

export interface ActivatorPayment {
  id_payment: number;
  id_activator: number;
  vc_folio: string | null;
  dt_start: string;
  dt_end: string;
  f_total: string;
  id_status: ActivatorPaymentStatusId;
  dt_payment: string | null;
  id_bank_account: number | null;
  vc_notes: string | null;
  id_user_creator: number;
  id_user_payer: number | null;
  dt_register: string;
  dt_updated: string;
}

export interface GenerateActivatorPaymentsPayload {
  dt_start: string;
  dt_end: string;
  id_activator?: number;
}

export const previewActivatorPayments = (payload: GenerateActivatorPaymentsPayload) =>
  api.post<ApiResponse<{ activators: Array<{ id_activator: number; f_total: number; tasks: Array<{ id_task: number; id_promoter: number; f_amount: number }> }> }>>(
    `/finances/activator-payments/preview`,
    payload
  );

export const generateActivatorPayments = (payload: GenerateActivatorPaymentsPayload) =>
  api.post<ApiResponse<unknown>>(`/finances/activator-payments`, payload);

export const getAllActivatorPayments = (filters?: { id_activator?: number; id_status?: ActivatorPaymentStatusId; dt_start?: string; dt_end?: string; vc_folio?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.id_activator) params.set("id_activator", String(filters.id_activator));
  if (filters?.id_status) params.set("id_status", String(filters.id_status));
  if (filters?.dt_start) params.set("dt_start", filters.dt_start);
  if (filters?.dt_end) params.set("dt_end", filters.dt_end);
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<{ data: ActivatorPayment[]; meta: InvoiceListMeta }>>(`/finances/activator-payments${qs ? `?${qs}` : ""}`);
};

export interface ActivatorPaymentDetail extends ActivatorPayment {
  payment_tasks: Array<{ id: number; id_task: number; id_promoter: number; f_amount: string }>;
  activator: {
    id: number;
    name: string;
    lastname: string | null;
    email: string | null;
    phone: string;
    promoter_bank_accounts: Array<{ id: number; bank_name: string; account_holder_name: string; clabe?: string | null; card_number?: string | null }>;
  };
  logs: Array<{ id_payment_log: number; vc_log: string; dt_register: string }>;
}

export const getActivatorPaymentById = (id_payment: number) =>
  api.get<ApiResponse<ActivatorPaymentDetail>>(`/finances/activator-payments/${id_payment}`);

export interface SubmitActivatorPaymentPayload {
  dt_payment: string;
  id_bank_account?: number;
  vc_notes?: string;
}

export const submitActivatorPayment = (id_payment: number, payload: SubmitActivatorPaymentPayload) =>
  api.patch<ApiResponse<ActivatorPayment>>(`/finances/activator-payments/${id_payment}/payment`, payload);

export const cancelActivatorPayment = (id_payment: number) =>
  api.patch<ApiResponse<ActivatorPayment>>(`/finances/activator-payments/${id_payment}/status`, { action: "cancel" });

// ==================== PAGOS A PROMOTORES ====================

export const PROMOTER_PAYMENT_STATUS = {
  POR_PAGAR: 1,
  PAGADO: 2,
  CANCELADO: 3,
} as const;

export type PromoterPaymentStatusId = typeof PROMOTER_PAYMENT_STATUS[keyof typeof PROMOTER_PAYMENT_STATUS];

export const PROMOTER_PAYMENT_STATUS_LABEL: Record<PromoterPaymentStatusId, string> = {
  1: "Por pagar",
  2: "Pagado",
  3: "Cancelado",
};

export interface PromoterPayment {
  id_payment: number;
  id_promoter: number;
  promoter_name?: string | null;
  vc_folio: string | null;
  dt_start: string;
  dt_end: string;
  f_total: string;
  id_status: PromoterPaymentStatusId;
  dt_payment: string | null;
  id_bank_account: number | null;
  vc_notes: string | null;
  id_user_creator: number;
  id_user_payer: number | null;
  dt_register: string;
  dt_updated: string;
  promoter?: {
    id: number;
    name: string;
    lastname: string | null;
    phone: string;
  } | null;
}

export interface GeneratePromoterPaymentsPayload {
  dt_start: string;
  dt_end: string;
  id_promoter?: number;
}

export const previewPromoterPayments = (payload: GeneratePromoterPaymentsPayload) =>
  api.post<ApiResponse<{ promoters: Array<{ id_promoter: number; f_total: number; tasks: Array<{ id_task: number; f_amount: number }> }> }>>(
    `/finances/promoter-payments/preview`,
    payload
  );

export interface PendingPromoterPayments {
  total: number;
  promoters: Array<{ id_promoter: number; name: string; phone: string | null; tasks: number; f_total: number; has_account: boolean }>;
}

// Lo que se le debe hoy a cada promotor y todavia no entra en ningun corte.
export const getPendingPromoterPayments = () =>
  api.get<ApiResponse<PendingPromoterPayments>>(`/finances/promoter-payments/pending`);

export const generatePromoterPayments = (payload: GeneratePromoterPaymentsPayload) =>
  api.post<ApiResponse<unknown>>(`/finances/promoter-payments`, payload);

export const getAllPromoterPayments = (filters?: { id_promoter?: number; id_status?: PromoterPaymentStatusId; dt_start?: string; dt_end?: string; vc_folio?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.id_promoter) params.set("id_promoter", String(filters.id_promoter));
  if (filters?.id_status) params.set("id_status", String(filters.id_status));
  if (filters?.dt_start) params.set("dt_start", filters.dt_start);
  if (filters?.dt_end) params.set("dt_end", filters.dt_end);
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<{ data: PromoterPayment[]; meta: InvoiceListMeta }>>(`/finances/promoter-payments${qs ? `?${qs}` : ""}`);
};

export interface PromoterPaymentDetail extends PromoterPayment {
  payment_tasks: Array<{ id: number; id_task: number; f_amount: string }>;
  promoter: {
    id: number;
    name: string;
    lastname: string | null;
    email: string | null;
    phone: string;
    promoter_bank_accounts: Array<{ id: number; bank_name: string; account_holder_name: string; clabe?: string | null; card_number?: string | null }>;
  };
  evidences: Array<{ id: number; vc_url: string; vc_mime?: string | null }>;
  logs: Array<{ id_payment_log: number; vc_log: string; dt_register: string }>;
}

export const getPromoterPaymentById = (id_payment: number) =>
  api.get<ApiResponse<PromoterPaymentDetail>>(`/finances/promoter-payments/${id_payment}`);

export interface RevealedBankAccount {
  id: number;
  id_promoter: number;
  clabe: string | null;
  card_number: string | null;
}

// Descifra el numero completo de una cuenta bancaria, exclusivamente para
// hacer la transferencia manual. Restringido a Admin/Finanzas en el backend,
// y cada consulta queda registrada en bitacora (quien, que cuenta, cuando).
export const revealBankAccount = (id_account: number) =>
  api.get<ApiResponse<RevealedBankAccount>>(`/finances/promoter-payments/bank-accounts/${id_account}/reveal`);

export interface SubmitPromoterPaymentPayload {
  dt_payment: string;
  id_bank_account: number;
  vc_notes?: string;
  evidence: File;
}

// El endpoint es PATCH con multipart/form-data (incluye evidencia obligatoria);
// api.upload solo hace POST, así que aquí hacemos el fetch directo para poder usar PATCH.
export const submitPromoterPayment = async (id_payment: number, payload: SubmitPromoterPaymentPayload) => {
  const fd = new FormData();
  fd.append("dt_payment", payload.dt_payment);
  fd.append("id_bank_account", String(payload.id_bank_account));
  if (payload.vc_notes) fd.append("vc_notes", payload.vc_notes);
  fd.append("evidence", payload.evidence);
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_URL}/finances/promoter-payments/${id_payment}/payment`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Error ${response.status}`);
  }
  return response.json() as Promise<ApiResponse<PromoterPayment>>;
};

export const cancelPromoterPayment = (id_payment: number) =>
  api.patch<ApiResponse<PromoterPayment>>(`/finances/promoter-payments/${id_payment}/status`, { action: "cancel" });

// Conserva acceso al store por si se requiere el id del usuario en componentes.
export const getCurrentUser = () => useAuthStore.getState().user;
