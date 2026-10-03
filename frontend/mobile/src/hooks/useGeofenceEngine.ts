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
  onCheckin?: (poiId: number) => void;
}

const REENTRY_COOLDOWN = 30 * 1000;

export function useGeofenceEngine({
  location,
  onCheckin,
}: GeofenceOptions) {
  const pois = usePoiStore(
    (state) => state.pois
  );

  const user = useAppStore(
    (state) => state.user
  );

  const insidePois = useRef<Set<number>>(
    new Set()
  );

  const processingPois = useRef<
    Set<number>
  >(new Set());

  const lastTriggeredAt = useRef<
    Map<number, number>
  >(new Map());

  const onCheckinRef = useRef(onCheckin);

  useEffect(() => {
    onCheckinRef.current = onCheckin;
  }, [onCheckin]);

  useEffect(() => {
    if (!location || !user?.id) {
      return;
    }

    const currentLocation = location;
    const userId = user.id;

    async function checkGeofences() {
      for (const poi of pois) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          poi.latitude,
          poi.longitude
        );

        const isInside =
          distance <= poi.radius;

        const wasInside =
          insidePois.current.has(poi.id);

        /*
         * USER VỪA ĐI VÀO POI
         */
        if (isInside && !wasInside) {
          insidePois.current.add(poi.id);

          const now = Date.now();

          const lastTriggered =
            lastTriggeredAt.current.get(
              poi.id
            ) ?? 0;

          /*
           * Chống trigger liên tục.
           */
          if (
            now - lastTriggered <
            REENTRY_COOLDOWN
          ) {
            continue;
          }

          /*
           * Nếu POI đang được xử lý
           * thì không tạo request mới.
           */
          if (
            processingPois.current.has(
              poi.id
            )
          ) {
            continue;
          }

          processingPois.current.add(
            poi.id
          );

          lastTriggeredAt.current.set(
            poi.id,
            now
          );

          try {
            /*
             * Kiểm tra local/backend history
             * trước khi tạo check-in.
             */
            const alreadyCheckedIn =
              await hasCheckedInToday(
                userId,
                poi.id
              );

            if (alreadyCheckedIn) {
              console.log(
                `Đã check-in hôm nay: ${poi.id}`
              );

              continue;
            }

            /*
             * Backend tự xác định user
             * thông qua JWT.
             */
            const record = {
              id: `${userId}-${poi.id}-${Date.now()}`,
              userId,
              poiId: poi.id,
              checkedInAt:
                new Date().toISOString(),
              latitude:
                currentLocation.latitude,
              longitude:
                currentLocation.longitude,
            };

            await saveCheckin(record);

            console.log(
              "CHECK-IN BACKEND:",
              {
                poiId: poi.id,
                latitude:
                  currentLocation.latitude,
                longitude:
                  currentLocation.longitude,
              }
            );

            /*
             * Báo cho màn hình hiện tại.
             */
            onCheckinRef.current?.(
              poi.id
            );
          } catch (error) {
            /*
             * Cho phép thử lại nếu request
             * backend thất bại.
             */
            lastTriggeredAt.current.delete(
              poi.id
            );

            console.error(
              "Check-in failed:",
              error
            );
          } finally {
            processingPois.current.delete(
              poi.id
            );
          }
        }

        /*
         * USER ĐI RA KHỎI POI
         */
        if (!isInside && wasInside) {
          insidePois.current.delete(
            poi.id
          );
        }
      }
    }

    void checkGeofences();
  }, [
    location,
    user?.id,
    pois,
  ]);
}