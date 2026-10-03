import { create } from "zustand";

import type { Poi as SharedPoi } from "../../../../shared/types/poi";
import { getPoisFromApi } from "../services/api";

export type Poi = SharedPoi;

interface PoiState {
  pois: Poi[];
  loading: boolean;
  error: string | null;
  loadedForToken: string | null;
  loadPois: (token: string) => Promise<void>;
  resetPois: () => void;
  setPois: (pois: Poi[]) => void;
  getPoiById: (id: number) => Poi | undefined;
}

export const usePoiStore = create<PoiState>((set, get) => ({
  pois: [],
  loading: false,
  error: null,
  loadedForToken: null,

  loadPois: async (token) => {
    if (!token) {
      console.log("POI: không có token, bỏ qua load");
      return;
    }

    if (get().loadedForToken === token) {
      console.log("POI: token này đã load trước đó");
      return;
    }

    if (get().loading) {
      console.log("POI: đang load, bỏ qua request mới");
      return;
    }

    console.log("POI: bắt đầu load");
    console.log("POI: token tồn tại =", !!token);

    set({
      loading: true,
      error: null,
    });

    try {
      console.log("POI: đang gọi GET /api/pois");

      const response = await getPoisFromApi();

      console.log(
        "================ POI API RESPONSE ================"
      );

      console.log(
        "POI: số lượng =",
        response.pois.length
      );

      console.log(
        "POI: toàn bộ response =",
        JSON.stringify(response, null, 2)
      );

      if (response.pois.length > 0) {
        console.log(
          "POI: dữ liệu image =",
          response.pois.map((poi) => ({
            id: poi.id,
            name: poi.name,
            image: poi.image,
            imageType: typeof poi.image,
            status: poi.status,
          }))
        );

        response.pois.forEach((poi) => {
          console.log(
            `POI ${poi.id} IMAGE =`,
            poi.image
          );
        });
      } else {
        console.log(
          "POI: API trả về 0 POI"
        );
      }

      console.log(
        "=================================================="
      );

      set({
        pois: response.pois,
        loading: false,
        error: null,
        loadedForToken: token,
      });

      console.log(
        "POI: đã lưu vào Zustand"
      );
    } catch (error) {
      console.log(
        "POI: LOAD ERROR =",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách địa điểm.";

      set({
        loading: false,
        error: message,
      });

      throw error;
    }
  },

  resetPois: () => {
    console.log(
      "POI: reset store"
    );

    set({
      pois: [],
      loading: false,
      error: null,
      loadedForToken: null,
    });
  },

  setPois: (pois) => {
    console.log(
      "POI: setPois =",
      pois.length
    );

    console.log(
      "POI: images =",
      pois.map((poi) => ({
        id: poi.id,
        image: poi.image,
      }))
    );

    set({
      pois,
    });
  },

  getPoiById: (id) => {
    const poi = get().pois.find(
      (poi) => poi.id === id
    );

    console.log(
      `POI: getPoiById(${id}) =`,
      poi
        ? {
            id: poi.id,
            name: poi.name,
            image: poi.image,
          }
        : "Không tìm thấy"
    );

    return poi;
  },
}));