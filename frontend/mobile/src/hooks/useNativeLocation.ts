import {
  useEffect,
  useState,
} from "react";

import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function useNativeLocation(
  enabled = true
) {
  const [location, setLocation] =
    useState<UserLocation | null>(null);

  const [permissionGranted, setPermissionGranted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let subscription:
      | Location.LocationSubscription
      | null = null;

    async function startLocation() {
      try {
        setLoading(true);
        setError(null);

        const {
          status,
        } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setPermissionGranted(false);
          setError(
            "Location permission was denied."
          );
          setLoading(false);
          return;
        }

        setPermissionGranted(true);

        const current =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );

        setLocation({
          latitude:
            current.coords.latitude,
          longitude:
            current.coords.longitude,
          accuracy:
            current.coords.accuracy,
        });

        subscription =
          await Location.watchPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (next) => {
              setLocation({
                latitude:
                  next.coords.latitude,
                longitude:
                  next.coords.longitude,
                accuracy:
                  next.coords.accuracy,
              });
            }
          );
      } catch (err) {
        console.error(err);

        setError(
          "Unable to get your location."
        );
      } finally {
        setLoading(false);
      }
    }

    startLocation();

    return () => {
      subscription?.remove();
    };
  }, [enabled]);

  return {
    location,
    permissionGranted,
    loading,
    error,
  };
}