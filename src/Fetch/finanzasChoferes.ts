import { api, ApiResponse } from "@/lib";
import { useAuthStore } from "@/stores";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
import type { InvoiceListMeta, ActivatorPaymentStatusId } from "./finanzas";

export interface DriverActivatorPayment {
  id_payment: number;
  id_driver: number;
  driver_name: string | null;
  vc_folio: string | null;
  dt_start: string;
  dt_end: string;
  f_total: string;
  id_status: ActivatorPaymentStatusId;
  dt_payment: string | null;
  vc_notes: string | null;
  id_user_creator: number;
  id_user_payer: number | null;
  dt_register: string;
  dt_updated: string;
}

export interface GenerateDriverPaymentsPayload {
  dt_start: string;
  dt_end: string;
  id_driver?: number;
}

export const previewDriverActivatorPayments = (payload: GenerateDriverPaymentsPayload) =>
  api.post<ApiResponse<{ drivers: Array<{ id_driver: number; name: string; f_total: number; tasks: Array<{ id_task: number; id_promoter: number; f_amount: number }> }> }>>(
    `/finances/driver-activator-payments/preview`,
    payload
  );

export const generateDriverActivatorPayments = (payload: GenerateDriverPaymentsPayload) =>
  api.post<ApiResponse<unknown>>(`/finances/driver-activator-payments`, payload);

export const getAllDriverActivatorPayments = (filters?: { id_driver?: number; id_status?: ActivatorPaymentStatusId; vc_folio?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.id_driver) params.set("id_driver", String(filters.id_driver));
  if (filters?.id_status) params.set("id_status", String(filters.id_status));
  if (filters?.vc_folio) params.set("vc_folio", filters.vc_folio);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api.get<ApiResponse<{ data: DriverActivatorPayment[]; meta: InvoiceListMeta }>>(`/finances/driver-activator-payments${qs ? `?${qs}` : ""}`);
};

export interface DriverActivatorPaymentDetail extends DriverActivatorPayment {
  payment_tasks: Array<{ id: number; id_task: number; id_promoter: number; promoter_name: string | null; f_amount: string }>;
  driver: { id_driver: number; name: string; phone: string; email: string | null } | null;
  bank_account: { id: number; account_holder_name: string; account_type: "CLABE" | "CARD"; bank_name: string; clabe: string | null; card_number: string | null } | null;
  evidences: Array<{ id_asset: number; vc_url: string; vc_mime: string | null }>;
  logs: Array<{ id_payment_log: number; vc_log: string; dt_register: string }>;
}

export const getDriverActivatorPaymentById = (id_payment: number) =>
  api.get<ApiResponse<DriverActivatorPaymentDetail>>(`/finances/driver-activator-payments/${id_payment}`);

// PATCH con multipart (lleva el comprobante); api.upload solo hace POST, por eso el fetch directo.
export const submitDriverActivatorPayment = async (id_payment: number, payload: { dt_payment: string; vc_notes?: string; evidence: File }) => {
  const fd = new FormData();
  fd.append("dt_payment", payload.dt_payment);
  if (payload.vc_notes) fd.append("vc_notes", payload.vc_notes);
  fd.append("evidence", payload.evidence);
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_URL}/finances/driver-activator-payments/${id_payment}/payment`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Error ${response.status}`);
  }
  return response.json() as Promise<ApiResponse<DriverActivatorPayment>>;
};

export const cancelDriverActivatorPayment = (id_payment: number) =>
  api.patch<ApiResponse<DriverActivatorPayment>>(`/finances/driver-activator-payments/${id_payment}/status`, { action: "cancel" });

// Numero completo de la cuenta del chofer, solo para hacer el deposito. Cada consulta queda en bitacora.
export const revealDriverBankAccount = (id_account: number) =>
  api.get<ApiResponse<{ id: number; id_driver: number; clabe: string | null; card_number: string | null }>>(`/finances/driver-activator-payments/bank-accounts/${id_account}/reveal`);

export interface PendingDriverCommissions {
  total: number;
  drivers: Array<{ id_driver: number; name: string; phone: string | null; tasks: number; f_total: number; has_account: boolean }>;
}

// Lo que se le debe hoy a cada chofer y todavia no entra en ningun corte.
export const getPendingDriverCommissions = () =>
  api.get<ApiResponse<PendingDriverCommissions>>(`/finances/driver-activator-payments/pending`);
