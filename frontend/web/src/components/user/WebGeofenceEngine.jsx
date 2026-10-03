import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { usePoiStore } from "../../stores/PoiProvider";
import {
  createCheckin,
  getMyCheckins,
} from "../../services/userService";

const DEFAULT_RADIUS = 100;

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
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
  const navigate = useNavigate();
  const location = useLocation();

  const { pois } = usePoiStore();

  const poisRef = useRef(pois);

  const insidePois = useRef(new Set());

  const processingPois = useRef(new Set());

  /*
   * POI đã check-in.
   *
   * Không bao giờ xóa khi ra khỏi vùng.
   */
  const checkedInPois = useRef(new Set());

  const checkinsLoaded = useRef(false);

  /*
   * Route hiện tại.
   */
  const pathnameRef = useRef(
    location.pathname
  );

  useEffect(() => {
    pathnameRef.current =
      location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  /*
   * =====================================
   * LOAD CHECK-IN HISTORY
   * =====================================
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCheckins() {
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
          const poiId =
            Number(checkin.poi_id);

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
          [
            ...checkedInPois.current,
          ]
        );
      } catch (error) {
        console.error(
          "LOAD CHECKINS ERROR:",
          error
        );

        checkinsLoaded.current = false;
      }
    }

    loadCheckins();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =====================================
   * GPS
   * =====================================
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error(
        "Browser không hỗ trợ GPS."
      );

      return;
    }

    async function handlePoiEnter(
      poi,
      latitude,
      longitude
    ) {
      const poiId =
        Number(poi.id);

      /*
       * Đã check-in rồi
       * → tuyệt đối không làm gì.
       */
      if (
        checkedInPois.current.has(
          poiId
        )
      ) {
        return;
      }

      /*
       * Đang xử lý.
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
        console.log(
          "WEB POI ENTER:",
          poiId
        );

        /*
         * CHECK-IN
         */
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

        /*
         * Đánh dấu đã check-in.
         */
        checkedInPois.current.add(
          poiId
        );

        /*
         * =================================
         * QUAN TRỌNG
         * =================================
         *
         * Sau khi check-in thành công:
         * → mở POI ngay.
         */
        navigate(
          `/pois/${poiId}`
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

    function handlePosition(
      position
    ) {
      /*
       * Chưa có lịch sử check-in
       * → chưa chạy Geofence.
       */
      if (
        !checkinsLoaded.current
      ) {
        return;
      }

      const {
        latitude,
        longitude,
      } = position.coords;

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

      for (const poi of currentPois) {
        const poiId =
          Number(poi.id);

        /*
         * =============================
         * ĐÃ CHECK-IN
         * =============================
         *
         * Không check-in.
         * Không navigate.
         * Không đọc.
         */
        if (
          checkedInPois.current.has(
            poiId
          )
        ) {
          continue;
        }

        const poiLat =
          Number(poi.latitude);

        const poiLng =
          Number(poi.longitude);

        if (
          !Number.isFinite(
            poiLat
          ) ||
          !Number.isFinite(
            poiLng
          )
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

        console.log(
          "WEB GEOFENCE:",
          {
            poiId,
            distance:
              Math.round(distance),
            radius,
            isInside,
            wasInside,
          }
        );

        /*
         * =============================
         * VỪA ĐI VÀO
         * =============================
         */
        if (
          isInside &&
          !wasInside
        ) {
          insidePois.current.add(
            poiId
          );

          void handlePoiEnter(
            poi,
            latitude,
            longitude
          );
        }

        /*
         * =============================
         * ĐI RA
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

      insidePois.current.clear();
      processingPois.current.clear();
    };
  }, [navigate]);

  return null;
}