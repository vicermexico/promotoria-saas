import { api, ApiResponse } from "@/lib";

export type CommissionType = "PERCENTAGE" | "FIXED";

export interface FinanceSettings {
  f_promoter_commission_percentage: number;
  f_activator_commission_percentage: number;
  vc_promoter_commission_type?: CommissionType;
  vc_activator_commission_type?: CommissionType;
}

export const getFinanceSettings = () =>
  api.get<ApiResponse<FinanceSettings>>(`/finances/settings`);

export const updateFinanceSettings = (data: Partial<FinanceSettings>) =>
  api.patch<ApiResponse<FinanceSettings>>(`/finances/settings`, data);
