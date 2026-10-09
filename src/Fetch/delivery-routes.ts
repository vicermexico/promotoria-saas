import { api, ApiResponse } from '@/lib'

export interface PendingPreorderDTO {
    id_preorder: number
    id_task: number
    preferred_date: string
    preferred_time: 'MAÑANA' | 'TARDE'
    items: { id_item: number; i_quantity: number; product: { id_product: number; name: string } }[]
    task: {
        id_task: number
        vc_folio: string | null
        store: {
            id_store: number
            name: string
            address: { latitude: number | null; longitude: number | null; street: string } | null
        }
    }
}

export interface RouteStopDTO {
    id_stop: number
    id_store: number
    id_preorder: number
    turno: 'MAÑANA' | 'TARDE'
    i_order: number
    i_status: number
    b_delivered: boolean | null
    vc_no_delivery_reason: string | null
    payment_method: string | null
    f_amount_paid: number | null
    dt_visited: string | null
    store: { id_store: number; name: string }
    preorder: { items: { i_quantity: number; product: { name: string } }[] }
}

export interface RouteDTO {
    id_route: number
    id_driver: number
    route_date: string
    manana_inicio: string | null
    manana_fin: string | null
    tarde_inicio: string | null
    tarde_fin: string | null
    is_active: boolean
    is_finished: boolean
    dt_register: string
    id_schedule?: number | null
    schedule?: { id_schedule: number; day_of_week: number; interval_weeks: number } | null
    id_route_template?: number | null
    route_template?: { id_route_template: number; name: string } | null
    driver: { id_driver: number; name: string; phone: string }
    stops: RouteStopDTO[]
}

export const getPendingPreorders = (filters?: { date?: string; time?: 'MAÑANA' | 'TARDE' }) => {
    const params = new URLSearchParams()
    if (filters?.date) params.set('date', filters.date)
    if (filters?.time) params.set('time', filters.time)
    const qs = params.toString()
    return api.get<ApiResponse<PendingPreorderDTO[]>>(`/delivery-routes/pending-preorders${qs ? `?${qs}` : ''}`)
}

export const createRoute = (data: {
    id_driver: number
    route_date: string
    id_schedule?: number
    id_route_template?: number
    manana_inicio?: string | null
    manana_fin?: string | null
    tarde_inicio?: string | null
    tarde_fin?: string | null
    stops: { id_store: number; id_preorder?: number; turno?: 'MAÑANA' | 'TARDE' }[]
}) =>
    api.post<ApiResponse<RouteDTO>>('/delivery-routes', data)

export const updateRoute = (id_route: number, data: {
    id_driver: number
    route_date: string
    manana_inicio?: string | null
    manana_fin?: string | null
    tarde_inicio?: string | null
    tarde_fin?: string | null
    stops: { id_store: number; id_preorder?: number; turno?: 'MAÑANA' | 'TARDE' }[]
}) =>
    api.put<ApiResponse<RouteDTO>>(`/delivery-routes/${id_route}`, data)

export const deleteRoute = (id_route: number) =>
    api.delete<ApiResponse<null>>(`/delivery-routes/${id_route}`)

export const getRoutesByClient = () =>
    api.get<ApiResponse<RouteDTO[]>>('/delivery-routes')

export const setRouteActive = (id_route: number, is_active: boolean) =>
    api.patch<ApiResponse<RouteDTO>>(`/delivery-routes/${id_route}/active`, { is_active })

export const getRoutes = () =>
    api.get<ApiResponse<RouteDTO[]>>('/delivery-routes')

export interface StoreDeliveryHistoryDTO {
    total_charged: number
    totals_by_product: { name: string; quantity: number }[]
    visits: {
        id_stop: number
        dt_visited: string | null
        b_delivered: boolean | null
        b_consigna: boolean
        f_amount_cash: number | null
        f_amount_transfer: number | null
        f_total_charged: number | null
        items: { id_item: number; i_quantity: number; product: { name: string } }[]
        route: { driver: { name: string } }
    }[]
}

export const getStoreDeliveryHistory = (id_store: number) =>
    api.get<ApiResponse<StoreDeliveryHistoryDTO>>(`/delivery-routes/stores/${id_store}/history`)
