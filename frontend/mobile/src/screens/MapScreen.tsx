import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import OfflineMapView from "../components/map/OfflineMapView";
import { usePoiStore } from "../store/usePoiStore";
import { useNativeLocation } from "../hooks/useNativeLocation";
import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";
import { calculateDistance } from "../utils/geoHelpers";

type RouteParams = {
  poiId?: number;
};

type RecommendedRouteItem = {
  poi: ReturnType<
    typeof usePoiStore.getState
  >["pois"][number];

  distanceFromPrevious: number;
};

function formatDistance(distance: number) {
  if (!Number.isFinite(distance)) {
    return "—";
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

function buildRecommendedRoute(
  pois: ReturnType<typeof usePoiStore.getState>["pois"],
  location: {
    latitude: number;
    longitude: number;
  } | null,
  count: number
): RecommendedRouteItem[] {
  if (!location || !Array.isArray(pois) || !pois.length || count <= 0) {
    return [];
  }

  // Chỉ giữ POI có tọa độ hợp lệ
  const validPois = pois.filter((poi) => {
    const latitude = Number(poi.latitude);
    const longitude = Number(poi.longitude);

    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    );
  });

  if (!validPois.length) {
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

  const route: RecommendedRouteItem[] = [];

  let current = {
    latitude: location.latitude,
    longitude: location.longitude,
  };

  while (
    route.length < count &&
    remaining.length > 0
  ) {
    let nearestIndex = 0;
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

    const [selected] = remaining.splice(
      nearestIndex,
      1
    );

    if (!selected) {
      break;
    }

    route.push({
      poi: selected.poi,
      distanceFromPrevious: Number.isFinite(
        nearestDistance
      )
        ? nearestDistance
        : 0,
    });

    current = {
      latitude: Number(selected.poi.latitude),
      longitude: Number(selected.poi.longitude),
    };
  }

  return route;
}

function buildGoogleDirectionsUrl(
  location: {
    latitude: number;
    longitude: number;
  } | null,
  route: RecommendedRouteItem[]
) {
  if (!location || route.length === 0) {
    return "";
  }

  const lastItem = route[route.length - 1];

  if (!lastItem?.poi) {
    return "";
  }

  const destination = lastItem.poi;

  const waypoints = route
    .slice(0, -1)
    .map(({ poi }) => {
      return `${Number(poi.latitude)},${Number(
        poi.longitude
      )}`;
    })
    .join("|");

  const params = [
    "api=1",

    `origin=${encodeURIComponent(
      `${location.latitude},${location.longitude}`
    )}`,

    `destination=${encodeURIComponent(
      `${Number(destination.latitude)},${Number(
        destination.longitude
      )}`
    )}`,

    "travelmode=walking",
  ];

  if (waypoints) {
    params.push(
      `waypoints=${encodeURIComponent(waypoints)}`
    );
  }

  return `https://www.google.com/maps/dir/?${params.join(
    "&"
  )}`;
}

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const { poiId } =
    (route.params || {}) as RouteParams;

  const language = useAppStore(
    (state) => state.language
  );

  const texts = getTranslations(language);
  const common = texts.common;

  const { location } =
    useNativeLocation(true);

  const pois = usePoiStore(
    (state) => state.pois
  );

  const getPoiById = usePoiStore(
    (state) => state.getPoiById
  );

  const selectedPoi = poiId
    ? getPoiById(poiId)
    : undefined;

  const routeCount = 5;

  const recommendedRoute =
    buildRecommendedRoute(
      pois,
      location,
      routeCount
    );

  const totalRouteDistance =
    recommendedRoute.reduce(
      (total, item) =>
        total +
        (Number.isFinite(item.distanceFromPrevious)
          ? item.distanceFromPrevious
          : 0),
      0
    );

  const directionsUrl =
    buildGoogleDirectionsUrl(
      location,
      recommendedRoute
    );

  const handleOpenDirections = async () => {
    if (!directionsUrl) {
      return;
    }

    try {
      const supported =
        await Linking.canOpenURL(
          directionsUrl
        );

      if (supported) {
        await Linking.openURL(
          directionsUrl
        );
      }
    } catch (error) {
      console.error(
        "OPEN DIRECTIONS ERROR:",
        error
      );
    }
  };

  /**
   * Lấy tên POI an toàn.
   *
   * Hỗ trợ cả 2 kiểu dữ liệu:
   *
   * 1. {
   *      name: {
   *        vi: "...",
   *        en: "...",
   *        zh: "..."
   *      }
   *    }
   *
   * 2. {
   *      name_vi: "...",
   *      name_en: "...",
   *      name_zh: "..."
   *    }
   */
  const getPoiName = (
    poi: RecommendedRouteItem["poi"]
  ) => {
    if (!poi) {
      return "POI";
    }

    const poiData =
      poi as unknown as Record<
        string,
        unknown
      >;

    // =========================
    // Kiểu 1: name là object
    // =========================

    const nameObject =
      poiData.name;

    if (
      nameObject &&
      typeof nameObject === "object" &&
      !Array.isArray(nameObject)
    ) {
      const localized =
        nameObject as Record<
          string,
          unknown
        >;

      const currentLanguage =
        localized[language];

      if (
        typeof currentLanguage === "string" &&
        currentLanguage.trim()
      ) {
        return currentLanguage;
      }

      const vietnamese =
        localized.vi;

      if (
        typeof vietnamese === "string" &&
        vietnamese.trim()
      ) {
        return vietnamese;
      }

      const english =
        localized.en;

      if (
        typeof english === "string" &&
        english.trim()
      ) {
        return english;
      }

      const firstValue =
        Object.values(localized).find(
          (value) =>
            typeof value === "string" &&
            value.trim()
        );

      if (
        typeof firstValue === "string"
      ) {
        return firstValue;
      }
    }

    // =========================
    // Kiểu 2: name_vi/name_en/...
    // =========================

    const localizedKey =
      `name_${language}`;

    const localizedFlat =
      poiData[localizedKey];

    if (
      typeof localizedFlat === "string" &&
      localizedFlat.trim()
    ) {
      return localizedFlat;
    }

    const vietnameseFlat =
      poiData.name_vi;

    if (
      typeof vietnameseFlat === "string" &&
      vietnameseFlat.trim()
    ) {
      return vietnameseFlat;
    }

    const englishFlat =
      poiData.name_en;

    if (
      typeof englishFlat === "string" &&
      englishFlat.trim()
    ) {
      return englishFlat;
    }

    const chineseFlat =
      poiData.name_zh;

    if (
      typeof chineseFlat === "string" &&
      chineseFlat.trim()
    ) {
      return chineseFlat;
    }

    return "POI";
  };

  return (
    <View style={styles.container}>
      <OfflineMapView
        location={location}
        selectedPoi={selectedPoi}
        onPoiPress={(id) => {
          navigation.navigate(
            "PoiDetail",
            {
              poiId: id,
              autoPlay: false,
            }
          );
        }}
      />

      {/* ================= ROUTE PANEL ================= */}

      <View style={styles.routePanel}>
        <View style={styles.routeHeader}>
          <View style={styles.routeHeaderText}>
            <Text style={styles.routeTitle}>
              {common.suggestRoute ||
                "Recommended Route"}
            </Text>

            <Text style={styles.routeSubtitle}>
              {location
                ? `${recommendedRoute.length} POI · ${formatDistance(
                    totalRouteDistance
                  )}`
                : "Đang chờ vị trí GPS..."}
            </Text>
          </View>

          <View style={styles.routeBadge}>
            <Text style={styles.routeBadgeText}>
              {routeCount}
            </Text>
          </View>
        </View>

        {!location ? (
          <Text style={styles.emptyText}>
            Bật GPS để tạo tuyến tham quan
            gần vị trí hiện tại.
          </Text>
        ) : recommendedRoute.length === 0 ? (
          <Text style={styles.emptyText}>
            Chưa có POI để tạo tuyến.
          </Text>
        ) : (
          <>
            <ScrollView
              style={styles.routeList}
              contentContainerStyle={
                styles.routeListContent
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {recommendedRoute.map(
                (item, index) => {
                  const poi = item.poi;

                  if (!poi) {
                    return null;
                  }

                  return (
                    <Pressable
                      key={`route-poi-${poi.id}`}
                      style={({ pressed }) => [
                        styles.routeItem,
                        pressed &&
                          styles.routeItemPressed,
                      ]}
                      onPress={() =>
                        navigation.navigate(
                          "PoiDetail",
                          {
                            poiId: poi.id,
                            autoPlay: false,
                          }
                        )
                      }
                    >
                      <View
                        style={
                          styles.routeNumber
                        }
                      >
                        <Text
                          style={
                            styles.routeNumberText
                          }
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.routeItemContent
                        }
                      >
                        <Text
                          style={
                            styles.routeItemTitle
                          }
                          numberOfLines={1}
                        >
                          {getPoiName(poi)}
                        </Text>

                        <Text
                          style={
                            styles.routeItemMeta
                          }
                        >
                          {index === 0
                            ? `Từ vị trí hiện tại · ${formatDistance(
                                item.distanceFromPrevious
                              )}`
                            : `Từ điểm ${
                                index
                              } · ${formatDistance(
                                item.distanceFromPrevious
                              )}`}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.routeArrow
                        }
                      >
                        ›
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Pressable
              style={
                styles.directionButton
              }
              onPress={
                handleOpenDirections
              }
            >
              <Text
                style={
                  styles.directionButtonIcon
                }
              >
                🧭
              </Text>

              <Text
                style={
                  styles.directionButtonText
                }
              >
                {common.map ||
                  "Mở chỉ đường"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  routePanel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,

    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 8,
  },

  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  routeHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  routeTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#171717",
  },

  routeSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
  },

  routeBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5FC",
    alignItems: "center",
    justifyContent: "center",
  },

  routeBadgeText: {
    color: "#168DCC",
    fontSize: 14,
    fontWeight: "900",
  },

  routeList: {
    maxHeight: 210,
  },

  routeListContent: {
    gap: 8,
    paddingBottom: 8,
  },

  routeItem: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#F7F9FA",
    borderWidth: 1,
    borderColor: "#EDF0F2",

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  routeItemPressed: {
    opacity: 0.7,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  routeNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#168DCC",
    alignItems: "center",
    justifyContent: "center",
  },

  routeNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  routeItemContent: {
    flex: 1,
    marginLeft: 10,
  },

  routeItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
  },

  routeItemMeta: {
    marginTop: 3,
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },

  routeArrow: {
    marginLeft: 8,
    fontSize: 24,
    color: "#999",
    fontWeight: "500",
  },

  directionButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#168DCC",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  directionButtonIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  directionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  emptyText: {
    paddingVertical: 12,
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
  },
});