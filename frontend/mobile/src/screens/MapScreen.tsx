import { useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import OfflineMapView from "../components/map/OfflineMapView";
import { usePoiStore } from "../store/usePoiStore";
import { useNativeLocation } from "../hooks/useNativeLocation";

type RouteParams = {
  poiId?: number;
};

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const { poiId } = (route.params || {}) as RouteParams;

  const { location } = useNativeLocation(true);
  const getPoiById = usePoiStore(
  (state) => state.getPoiById
);

  const selectedPoi = poiId
  ? getPoiById(poiId)
  : undefined;

  return (
    <View style={styles.container}>
      <OfflineMapView
        location={location}
        selectedPoi={selectedPoi}
        onPoiPress={(id) => {
          navigation.navigate("PoiDetail", {
            poiId: id,
            autoPlay: false,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#F5F5F5",
  },
});