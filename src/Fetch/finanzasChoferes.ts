import { api, ApiResponse } from "@/lib";
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
  logs: Array<{ id_payment_log: number; vc_log: string; dt_register: string }>;
}

export const getDriverActivatorPaymentById = (id_payment: number) =>
  api.get<ApiResponse<DriverActivatorPaymentDetail>>(`/finances/driver-activator-payments/${id_payment}`);

export const submitDriverActivatorPayment = (id_payment: number, payload: { dt_payment: string; vc_notes?: string }) =>
  api.patch<ApiResponse<DriverActivatorPayment>>(`/finances/driver-activator-payments/${id_payment}/payment`, payload);

export const cancelDriverActivatorPayment = (id_payment: number) =>
  api.patch<ApiResponse<DriverActivatorPayment>>(`/finances/driver-activator-payments/${id_payment}/status`, { action: "cancel" });

// Numero completo de la cuenta del chofer, solo para hacer el deposito. Cada consulta queda en bitacora.
export const revealDriverBankAccount = (id_account: number) =>
  api.get<ApiResponse<{ id: number; id_driver: number; clabe: string | null; card_number: string | null }>>(`/finances/driver-activator-payments/bank-accounts/${id_account}/reveal`);
