import { api, ApiResponse } from "@/lib";

export interface IntroVideoClip {
  id_clip: number;
  vc_checkpoint_key: string;
  vc_url: string;
  i_order: number;
  dt_register: string;
}

export interface IntroVideoCheckpointState {
  key: string;
  label: string;
  clips: IntroVideoClip[];
  processed_url: string | null;
  needs_reprocessing: boolean;
}

export const getIntroVideos = () =>
  api.get<ApiResponse<IntroVideoCheckpointState[]>>(`/intro-videos`);

export const addIntroVideoClip = (checkpointKey: string, file: File) => {
  const fd = new FormData();
  fd.append("video", file);
  return api.upload<ApiResponse<IntroVideoClip>>(`/intro-videos/${checkpointKey}/clips`, fd);
};

export const deleteIntroVideoClip = (id_clip: number) =>
  api.delete<ApiResponse<{ deleted: boolean }>>(`/intro-videos/clips/${id_clip}`);

export const reorderIntroVideoClips = (checkpointKey: string, ids: number[]) =>
  api.put<ApiResponse<{ reordered: boolean }>>(`/intro-videos/${checkpointKey}/order`, { ids });

export const processIntroVideoCheckpoint = (checkpointKey: string) =>
  api.post<ApiResponse<{ url: string }>>(`/intro-videos/${checkpointKey}/process`, {});
