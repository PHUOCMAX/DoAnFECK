import { useEffect, useRef } from "react";

import { calculateDistance } from "../utils/geoHelpers";

import type { UserLocation } from "./useNativeLocation";

import { usePoiStore } from "../store/usePoiStore";
import { useAppStore } from "../store/useAppStore";

import {
  hasCheckedInToday,
  saveCheckin,
} from "../services/checkinService";

interface GeofenceOptions {
  location: UserLocation | null;

  /*
   * Callback duy nhất khi hệ thống xác nhận
   * USER VỪA ENTER POI.
   *
   * HomeScreen sẽ dùng callback này
   * để xử lý narration.
   */
  onPoiEnter?: (poiId: number) => void;
}

/*
 * GPS của mobile đã có:
 *
 * timeInterval: 5000
 *
 * trong useNativeLocation.ts.
 *
 * GeofenceEngine không cần tạo
 * thêm một watcher GPS khác.
 */

/*
 * User phải ở trong geofence liên tục
 * khoảng 3 giây mới xác nhận ENTER.
 */
const ENTER_DEBOUNCE_MS = 3000;

/*
 * Không trigger lại cùng POI quá nhanh.
 */
const REENTRY_COOLDOWN = 30 * 1000;

export function useGeofenceEngine({
  location,
  onPoiEnter,
}: GeofenceOptions) {
  const pois = usePoiStore(
    (state) => state.pois
  );

  const user = useAppStore(
    (state) => state.user
  );

  /*
   * POI đã được xác nhận ENTER.
   */
  const insidePois = useRef<Set<number>>(
    new Set()
  );

  /*
   * POI đang chờ debounce.
   *
   * poiId -> timer
   */
  const pendingEntries = useRef<
    Map<
      number,
      ReturnType<typeof setTimeout>
    >
  >(new Map());

  /*
   * POI đang xử lý check-in.
   */
  const processingPois = useRef<
    Set<number>
  >(new Set());

  /*
   * Thời điểm trigger gần nhất.
   */
  const lastTriggeredAt = useRef<
    Map<number, number>
  >(new Map());

  /*
   * Giữ callback mới nhất.
   */
  const onPoiEnterRef =
    useRef(onPoiEnter);

  useEffect(() => {
    onPoiEnterRef.current =
      onPoiEnter;
  }, [onPoiEnter]);

  /*
   * ==========================================
   * SELECT BEST POI
   * ==========================================
   *
   * Database hiện tại không có priority.
   *
   * Vì vậy khi nhiều POI cùng nằm
   * trong vùng, POI gần nhất được ưu tiên.
   */
  function selectBestPoi(
    candidates: {
      poi: (typeof pois)[number];
      distance: number;
    }[]
  ) {
    if (
      candidates.length === 0
    ) {
      return null;
    }

    const sorted = [
      ...candidates,
    ].sort(
      (a, b) =>
        a.distance - b.distance
    );

    return sorted[0] || null;
  }

  /*
   * ==========================================
   * CHECK-IN
   * ==========================================
   *
   * Check-in là side-effect.
   *
   * Check-in không quyết định narration.
   */
  async function processCheckin(
    poi: (typeof pois)[number],
    currentLocation: UserLocation
  ) {
    if (!user?.id) {
      return;
    }

    const poiId = Number(poi.id);

    /*
     * Tránh request trùng.
     */
    if (
      processingPois.current.has(
        poiId
      )
    ) {
      return;
    }

    processingPois.current.add(
      poiId
    );

    try {
      const alreadyCheckedIn =
        await hasCheckedInToday(
          user.id,
          poiId
        );

      if (alreadyCheckedIn) {
        console.log(
          `Đã check-in hôm nay: ${poiId}`
        );

        return;
      }

      const record = {
        id: `${user.id}-${poiId}-${Date.now()}`,

        userId: user.id,

        poiId,

        checkedInAt:
          new Date().toISOString(),

        latitude:
          currentLocation.latitude,

        longitude:
          currentLocation.longitude,
      };

      await saveCheckin(record);

      console.log(
        "MOBILE CHECK-IN SUCCESS:",
        {
          poiId,

          latitude:
            currentLocation.latitude,

          longitude:
            currentLocation.longitude,
        }
      );
    } catch (error) {
      console.error(
        "MOBILE CHECK-IN FAILED:",
        error
      );
    } finally {
      processingPois.current.delete(
        poiId
      );
    }
  }

  /*
   * ==========================================
   * AUDIO DECISION
   * ==========================================
   *
   * ENTER
   * ↓
   * lấy các POI đang ở trong vùng
   * ↓
   * ưu tiên POI vừa ENTER
   * ↓
   * nếu cần thì chọn POI gần nhất
   * ↓
   * callback onPoiEnter
   *
   * Audio được xử lý bên ngoài hook.
   */
  function processAudioDecision(
    enteredPoiId: number
  ) {
    if (!location) {
      return;
    }

    const candidates =
      pois
        .map((poi) => {
          const distance =
            calculateDistance(
              location.latitude,
              location.longitude,
              Number(poi.latitude),
              Number(poi.longitude)
            );

          return {
            poi,
            distance,
          };
        })
        .filter((item) => {
          const poiId =
            Number(item.poi.id);

          return (
            insidePois.current.has(
              poiId
            ) &&
            Number.isFinite(
              item.distance
            )
          );
        });

    /*
     * Ưu tiên POI vừa ENTER.
     *
     * Nếu không tìm thấy,
     * chọn POI gần nhất trong các POI
     * đang ở bên trong geofence.
     */
    const enteredCandidate =
      candidates.find(
        (item) =>
          Number(item.poi.id) ===
          enteredPoiId
      );

    const best =
      enteredCandidate ||
      selectBestPoi(candidates);

    if (!best) {
      return;
    }

    const bestPoiId =
      Number(best.poi.id);

    console.log(
      "MOBILE BEST NARRATION POI:",
      {
        poiId: bestPoiId,
        distance: Math.round(
          best.distance
        ),
      }
    );

    /*
     * Giao POI đã xác định cho tầng UI.
     *
     * HomeScreen sẽ gọi:
     *
     * playPoiNarration(...)
     */
    onPoiEnterRef.current?.(
      bestPoiId
    );
  }

  /*
   * ==========================================
   * CONFIRM ENTER
   * ==========================================
   *
   * pending ENTER
   * ↓
   * debounce 3s
   * ↓
   * kiểm tra lại khoảng cách
   * ↓
   * confirm ENTER
   */
  function confirmEnter(
    poiId: number
  ) {
    const currentLocation =
      location;

    if (!currentLocation) {
      return;
    }

    const poi =
      pois.find(
        (item) =>
          Number(item.id) ===
          poiId
      );

    if (!poi) {
      return;
    }

    const distance =
      calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        Number(poi.latitude),
        Number(poi.longitude)
      );

    const radius =
      Number(poi.radius) || 100;

    /*
     * GPS đã đi ra ngoài trong lúc
     * chờ debounce.
     */
    if (distance > radius) {
      console.log(
        "MOBILE ENTER CANCELLED:",
        {
          poiId,
          distance: Math.round(
            distance
          ),
        }
      );

      return;
    }

    /*
     * Xác nhận ENTER.
     */
    insidePois.current.add(
      poiId
    );

    console.log(
      "MOBILE POI ENTER CONFIRMED:",
      {
        poiId,
        distance: Math.round(
          distance
        ),
        radius,
      }
    );

    /*
     * 1. Check-in
     *
     * 2. Audio decision
     *
     * Hai việc độc lập.
     */
    void processCheckin(
      poi,
      currentLocation
    );

    processAudioDecision(
      poiId
    );
  }

  /*
   * ==========================================
   * SCHEDULE ENTER
   * ==========================================
   */
  function scheduleEnter(
    poiId: number
  ) {
    /*
     * Đã ENTER rồi.
     */
    if (
      insidePois.current.has(
        poiId
      )
    ) {
      return;
    }

    /*
     * Đang pending rồi.
     */
    if (
      pendingEntries.current.has(
        poiId
      )
    ) {
      return;
    }

    console.log(
      "MOBILE PENDING ENTER:",
      poiId
    );

    const timer =
      setTimeout(() => {
        pendingEntries.current.delete(
          poiId
        );

        confirmEnter(
          poiId
        );
      }, ENTER_DEBOUNCE_MS);

    pendingEntries.current.set(
      poiId,
      timer
    );
  }

  /*
   * ==========================================
   * CANCEL PENDING ENTER
   * ==========================================
   */
  function cancelPendingEnter(
    poiId: number
  ) {
    const timer =
      pendingEntries.current.get(
        poiId
      );

    if (!timer) {
      return;
    }

    clearTimeout(timer);

    pendingEntries.current.delete(
      poiId
    );

    console.log(
      "MOBILE PENDING ENTER CANCELLED:",
      poiId
    );
  }

  /*
   * ==========================================
   * MAIN GEOFENCE
   * ==========================================
   */
  useEffect(() => {
    if (
      !location ||
      !user?.id ||
      !pois.length
    ) {
      return;
    }

    /*
     * Snapshot vị trí hiện tại.
     */
    const currentLocation =
      location;

    for (const poi of pois) {
      const poiId =
        Number(poi.id);

      const poiLatitude =
        Number(poi.latitude);

      const poiLongitude =
        Number(poi.longitude);

      if (
        !Number.isFinite(
          poiLatitude
        ) ||
        !Number.isFinite(
          poiLongitude
        )
      ) {
        continue;
      }

      const distance =
        calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          poiLatitude,
          poiLongitude
        );

      const radius =
        Number(poi.radius) || 100;

      const isInside =
        distance <= radius;

      const wasInside =
        insidePois.current.has(
          poiId
        );

      const isPending =
        pendingEntries.current.has(
          poiId
        );

      /*
       * =====================================
       * ENTER CANDIDATE
       * =====================================
       */
      if (
        isInside &&
        !wasInside &&
        !isPending
      ) {
        const now = Date.now();

        const lastTriggered =
          lastTriggeredAt.current.get(
            poiId
          ) ?? 0;

        /*
         * Re-entry cooldown.
         */
        if (
          now - lastTriggered <
          REENTRY_COOLDOWN
        ) {
          continue;
        }

        lastTriggeredAt.current.set(
          poiId,
          now
        );

        scheduleEnter(
          poiId
        );
      }

      /*
       * =====================================
       * ĐANG PENDING NHƯNG ĐI RA
       * =====================================
       */
      if (
        !isInside &&
        isPending
      ) {
        cancelPendingEnter(
          poiId
        );
      }

      /*
       * =====================================
       * EXIT
       * =====================================
       */
      if (
        !isInside &&
        wasInside
      ) {
        insidePois.current.delete(
          poiId
        );

        console.log(
          "MOBILE POI EXIT:",
          poiId
        );
      }
    }

    /*
     * Mỗi GPS update chạy lại geofence.
     */
  }, [
    location,
    user?.id,
    pois,
  ]);

  /*
   * ==========================================
   * CLEANUP
   * ==========================================
   */
  useEffect(() => {
    return () => {
      for (
        const timer of
        pendingEntries.current.values()
      ) {
        clearTimeout(timer);
      }

      pendingEntries.current.clear();

      insidePois.current.clear();

      processingPois.current.clear();

      lastTriggeredAt.current.clear();

      console.log(
        "MOBILE GEOFENCE CLEANUP"
      );
    };
  }, []);
}