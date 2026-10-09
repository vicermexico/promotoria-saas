import { ProductDTO } from "./products";

export interface RequestDTO {
    id_request: number;
    id_user: number;
    id_client: number;
    vc_name: string;
    vc_folio?: string | null;
    f_value: number;
    url_rack_image?: string;
    id_status: number;
    b_active: boolean;
    b_preorder?: boolean;
    preorder_date_mode?: string;
    dt_register: Date;
    dt_update: Date;
    request_products?: RequestProductDTO[];
}


export interface RequestProductDTO {
    id_request_product: number;
    id_request: number;
    id_product: number;
    dt_register: Date;
    dt_update: Date;
    b_active: boolean;
    product?: ProductDTO;
}

export interface RequestProductQuestionDTO {
    id_request_product_question: number;
    id_request_product: number;
    id_question: number;
    dt_register: Date;
    dt_update: Date;
    b_active: boolean;
}

export interface RequestFiltersDTO {
    id_client?: number;
    id_user?: number;
    id_status?: number;
    b_active?: boolean;
    page?: number;
    limit?: number;
}
