import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
} from "react-native-maps";

import { usePoiStore } from "../../store/usePoiStore";
import { calculateDistance } from "../../utils/geoHelpers";

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface SelectedPoi {
  id: number;
  latitude: number;
  longitude: number;
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
}

interface OfflineMapViewProps {
  location: UserLocation | null;
  selectedPoi?: SelectedPoi;
  onPoiPress?: (poiId: number) => void;
}

export default function OfflineMapView({
  location,
  selectedPoi,
  onPoiPress,
}: OfflineMapViewProps) {
  const mapRef = useRef<MapView | null>(null);

  const pois = usePoiStore((state) => state.pois);

  const defaultRegion = {
    latitude: 10.7769,
    longitude: 106.7009,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // =========================
  // Tạo tuyến tham quan
  // =========================
  const recommendedRoute = useMemo(() => {
    if (!location || !Array.isArray(pois) || pois.length === 0) {
      return [];
    }

    const validPois = pois.filter((poi) => {
      const latitude = Number(poi.latitude);
      const longitude = Number(poi.longitude);

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      );
    });

    if (validPois.length === 0) {
      return [];
    }

    const remaining = validPois.map((poi) => ({
      poi,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        Number(poi.latitude),
        Number(poi.longitude)
      ),
    }));

    const route = [];

    let current = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const routeCount = 5;

    while (
      route.length < routeCount &&
      remaining.length > 0
    ) {
      let nearestIndex = -1;
      let nearestDistance = Number.MAX_SAFE_INTEGER;

      for (
        let index = 0;
        index < remaining.length;
        index += 1
      ) {
        const candidate = remaining[index];

        if (!candidate) {
          continue;
        }

        const distance = calculateDistance(
          current.latitude,
          current.longitude,
          Number(candidate.poi.latitude),
          Number(candidate.poi.longitude)
        );

        if (
          Number.isFinite(distance) &&
          distance < nearestDistance
        ) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      if (nearestIndex === -1) {
        break;
      }

      const selected = remaining.splice(
        nearestIndex,
        1
      )[0];

      if (!selected) {
        break;
      }

      route.push(selected.poi);

      current = {
        latitude: Number(selected.poi.latitude),
        longitude: Number(selected.poi.longitude),
      };
    }

    return route;
  }, [location, pois]);

  // =========================
  // Tạo đường nối tuyến
  // =========================
  const routeCoordinates = useMemo(() => {
    if (!location || recommendedRoute.length === 0) {
      return [];
    }

    return [
      {
        latitude: location.latitude,
        longitude: location.longitude,
      },

      ...recommendedRoute.map((poi) => ({
        latitude: Number(poi.latitude),
        longitude: Number(poi.longitude),
      })),
    ];
  }, [location, recommendedRoute]);

  // =========================
  // Focus vào POI được chọn
  // =========================
  useEffect(() => {
    if (!selectedPoi || !mapRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: Number(selectedPoi.latitude),
          longitude: Number(selectedPoi.longitude),
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        800
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedPoi]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }
            : defaultRegion
        }
        showsUserLocation={!!location}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={true}
      >
        {/* =========================
            GPS người dùng
        ========================= */}
        {location && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={30}
            strokeWidth={2}
            strokeColor="rgba(30, 136, 229, 0.65)"
            fillColor="rgba(30, 136, 229, 0.15)"
          />
        )}

        {/* =========================
            ĐƯỜNG TUYẾN THAM QUAN
        ========================= */}
        {routeCoordinates.length >= 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#168DCC"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* =========================
            Geofence của POI
        ========================= */}
        {pois.map((poi) => (
          <Circle
            key={`geofence-${poi.id}`}
            center={{
              latitude: Number(poi.latitude),
              longitude: Number(poi.longitude),
            }}
            radius={Number(poi.radius)}
            strokeWidth={2}
            fillColor="rgba(255, 152, 0, 0.12)"
            strokeColor="rgba(255, 152, 0, 0.8)"
          />
        ))}

        {/* =========================
            Các POI
        ========================= */}
        {pois.map((poi) => {
          const distance = location
            ? calculateDistance(
                location.latitude,
                location.longitude,
                Number(poi.latitude),
                Number(poi.longitude)
              )
            : null;

          const distanceText =
            distance === null
              ? ""
              : distance < 1000
              ? `${Math.round(distance)} m`
              : `${(distance / 1000).toFixed(1)} km`;

          return (
            <Marker
              key={poi.id}
              coordinate={{
                latitude: Number(poi.latitude),
                longitude: Number(poi.longitude),
              }}
              title={
                distanceText
                  ? `${poi.name.vi} - ${distanceText}`
                  : poi.name.vi
              }
              description={poi.description.vi}
              onPress={() =>
                onPoiPress?.(poi.id)
              }
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 20,
  },

  map: {
    flex: 1,
  },
});