export type PoiCategory = "tourism" | "food";

export interface POI {
  id: number;

  name: {
    vi: string;
    en: string;
    zh: string;
  };

  description: {
    vi: string;
    en: string;
    zh: string;
  };

  city: string;

  category: PoiCategory;

  latitude: number;

  longitude: number;

  radius: number;

  image: string;

  audio: {
    vi: string;
    en: string;
    zh: string;
  };
}