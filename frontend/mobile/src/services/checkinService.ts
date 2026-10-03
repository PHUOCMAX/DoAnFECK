import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAuthToken } from "./localStorage";

export interface CheckinRecord {
  id: string;
  userId: number;
  poiId: number;
  checkedInAt: string;
  latitude: number;
  longitude: number;
}

interface CreateCheckinResponse {
  success: boolean;
  message?: string;
  checkin?: {
    id: number;
    poi_id: number;
    latitude: number | null;
    longitude: number | null;
    checked_in_at: string;
    name_vi?: string;
    name_en?: string;
    name_zh?: string;
  };
}

interface ListCheckinsResponse {
  success: boolean;
  checkins?: Array<{
    id: number;
    poi_id: number;
    latitude: number | null;
    longitude: number | null;
    checked_in_at: string;
    name_vi?: string;
    name_en?: string;
    name_zh?: string;
    city?: string;
    category?: string;
    image?: string;
  }>;
}

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.1.7:5001"
).replace(/\/+$/, "");

const CHECKIN_KEY = "checkin_history";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function mapBackendCheckin(
  item: NonNullable<ListCheckinsResponse["checkins"]>[number]
): CheckinRecord {
  return {
    id: String(item.id),
    userId: 0,
    poiId: Number(item.poi_id),
    checkedInAt: item.checked_in_at,
    latitude: Number(item.latitude ?? 0),
    longitude: Number(item.longitude ?? 0),
  };
}

export async function getCheckinHistory(
  userId?: number
): Promise<CheckinRecord[]> {
  try {
    /*
     * Ưu tiên lấy dữ liệu thật từ Backend.
     */
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/api/checkins`,
      {
        method: "GET",
        headers,
      }
    );

    const data =
      (await response.json().catch(() => null)) as
        | ListCheckinsResponse
        | null;

    if (response.ok && data?.success) {
      const history = (data.checkins || []).map(
        (item) => {
          const record = mapBackendCheckin(item);

          return {
            ...record,
            userId: userId ?? 0,
          };
        }
      );

      /*
       * Đồng bộ lịch sử backend xuống local.
       */
      await AsyncStorage.setItem(
        CHECKIN_KEY,
        JSON.stringify(history)
      );

      return history;
    }
  } catch (error) {
    console.warn(
      "Cannot load check-in history from backend:",
      error
    );
  }

  /*
   * Nếu backend không truy cập được,
   * dùng dữ liệu local làm fallback.
   */
  try {
    const value =
      await AsyncStorage.getItem(CHECKIN_KEY);

    if (!value) {
      return [];
    }

    const history: CheckinRecord[] =
      JSON.parse(value);

    if (userId === undefined) {
      return history;
    }

    return history.filter(
      (item) => item.userId === userId
    );
  } catch (error) {
    console.error(
      "Failed to load local check-in history:",
      error
    );

    return [];
  }
}

export async function saveCheckin(
  record: CheckinRecord
): Promise<CheckinRecord[]> {
  const headers = await getAuthHeaders();

  /*
   * Gửi check-in thật lên Backend.
   */
  const response = await fetch(
    `${API_URL}/api/checkins`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        poiId: record.poiId,
        latitude: record.latitude,
        longitude: record.longitude,
      }),
    }
  );

  const data =
    (await response.json().catch(() => null)) as
      | CreateCheckinResponse
      | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ||
        "Không thể tạo check-in."
    );
  }

  /*
   * Backend là nguồn dữ liệu chính.
   */
  const backendCheckin = data.checkin;

  const savedRecord: CheckinRecord = {
    id: String(
      backendCheckin?.id ?? record.id
    ),
    userId: record.userId,
    poiId: record.poiId,
    checkedInAt:
      backendCheckin?.checked_in_at ??
      record.checkedInAt,
    latitude:
      backendCheckin?.latitude ??
      record.latitude,
    longitude:
      backendCheckin?.longitude ??
      record.longitude,
  };

  /*
   * Lưu bản copy local để UI có thể
   * sử dụng nhanh.
   */
  const value =
    await AsyncStorage.getItem(CHECKIN_KEY);

  const history: CheckinRecord[] = value
    ? JSON.parse(value)
    : [];

  const filtered = history.filter(
    (item) =>
      !(
        item.poiId === savedRecord.poiId &&
        item.checkedInAt.slice(0, 10) ===
          savedRecord.checkedInAt.slice(0, 10)
      )
  );

  const updated = [
    savedRecord,
    ...filtered,
  ];

  await AsyncStorage.setItem(
    CHECKIN_KEY,
    JSON.stringify(updated)
  );

  return updated;
}

export async function hasCheckedInToday(
  userId: number,
  poiId: number
): Promise<boolean> {
  try {
    const history =
      await getCheckinHistory(userId);

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    return history.some(
      (item) =>
        item.poiId === poiId &&
        item.checkedInAt.slice(0, 10) ===
          today
    );
  } catch (error) {
    console.warn(
      "Failed to check today's check-in:",
      error
    );

    return false;
  }
}