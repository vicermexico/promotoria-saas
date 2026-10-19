import { api, ApiResponse } from "@/lib";

export interface AppConfigVideo {
  url: string | null;
}

export const getLoginVideo = () =>
  api.get<ApiResponse<AppConfigVideo>>(`/app-config/login-video`);

export const uploadLoginVideo = (file: File) => {
  const fd = new FormData();
  fd.append("video", file);
  return api.upload<ApiResponse<AppConfigVideo>>(`/app-config/login-video`, fd);
};

export const removeLoginVideo = () =>
  api.delete<ApiResponse<AppConfigVideo>>(`/app-config/login-video`);

export interface TaskInstructionsSetting {
  key: string;
  value: string;
}

export const getTaskInstructions = () =>
  api.get<ApiResponse<TaskInstructionsSetting>>(`/app-config/task-instructions`);

export const setTaskInstructions = (value: string) =>
  api.put<ApiResponse<TaskInstructionsSetting>>(`/app-config/task-instructions`, { value });

export const getWhatsappSoporteClientes = () =>
  api.get<ApiResponse<TaskInstructionsSetting>>(`/app-config/whatsapp-soporte-clientes`);

export const setWhatsappSoporteClientes = (value: string) =>
  api.put<ApiResponse<TaskInstructionsSetting>>(`/app-config/whatsapp-soporte-clientes`, { value });

export const getWhatsappSoportePromotores = () =>
  api.get<ApiResponse<TaskInstructionsSetting>>(`/app-config/whatsapp-soporte-promotores`);

export const setWhatsappSoportePromotores = (value: string) =>
  api.put<ApiResponse<TaskInstructionsSetting>>(`/app-config/whatsapp-soporte-promotores`, { value });

export const getReferralShareMessage = () =>
  api.get<ApiResponse<TaskInstructionsSetting>>(`/app-config/referral-share-message`);

export const setReferralShareMessage = (value: string) =>
  api.put<ApiResponse<TaskInstructionsSetting>>(`/app-config/referral-share-message`, { value });

export interface RequestPricingSettings {
  price_per_product: number;
  min_products: number;
  max_products: number;
}

export const getRequestPricingSettings = () =>
  api.get<ApiResponse<RequestPricingSettings>>(`/app-config/request-pricing`);

export const setRequestPricingSettings = (data: RequestPricingSettings) =>
  api.put<ApiResponse<{ total: number; updated: number }>>(`/app-config/request-pricing`, data);


export interface PaymentAccount {
  bank: string;
  holder: string;
  clabe: string;
  account: string;
  instructions: string;
}

export interface ClientPaymentAccount {
  account: PaymentAccount;
  is_custom: boolean;
}

export const getDefaultPaymentAccount = () =>
  api.get<ApiResponse<PaymentAccount>>(`/app-config/payment-account`);

export const setDefaultPaymentAccount = (account: PaymentAccount) =>
  api.put<ApiResponse<PaymentAccount>>(`/app-config/payment-account`, account);

export const getClientPaymentAccount = (id_client: number) =>
  api.get<ApiResponse<ClientPaymentAccount>>(`/app-config/client-payment-account/${id_client}`);

export const setClientPaymentAccount = (id_client: number, account: PaymentAccount) =>
  api.put<ApiResponse<ClientPaymentAccount>>(`/app-config/client-payment-account/${id_client}`, account);

export const resetClientPaymentAccount = (id_client: number) =>
  api.delete<ApiResponse<ClientPaymentAccount>>(`/app-config/client-payment-account/${id_client}`);
