import { api, ApiResponse } from '@/lib'

export interface DriverDTO {
    id_driver: number
    name: string
    phone: string
    email: string | null
    vc_photo: string | null
    i_status: number // 1 = activo, 2 = suspendido
    dt_location_updated: string | null
    dt_register: string
    i_active_routes_today?: number
}

export const getDrivers = () =>
    api.get<ApiResponse<DriverDTO[]>>('/drivers')

export const getDriversByClient = (id_client: number) =>
    api.get<ApiResponse<DriverDTO[]>>(`/drivers/by-client/${id_client}`)

export const createDriver = (data: { name: string; phone: string; email?: string; password: string }) =>
    api.post<ApiResponse<DriverDTO>>('/drivers', data)

export const updateDriver = (id_driver: number, data: { name?: string; phone?: string; email?: string }) =>
    api.put<ApiResponse<DriverDTO>>(`/drivers/${id_driver}`, data)

export const deactivateDriver = (id_driver: number) =>
    api.delete<ApiResponse<null>>(`/drivers/${id_driver}`)

export const suspendDriver = (id_driver: number) =>
    api.patch<ApiResponse<DriverDTO>>(`/drivers/${id_driver}/suspend`, {})

export const reactivateDriver = (id_driver: number) =>
    api.patch<ApiResponse<DriverDTO>>(`/drivers/${id_driver}/reactivate`, {})

export const notifyDriver = (id_driver: number, body: string) =>
    api.post<ApiResponse<{ devices: number; sent: number } | null>>(`/drivers/${id_driver}/notify`, { title: 'Mensaje de Promotoría', body })

export interface DriverSalesDTO {
    total_charged: number
    total_pieces: number
    total_visits: number
    visits: {
        id_stop: number
        dt_visited: string | null
        f_total_charged: number | null
        store: { id_store: number; name: string }
        items: { i_quantity: number; product: { name: string } }[]
        route: { route_date: string }
    }[]
}

export const getDriverSales = (id_driver: number, date_from: string, date_to: string) =>
    api.get<ApiResponse<DriverSalesDTO>>(`/delivery-routes/drivers/${id_driver}/sales?date_from=${date_from}&date_to=${date_to}`)

export interface DriverRouteHistoryDTO {
    id_route: number
    route_date: string
    stops: {
        id_stop: number
        i_status: number
        store: { id_store: number; name: string }
        items: { i_quantity: number; product: { name: string } }[]
    }[]
}

export const getDriverRoutesInRange = (id_driver: number, date_from: string, date_to: string) =>
    api.get<ApiResponse<DriverRouteHistoryDTO[]>>(`/delivery-routes/drivers/${id_driver}/routes?date_from=${date_from}&date_to=${date_to}`)
