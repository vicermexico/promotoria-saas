import { api, ApiResponse } from "@/lib";

export interface RouteTemplateStoreDTO {
  id_route_template_store: number;
  id_route_template: number;
  id_store: number;
  turno: 'MAÑANA' | 'TARDE';
}

export interface RouteTemplateDTO {
  id_route_template: number;
  id_client: number;
  name: string;
  dt_register: string;
  dt_updated: string;
  stores: RouteTemplateStoreDTO[];
}

export interface RouteTemplateInput {
  id_client: number;
  name: string;
  stores: { id_store: number; turno: 'MAÑANA' | 'TARDE' }[];
}

export const getRouteTemplates = (id_client: number) =>
  api.get<ApiResponse<RouteTemplateDTO[]>>(`/route-templates?id_client=${id_client}`);

export const getRouteTemplateById = (id_route_template: number) =>
  api.get<ApiResponse<RouteTemplateDTO>>(`/route-templates/${id_route_template}`);

export const createRouteTemplate = (data: RouteTemplateInput) =>
  api.post<ApiResponse<RouteTemplateDTO>>(`/route-templates`, data);

export const updateRouteTemplate = (id_route_template: number, data: Omit<RouteTemplateInput, "id_client">) =>
  api.put<ApiResponse<RouteTemplateDTO>>(`/route-templates/${id_route_template}`, data);

export const deleteRouteTemplate = (id_route_template: number) =>
  api.delete<ApiResponse<null>>(`/route-templates/${id_route_template}`);

export interface RouteSalesEstimateStore {
  id_store: number;
  estimated_value: number;
  has_minimums: boolean;
  is_stale: boolean;
  last_update: string | null;
}

export interface RouteSalesEstimateDTO {
  stores: RouteSalesEstimateStore[];
  total: number | null;
  can_estimate: boolean;
  missing_count: number;
}

export const estimateRouteSales = (storeIds: number[]) =>
  api.post<ApiResponse<RouteSalesEstimateDTO>>(`/route-templates/estimate-sales`, { storeIds });
