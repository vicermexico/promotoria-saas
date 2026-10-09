import { api, ApiResponse } from "../lib/api";

export interface Usuario {
  id_usuario: number;
  vc_nombre: string;
  vc_username: string;
  vc_password?: string;
  vc_telefono?: string;
  b_activo?: boolean;
  dt_registro?: number;
  dt_actualizacion?: number;
  id_negocio: number;
  i_rol?: number;
}

export interface ClientUser {
  id_user: number;
  email: string;
  i_rol: number;
  i_status: number;
  dt_register: string;
  dt_updated: string;
  name: string;
  lastname: string;
  id_client: number;
  id_user_creator: number;
}

// POST: registrar usuario en cliente
export const registerUserInClient = async (payload: {
  name: string;
  lastname: string;
  email: string;
  password: string;
  i_rol: number;
  id_user_creator: number;
  id_client: number;
}): Promise<ApiResponse<ClientUser>> => {
  return api.post<ApiResponse<ClientUser>>("/users/", payload);
};

// POST: crear usuario del panel del cliente (celular + contraseña)
export const createClientUser = async (payload: {
  name: string;
  lastname: string;
  phone: string;
  password: string;
}): Promise<ApiResponse<ClientUser>> => {
  return api.post<ApiResponse<ClientUser>>("/users/client-user", payload);
};

// GET: obtener usuarios por negocio
export const getUsersByBusiness = async (id_negocio: number): Promise<ApiResponse<Usuario[]>> => {
  return api.post<ApiResponse<Usuario[]>>("/admin/get-users-by-business", { id_negocio });
};

// GET: obtener usuarios por cliente (SuperAdmin)
export const getUsersByIdClient = async (id_client: number): Promise<ApiResponse<ClientUser[]>> => {
  return api.get<ApiResponse<ClientUser[]>>(`/users/${id_client}`);
};

// ---- Gestión de usuarios del panel del cliente (Mi Negocio) ----
export interface ClientUserRow {
  id_user: number;
  email: string; // celular
  name: string;
  lastname: string;
  i_status: number; // 1 activo, 0 suspendido
  dt_register: string;
  is_me: boolean;
}

export const listClientUsers = async (): Promise<ApiResponse<ClientUserRow[]>> => {
  return api.get<ApiResponse<ClientUserRow[]>>("/users/client-user/list");
};

export const updateClientUser = async (
  id_user: number,
  payload: { name: string; lastname: string; phone: string; password?: string },
): Promise<ApiResponse<ClientUserRow>> => {
  return api.put<ApiResponse<ClientUserRow>>(`/users/client-user/${id_user}`, payload);
};

export const setClientUserStatus = async (
  id_user: number,
  i_status: 0 | 1,
): Promise<ApiResponse<ClientUserRow>> => {
  return api.patch<ApiResponse<ClientUserRow>>(`/users/client-user/${id_user}/status`, { i_status });
};

export const deleteClientUser = async (id_user: number): Promise<ApiResponse<null>> => {
  return api.delete<ApiResponse<null>>(`/users/client-user/${id_user}`);
};
