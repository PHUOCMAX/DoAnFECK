import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Circle,
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

  // Khi mở map từ PoiDetail,
  // camera sẽ focus vào POI được chọn.
useEffect(() => {
  if (!selectedPoi || !mapRef.current) return;

  const timer = setTimeout(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: selectedPoi.latitude,
        longitude: selectedPoi.longitude,
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
        {/* GPS người dùng */}
        {location && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={30}
            strokeWidth={2}
            fillColor="rgba(30, 136, 229, 0.15)"
          />
        )}
        {pois.map((poi) => (
  <Circle
    key={`geofence-${poi.id}`}
    center={{
      latitude: poi.latitude,
      longitude: poi.longitude,
    }}
    radius={poi.radius}
    strokeWidth={2}
    fillColor="rgba(255, 152, 0, 0.12)"
    strokeColor="rgba(255, 152, 0, 0.8)"
  />
))}

        {/* Các POI */}
        {pois.map((poi) => {
          const distance = location
            ? calculateDistance(
                location.latitude,
                location.longitude,
                poi.latitude,
                poi.longitude
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
                latitude: poi.latitude,
                longitude: poi.longitude,
              }}
              title={
                distanceText
                  ? `${poi.name.vi} - ${distanceText}`
                  : poi.name.vi
              }
              description={poi.description.vi}
              onPress={() => onPoiPress?.(poi.id)}
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