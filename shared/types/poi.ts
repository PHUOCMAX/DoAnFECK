export type LanguageCode = "vi" | "en" | "zh";

export type PoiCategory = "tourism" | "food";
export type PoiStatus = "pending" | "approved" | "rejected";

export interface LocalizedText {
  vi: string;
  en: string;
  zh: string;
}

export interface Poi {
  id: number;

  name: LocalizedText;

  description: LocalizedText;

  city: string;

  category: PoiCategory;

  latitude: number;

  longitude: number;

  radius: number;

  image: string;

  audio: LocalizedText;
  status?: PoiStatus;
}

export interface CreatePoiRequest {
  name: LocalizedText;
  description: LocalizedText;
  city: string;
  category: PoiCategory;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface PoisResponse {
  success: true;
  pois: Poi[];
}

export interface CreatePoiResponse {
  success: true;
  message: string;
  poi: Poi;
}

// Backward-compatible alias for existing consumers.
export type POI = Poi;
