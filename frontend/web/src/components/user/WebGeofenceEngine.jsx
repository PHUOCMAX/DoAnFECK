import { useEffect, useRef, useState } from "react";

import { usePoiStore } from "../../stores/PoiProvider";
import {
  createCheckin,
  getMyCheckins,
  getUserToken,
} from "../../services/userService";

import { useLanguage } from "../../i18n";

import {
  enqueuePoiNarration,
  stopNarration,
} from "../../services/narrationService";

const DEFAULT_RADIUS = 100;

/*
 * Theo flow của thầy:
 *
 * GPS
 * ↓
 * checkGeofences
 * ↓
 * pending ENTER
 * ↓
 * debounce 3s
 * ↓
 * confirm ENTER
 */
const ENTER_DEBOUNCE_MS = 3000;

/*
 * GPS throttle thực tế ~5 giây.
 */
const GPS_THROTTLE_MS = 5000;

/*
 * Không đọc lại cùng một POI liên tục.
 */
const NARRATION_COOLDOWN_MS = 5 * 60 * 1000;

function distanceMeters(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371000;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

export default function WebGeofenceEngine() {
  const { language } = useLanguage();

  const { pois } = usePoiStore();

  const [
    geofenceEnabled,
    setGeofenceEnabled,
  ] = useState(Boolean(getUserToken()));

  const poisRef = useRef(pois);

  /*
   * POI đã CONFIRM ENTER.
   */
  const insidePois = useRef(
    new Set()
  );

  /*
   * POI đang chờ debounce.
   *
   * Map:
   * poiId -> {
   *   poi,
   *   latitude,
   *   longitude,
   *   timer
   * }
   */
  const pendingEntries = useRef(
    new Map()
  );

  /*
   * POI đang xử lý check-in.
   */
  const processingPois = useRef(
    new Set()
  );

  /*
   * POI đã check-in.
   *
   * Chỉ dùng cho CHECK-IN,
   * không dùng để chặn narration.
   */
  const checkedInPois = useRef(
    new Set()
  );

  const checkinsLoaded = useRef(
    false
  );

  /*
   * GPS gần nhất.
   */
  const lastPositionRef = useRef(null);

  /*
   * GPS timestamp được xử lý gần nhất.
   */
  const lastGpsProcessedAt = useRef(0);

  /*
   * Thời điểm narration gần nhất của từng POI.
   */
  const lastNarratedAt = useRef(
    new Map()
  );

  /*
   * Đồng bộ POI mới nhất.
   */
  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  /*
   * ==========================================
   * AUTH SESSION
   * ==========================================
   *
   * WebGeofenceEngine đang nằm ngoài Routes,
   * nên phải tự bật/tắt theo session.
   */
  useEffect(() => {
    function syncSession() {
      setGeofenceEnabled(
        Boolean(getUserToken())
      );
    }

    syncSession();

    window.addEventListener(
      "user-session-changed",
      syncSession
    );

    return () => {
      window.removeEventListener(
        "user-session-changed",
        syncSession
      );
    };
  }, []);

  /*
   * ==========================================
   * LOAD CHECK-IN HISTORY
   * ==========================================
   *
   * Check-in chỉ là side-effect.
   * Không dùng lịch sử check-in để chặn narration.
   */
  useEffect(() => {
    if (!geofenceEnabled) {
      return;
    }

    let cancelled = false;

    async function loadCheckins() {
      checkinsLoaded.current = false;

      try {
        const result =
          await getMyCheckins(100);

        if (cancelled) {
          return;
        }

        const checkins =
          result?.checkins || [];

        checkedInPois.current.clear();

        for (const checkin of checkins) {
          const poiId = Number(
            checkin.poi_id
          );

          if (
            Number.isInteger(poiId)
          ) {
            checkedInPois.current.add(
              poiId
            );
          }
        }

        checkinsLoaded.current = true;

        console.log(
          "WEB CHECKED-IN POIS:",
          [...checkedInPois.current]
        );
      } catch (error) {
        /*
         * Narration vẫn hoạt động
         * kể cả khi load lịch sử check-in lỗi.
         */
        checkinsLoaded.current = false;

        console.error(
          "LOAD CHECKINS ERROR:",
          error
        );
      }
    }

    void loadCheckins();

    return () => {
      cancelled = true;
    };
  }, [geofenceEnabled]);

  /*
   * ==========================================
   * CLEANUP PENDING ENTRIES
   * ==========================================
   */
  useEffect(() => {
    if (geofenceEnabled) {
      return;
    }

    for (const pending of pendingEntries.current.values()) {
      clearTimeout(pending.timer);
    }

    pendingEntries.current.clear();
    insidePois.current.clear();
    processingPois.current.clear();

    stopNarration();
  }, [geofenceEnabled]);

  /*
   * ==========================================
   * SELECT BEST POI
   * ==========================================
   *
   * Flow của thầy:
   *
   * _processAudioDecision()
   * ↓
   * priority sort
   * ↓
   * best POI
   *
   * Project hiện tại chưa có priority thực tế
   * trong POI API, nên:
   *
   * 1. priority nếu có
   * 2. distance gần hơn
   */
  function selectBestPoi(
    candidates
  ) {
    if (!candidates.length) {
      return null;
    }

    const sorted = [...candidates].sort(
      (a, b) => {
        const priorityA =
          Number(a.poi.priority) || 0;

        const priorityB =
          Number(b.poi.priority) || 0;

        if (
          priorityA !== priorityB
        ) {
          return priorityB - priorityA;
        }

        return (
          a.distance - b.distance
        );
      }
    );

    return sorted[0] || null;
  }

  /*
   * ==========================================
   * AUDIO DECISION
   * ==========================================
   *
   * Đây là phần tương đương:
   *
   * _processAudioDecision()
   * → queueNarration(bestPOI)
   *
   * Backend không tham gia.
   */
  function processAudioDecision() {
    const currentPois =
      poisRef.current || [];

    if (!currentPois.length) {
      return;
    }

    const candidates = [];

    for (const poi of currentPois) {
      const poiId = Number(poi.id);

      if (
        !insidePois.current.has(
          poiId
        )
      ) {
        continue;
      }

      const latitude =
        Number(poi.latitude);

      const longitude =
        Number(poi.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      const currentPosition =
        lastPositionRef.current;

      if (!currentPosition) {
        continue;
      }

      const distance =
        distanceMeters(
          currentPosition.latitude,
          currentPosition.longitude,
          latitude,
          longitude
        );

      /*
       * Nếu vừa được đọc gần đây
       * thì không đưa vào candidate.
       */
      const lastNarrated =
        lastNarratedAt.current.get(
          poiId
        ) || 0;

      if (
        Date.now() - lastNarrated <
        NARRATION_COOLDOWN_MS
      ) {
        continue;
      }

      candidates.push({
        poi,
        distance,
      });
    }

    const best =
      selectBestPoi(candidates);

    if (!best) {
      return;
    }

    const poiId =
      Number(best.poi.id);

    lastNarratedAt.current.set(
      poiId,
      Date.now()
    );

    console.log(
      "WEB BEST NARRATION POI:",
      {
        poiId,
        distance: Math.round(
          best.distance
        ),
        priority:
          Number(best.poi.priority) || 0,
      }
    );

    /*
     * queueNarration(bestPOI)
     */
    enqueuePoiNarration(
      best.poi,
      language
    );
  }

  /*
   * ==========================================
   * CHECK-IN
   * ==========================================
   *
   * Check-in không còn điều khiển navigation/audio.
   */
  async function handleCheckin(
    poi,
    latitude,
    longitude
  ) {
    const poiId = Number(poi.id);

    /*
     * Chưa load history:
     * bỏ qua check-in lần này,
     * không ảnh hưởng narration.
     */
    if (!checkinsLoaded.current) {
      return;
    }

    /*
     * Đã check-in:
     * không gửi request lại.
     */
    if (
      checkedInPois.current.has(
        poiId
      )
    ) {
      return;
    }

    /*
     * Đang xử lý:
     * không tạo request trùng.
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
      const result =
        await createCheckin({
          poiId,
          latitude,
          longitude,
        });

      console.log(
        "WEB CHECK-IN SUCCESS:",
        result
      );

      checkedInPois.current.add(
        poiId
      );
    } catch (error) {
      console.error(
        "WEB CHECK-IN FAILED:",
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
   * CONFIRM ENTER
   * ==========================================
   *
   * pending ENTER
   * ↓
   * debounce 3s
   * ↓
   * confirm ENTER
   */
  function confirmEnter(
    poiId,
    latitude,
    longitude
  ) {
    const poi =
      poisRef.current.find(
        (item) =>
          Number(item.id) ===
          Number(poiId)
      );

    if (!poi) {
      return;
    }

    const currentPosition =
      lastPositionRef.current;

    if (!currentPosition) {
      return;
    }

    const poiLat =
      Number(poi.latitude);

    const poiLng =
      Number(poi.longitude);

    const radius =
      Number(poi.radius) ||
      DEFAULT_RADIUS;

    const distance =
      distanceMeters(
        currentPosition.latitude,
        currentPosition.longitude,
        poiLat,
        poiLng
      );

    /*
     * Sau 3 giây phải vẫn ở trong vùng.
     *
     * Nếu GPS đã ra ngoài → không ENTER.
     */
    if (distance > radius) {
      console.log(
        "WEB ENTER CANCELLED:",
        poiId,
        "distance:",
        Math.round(distance)
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
      "WEB POI ENTER CONFIRMED:",
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
     * Chạy độc lập.
     */
    void handleCheckin(
      poi,
      currentPosition.latitude,
      currentPosition.longitude
    );

    processAudioDecision();
  }

  /*
   * ==========================================
   * SCHEDULE ENTER
   * ==========================================
   */
  function scheduleEnter(
    poi,
    latitude,
    longitude
  ) {
    const poiId = Number(poi.id);

    /*
     * Đã inside rồi.
     */
    if (
      insidePois.current.has(
        poiId
      )
    ) {
      return;
    }

    /*
     * Đã pending rồi.
     */
    if (
      pendingEntries.current.has(
        poiId
      )
    ) {
      return;
    }

    console.log(
      "WEB PENDING ENTER:",
      poiId
    );

    const timer = window.setTimeout(
      () => {
        pendingEntries.current.delete(
          poiId
        );

        confirmEnter(
          poiId,
          latitude,
          longitude
        );
      },
      ENTER_DEBOUNCE_MS
    );

    pendingEntries.current.set(
      poiId,
      {
        poi,
        latitude,
        longitude,
        timer,
      }
    );
  }

  /*
   * ==========================================
   * CANCEL ENTER
   * ==========================================
   */
  function cancelPendingEnter(
    poiId
  ) {
    const pending =
      pendingEntries.current.get(
        poiId
      );

    if (!pending) {
      return;
    }

    clearTimeout(
      pending.timer
    );

    pendingEntries.current.delete(
      poiId
    );

    console.log(
      "WEB PENDING ENTER CANCELLED:",
      poiId
    );
  }

  /*
   * ==========================================
   * GPS
   * ==========================================
   */
  useEffect(() => {
    if (!geofenceEnabled) {
      return;
    }

    if (!navigator.geolocation) {
      console.error(
        "Browser không hỗ trợ GPS."
      );

      return;
    }

    function handlePosition(
      position
    ) {
      const now = Date.now();

      /*
       * GPS throttle ~5s
       */
      if (
        now -
          lastGpsProcessedAt.current <
        GPS_THROTTLE_MS
      ) {
        return;
      }

      lastGpsProcessedAt.current =
        now;

      const {
        latitude,
        longitude,
      } = position.coords;

      lastPositionRef.current = {
        latitude,
        longitude,
      };

      console.log(
        "WEB GPS:",
        latitude,
        longitude
      );

      const currentPois =
        poisRef.current || [];

      if (!currentPois.length) {
        return;
      }

      /*
       * ====================================
       * GEOFENCE CHECK
       * ====================================
       */
      for (const poi of currentPois) {
        const poiId = Number(poi.id);

        const poiLat =
          Number(poi.latitude);

        const poiLng =
          Number(poi.longitude);

        if (
          !Number.isFinite(poiLat) ||
          !Number.isFinite(poiLng)
        ) {
          continue;
        }

        const radius =
          Number(poi.radius) ||
          DEFAULT_RADIUS;

        const distance =
          distanceMeters(
            latitude,
            longitude,
            poiLat,
            poiLng
          );

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

        console.log(
          "WEB GEOFENCE:",
          {
            poiId,
            distance:
              Math.round(distance),
            radius,
            isInside,
            wasInside,
            isPending,
          }
        );

        /*
         * =============================
         * VỪA VÀO
         * =============================
         */
        if (
          isInside &&
          !wasInside &&
          !isPending
        ) {
          scheduleEnter(
            poi,
            latitude,
            longitude
          );
        }

        /*
         * =============================
         * ĐANG PENDING
         * NHƯNG ĐI RA
         * =============================
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
         * =============================
         * ĐI RA SAU KHI ENTER
         * =============================
         */
        if (
          !isInside &&
          wasInside
        ) {
          insidePois.current.delete(
            poiId
          );

          console.log(
            "WEB POI EXIT:",
            poiId
          );
        }
      }
    }

    function handleError(
      error
    ) {
      console.error(
        "WEB GPS ERROR:",
        error
      );
    }

    const watchId =
      navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );

    console.log(
      "WEB GEOFENCE STARTED"
    );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );

      for (const pending of pendingEntries.current.values()) {
        clearTimeout(
          pending.timer
        );
      }

      pendingEntries.current.clear();

      insidePois.current.clear();

      processingPois.current.clear();

      lastPositionRef.current = null;

      lastGpsProcessedAt.current = 0;

      stopNarration();

      console.log(
        "WEB GEOFENCE STOPPED"
      );
    };
  }, [geofenceEnabled]);

  return null;
}