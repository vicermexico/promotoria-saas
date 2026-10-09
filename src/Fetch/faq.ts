import { api, ApiResponse } from "@/lib";

export interface FaqPhrase {
  id_faq_question_phrase: number;
  vc_phrase: string;
}

export interface FaqScreenElement {
  id_faq_screen_element: number;
  vc_element_key: string;
  vc_label: string;
  f_x: number;
  f_y: number;
  f_width: number;
  f_height: number;
  vc_direction: string | null;
  f_rotation_deg: number;
}

export interface FaqScreen {
  id_faq_screen: number;
  vc_screen_key: string;
  vc_title: string;
  vc_screenshot_url: string;
  vc_app_route: string | null;
  elements: FaqScreenElement[];
}

export interface FaqHighlightStep {
  id_faq_highlight_step: number;
  i_order: number;
  element: FaqScreenElement;
}

export interface FaqQuestion {
  id_faq_question: number;
  vc_answer_text: string;
  phrases: FaqPhrase[];
  steps?: FaqHighlightStep[];
  dt_register: string;
  dt_updated: string;
}

export interface CreateFaqQuestionPayload {
  vc_answer_text: string;
  phrases: string[];
}

export interface UpdateFaqQuestionPayload {
  vc_answer_text?: string;
  phrases?: string[];
}

export const getFaqQuestions = () =>
  api.get<ApiResponse<FaqQuestion[]>>(`/faq/questions`);

export const getFaqQuestion = (id_faq_question: number) =>
  api.get<ApiResponse<FaqQuestion>>(`/faq/questions/${id_faq_question}`);

export const createFaqQuestion = (payload: CreateFaqQuestionPayload) =>
  api.post<ApiResponse<FaqQuestion>>(`/faq/questions`, payload);

export const updateFaqQuestion = (id_faq_question: number, payload: UpdateFaqQuestionPayload) =>
  api.put<ApiResponse<FaqQuestion>>(`/faq/questions/${id_faq_question}`, payload);

export const deleteFaqQuestion = (id_faq_question: number) =>
  api.delete<ApiResponse<{ deleted: boolean }>>(`/faq/questions/${id_faq_question}`);

export const getFaqGreeting = () =>
  api.get<ApiResponse<{ vc_value: string }>>(`/faq/greeting`);

export const updateFaqGreeting = (vc_value: string) =>
  api.put<ApiResponse<{ vc_value: string }>>(`/faq/greeting`, { vc_value });

// ---------- Pantallas (capturas) y botones marcados ----------

export const getFaqScreens = () =>
  api.get<ApiResponse<FaqScreen[]>>(`/faq/screens`);

export const createFaqScreen = (vc_title: string, file: File, vc_app_route?: string) => {
  const formData = new FormData();
  formData.append("vc_title", vc_title);
  formData.append("screenshot", file);
  if (vc_app_route) formData.append("vc_app_route", vc_app_route);
  return api.upload<ApiResponse<FaqScreen>>(`/faq/screens`, formData);
};

export const deleteFaqScreen = (id_faq_screen: number) =>
  api.delete<ApiResponse<{ deleted: boolean }>>(`/faq/screens/${id_faq_screen}`);

export interface AddFaqScreenElementPayload {
  vc_label?: string;
  f_x: number;
  f_y: number;
  f_width: number;
  f_height: number;
  vc_direction?: string;
  f_rotation_deg?: number;
}

export const addFaqScreenElement = (id_faq_screen: number, payload: AddFaqScreenElementPayload) =>
  api.post<ApiResponse<FaqScreenElement>>(`/faq/screens/${id_faq_screen}/elements`, payload);

export const deleteFaqScreenElement = (id_faq_screen_element: number) =>
  api.delete<ApiResponse<{ deleted: boolean }>>(`/faq/screens/elements/${id_faq_screen_element}`);

export const setFaqHighlightSteps = (id_faq_question: number, element_ids: number[]) =>
  api.put<ApiResponse<FaqQuestion>>(`/faq/questions/${id_faq_question}/steps`, { element_ids });
