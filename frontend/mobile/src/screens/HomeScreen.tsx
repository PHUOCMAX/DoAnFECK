import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";

import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";

import type { UserLocation } from "../hooks/useNativeLocation";

import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";
import { usePoiStore } from "../store/usePoiStore";
import { useNativeLocation } from "../hooks/useNativeLocation";
import { useGeofenceEngine } from "../hooks/useGeofenceEngine";
import { calculateDistance } from "../utils/geoHelpers";

import OfflineMapView from "../components/map/OfflineMapView";
import LanguageMenu from "../components/common/LanguageMenu";

type CategoryFilter = "all" | "tourism" | "food";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

function resolveImageUrl(image?: string | null) {
  if (!image) {
    return null;
  }

  const value = image.trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  /* ================= APP STORE ================= */

  const language = useAppStore(
    (state) => state.language
  );

  const setLanguage = useAppStore(
    (state) => state.setLanguage
  );

  const user = useAppStore(
    (state) => state.user
  );

  const logout = useAppStore(
    (state) => state.logout
  );

  /* ================= POI ================= */

  const pois = usePoiStore(
    (state) => state.pois
  );

  /* ================= TRANSLATION ================= */

  const texts = getTranslations(language);
  const common = texts.common;

  /* ================= GPS ================= */

  const {
    location,
    permissionGranted,
    loading: locationLoading,
    error: locationError,
  } = useNativeLocation(true);

  /* ================= DEMO LOCATION ================= */

  const [demoLocation, setDemoLocation] =
    useState<UserLocation | null>(null);

  const effectiveLocation =
    demoLocation ?? location;

  /* ================= GEOFENCE ================= */

  useGeofenceEngine({
    location: effectiveLocation,

    onCheckin: (poiId) => {
      console.log(
        "AUTO CHECK-IN POI:",
        poiId
      );

      navigation.navigate(
        "PoiDetail",
        {
          poiId,
          autoPlay: true,
        }
      );
    },
  });

  /* ================= STATE ================= */

  const [city, setCity] =
    useState("all");

  const [category, setCategory] =
    useState<CategoryFilter>("all");

  const [nearby, setNearby] =
    useState(false);

  const [isMap, setIsMap] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [showCityMenu, setShowCityMenu] =
    useState(false);

  const [
    showCategoryMenu,
    setShowCategoryMenu,
  ] = useState(false);

  /* ================= FILTER ================= */

  const filteredPois = useMemo(() => {
    return pois.filter((poi) => {
      const poiName =
        poi.name[language] ??
        poi.name.vi ??
        Object.values(poi.name)[0] ??
        "";

      const matchesSearch =
        poiName
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        category === "all" ||
        (
          category === "tourism" &&
          poi.category === "tourism"
        ) ||
        (
          category === "food" &&
          poi.category === "food"
        );

      const matchesCity =
        city === "all" ||
        poi.city === city;

      if (!nearby) {
        return (
          matchesSearch &&
          matchesCategory &&
          matchesCity
        );
      }

      if (!effectiveLocation) {
        return false;
      }

      const distance =
        calculateDistance(
          effectiveLocation.latitude,
          effectiveLocation.longitude,
          poi.latitude,
          poi.longitude
        );

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCity &&
        distance <= 5000
      );
    });
  }, [
    search,
    category,
    city,
    nearby,
    language,
    effectiveLocation,
    pois,
  ]);

  /* ================= TEXT ================= */

  const currentCityText =
    city === "all"
      ? common.all
      : common.hoChiMinh;

  const currentCategoryText =
    category === "all"
      ? common.all
      : category === "tourism"
        ? common.tourismShort
        : common.food;

  /* ================= LOGOUT ================= */

  const handleLogout = async () => {
    await logout();
  };

  /* ================= UI ================= */

  return (
    <View style={styles.screen}>

      {/* ================= HEADER ================= */}

      <View style={styles.header}>

        <View style={styles.brandBlock}>

          <Text style={styles.brandTitle}>
            MULTILINGUAL
          </Text>

          <Text
            style={styles.brandTitleSecond}
          >
            TOUR GUIDE
          </Text>

          <Text
            style={styles.brandSubtitle}
          >
            {common.tagline}
          </Text>

        </View>

        <View style={styles.welcomeRow}>

          <View style={styles.welcomeBlock}>

            <Text
              style={styles.welcomeLabel}
            >
              {common.greeting},
            </Text>

            <Text
              style={styles.welcomeName}
              numberOfLines={1}
            >
              {user?.name || common.guest}
            </Text>

          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text
              style={styles.logoutText}
            >
              {common.logout}
            </Text>
          </Pressable>

        </View>

        {/* LANGUAGE */}

        <View
          style={styles.languageSection}
        >
          <LanguageMenu
            language={language}
            onSelect={(code) => {
              setLanguage(code as any);
            }}
            label={common.language}
          />
        </View>

      </View>

      {/* ================= FILTER ================= */}

      <View
        style={styles.fixedControls}
      >

        <View style={styles.filters}>

          {/* CITY */}

          <Pressable
            style={styles.filterBox}
            onPress={() =>
              setShowCityMenu(true)
            }
          >

            <Text
              style={styles.filterIcon}
            >
              📍
            </Text>

            <Text
              style={styles.filterTitle}
              numberOfLines={1}
            >
              {currentCityText}
            </Text>

            <Text
              style={styles.filterSubtitle}
            >
              {common.location}
            </Text>

          </Pressable>

          {/* CATEGORY */}

          <Pressable
            style={styles.filterBox}
            onPress={() =>
              setShowCategoryMenu(true)
            }
          >

            <Text
              style={styles.filterIcon}
            >
              ☰
            </Text>

            <Text
              style={styles.filterTitle}
              numberOfLines={1}
            >
              {currentCategoryText}
            </Text>

            <Text
              style={styles.filterSubtitle}
            >
              {common.category}
            </Text>

          </Pressable>

          {/* NEARBY */}

          <Pressable
            style={[
              styles.filterBox,
              nearby &&
                styles.filterBoxActive,
            ]}
            onPress={() =>
              setNearby(!nearby)
            }
          >

            <Text
              style={styles.filterIcon}
            >
              ◎
            </Text>

            <Text
              style={styles.filterTitle}
              numberOfLines={1}
            >
              {nearby
                ? common.nearby
                : common.all}
            </Text>

            <Text
              style={styles.filterSubtitle}
            >
              {common.filter}
            </Text>

          </Pressable>

          {/* MAP */}

          <Pressable
            style={styles.mapButton}
            onPress={() =>
              setIsMap(!isMap)
            }
          >

            <Text style={styles.mapIcon}>
              {isMap ? "☷" : "🗺"}
            </Text>

            <Text
              style={styles.mapButtonText}
            >
              {isMap
                ? common.explore
                : common.map}
            </Text>

          </Pressable>

        </View>

        {/* SEARCH */}

        <View style={styles.searchBox}>

          <Text
            style={styles.searchIcon}
          >
            ⌕
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={common.search}
            placeholderTextColor="#999"
            style={styles.searchInput}
          />

        </View>

      </View>

      {/* ================= CITY MENU ================= */}

      {showCityMenu && (
        <View
          style={styles.menuOverlay}
        >

          <Pressable
            style={styles.menuBackdrop}
            onPress={() =>
              setShowCityMenu(false)
            }
          />

          <View style={styles.menuBox}>

            <Text style={styles.menuTitle}>
              {common.location}
            </Text>

            <ScrollView
              style={styles.menuScroll}
              showsVerticalScrollIndicator={
                false
              }
            >

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setCity("all");
                  setShowCityMenu(false);
                }}
              >

                <Text
                  style={styles.menuItemText}
                >
                  {common.all}
                </Text>

              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setCity(
                    "ho-chi-minh"
                  );
                  setShowCityMenu(false);
                }}
              >

                <Text
                  style={styles.menuItemText}
                >
                  {common.hoChiMinh}
                </Text>

              </Pressable>

            </ScrollView>

          </View>

        </View>
      )}

      {/* ================= CATEGORY MENU ================= */}

      {showCategoryMenu && (
        <View
          style={styles.menuOverlay}
        >

          <Pressable
            style={styles.menuBackdrop}
            onPress={() =>
              setShowCategoryMenu(false)
            }
          />

          <View style={styles.menuBox}>

            <Text style={styles.menuTitle}>
              {common.category}
            </Text>

            <ScrollView
              style={styles.menuScroll}
              showsVerticalScrollIndicator={
                false
              }
            >

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setCategory("all");
                  setShowCategoryMenu(false);
                }}
              >

                <Text
                  style={styles.menuItemText}
                >
                  {common.all}
                </Text>

              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setCategory("tourism");
                  setShowCategoryMenu(false);
                }}
              >

                <Text
                  style={styles.menuItemText}
                >
                  {common.tourismShort}
                </Text>

              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setCategory("food");
                  setShowCategoryMenu(false);
                }}
              >

                <Text
                  style={styles.menuItemText}
                >
                  {common.food}
                </Text>

              </Pressable>

            </ScrollView>

          </View>

        </View>
      )}

      {/* ================= LOCATION ================= */}

      {locationLoading && (
        <View
          style={styles.locationStatus}
        >
          <Text
            style={styles.locationStatusText}
          >
            📍 {common.locating}...
          </Text>
        </View>
      )}

      {effectiveLocation && (
        <View style={styles.locationStatus}>
          <Text style={styles.locationStatusText}>
            📍 {demoLocation ? "Demo GPS" : common.gpsLocation}:{" "}
            {effectiveLocation.latitude.toFixed(5)}
            ,{" "}
            {effectiveLocation.longitude.toFixed(5)}
          </Text>
        </View>
      )}

      {locationError && (
        <View
          style={styles.locationError}
        >
          <Text
            style={styles.locationErrorText}
          >
            {locationError}
          </Text>
        </View>
      )}

      {/* ================= DEMO LOCATION ================= */}

      <View style={styles.demoLocationBox}>
        <View style={styles.demoLocationHeader}>
          <View style={styles.demoLocationTitleWrap}>
            <Text style={styles.demoLocationTitle}>
              Demo GPS
            </Text>
            <Text style={styles.demoLocationSubtitle}>
              Mô phỏng vị trí để thầy chấm không cần ở Linh Ứng
            </Text>
          </View>

          {demoLocation && (
            <Pressable
              style={styles.demoClearButton}
              onPress={() => setDemoLocation(null)}
            >
              <Text style={styles.demoClearButtonText}>
                GPS thật
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.demoLocationList}
        >
          {pois.slice(0, 5).map((poi) => {
            const poiName =
              poi.name[language] ??
              poi.name.vi ??
              Object.values(poi.name)[0] ??
              `POI #${poi.id}`;

            return (
              <Pressable
                key={poi.id}
                style={[
                  styles.demoPoiButton,
                  demoLocation?.latitude === poi.latitude &&
                    demoLocation?.longitude === poi.longitude &&
                    styles.demoPoiButtonActive,
                ]}
                onPress={() =>
                  setDemoLocation({
                    latitude: poi.latitude,
                    longitude: poi.longitude,
                    accuracy: 1,
                  })
                }
              >
                <Text
                  style={[
                    styles.demoPoiButtonText,
                    demoLocation?.latitude === poi.latitude &&
                      demoLocation?.longitude === poi.longitude &&
                      styles.demoPoiButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {poiName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

            {/* ================= POI CONTENT ================= */}

      <ScrollView
        style={styles.poiScroll}
        contentContainerStyle={
          styles.poiContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {isMap ? (
          <View
            style={styles.mapContainer}
          >
            <OfflineMapView
              location={effectiveLocation}
              onPoiPress={(poiId) => {
                navigation.navigate(
                  "PoiDetail",
                  {
                    poiId,
                    autoPlay: false,
                  }
                );
              }}
            />
          </View>
        ) : (
          <>

            {/* LIST HEADER */}

            <View
              style={styles.listHeader}
            >

              <View>

                <Text
                  style={styles.listTitle}
                >
                  {common.explore}
                </Text>

                <Text
                  style={styles.listSubtitle}
                >
                  {texts.app.subtitle}
                </Text>

              </View>

              <View
                style={styles.countBadge}
              >

                <Text
                  style={styles.resultCount}
                >
                  {filteredPois.length}{" "}
                  {common.places}
                </Text>

              </View>

            </View>

            {/* POI */}

            {filteredPois.map((poi) => {

              const distance =
                effectiveLocation
                  ? calculateDistance(
                      effectiveLocation.latitude,
                      effectiveLocation.longitude,
                      poi.latitude,
                      poi.longitude
                    )
                  : null;

              const poiName =
                poi.name[language] ??
                poi.name.vi ??
                Object.values(
                  poi.name
                )[0] ??
                "";

              const poiDescription =
                poi.description[
                  language
                ] ??
                poi.description.vi ??
                Object.values(
                  poi.description
                )[0] ??
                "";

              const categoryText =
                poi.category === "food"
                  ? common.food
                  : common.tourism;

              const imageUrl =
                resolveImageUrl(
                  poi.image
                );

              return (
                <Pressable
                  key={poi.id}
                  style={styles.poiCard}
                  onPress={() =>
                    navigation.navigate(
                      "PoiDetail",
                      {
                        poiId: poi.id,
                      }
                    )
                  }
                >

                  <View
                    style={styles.poiImage}
                  >

                    {imageUrl ? (
                      <Image
                        source={{
                          uri: imageUrl,
                        }}
                        style={
                          styles.poiImageContent
                        }
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={
                          styles.poiImageIcon
                        }
                      >
                        🏞️
                      </Text>
                    )}

                    <View
                      style={
                        styles.poiCategory
                      }
                    >
                      <Text
                        style={
                          styles.poiCategoryText
                        }
                      >
                        {categoryText}
                      </Text>
                    </View>

                  </View>

                  <View
                    style={styles.poiInfo}
                  >

                    <View
                      style={styles.titleRow}
                    >

                      <Text
                        style={
                          styles.poiTitle
                        }
                        numberOfLines={2}
                      >
                        {poiName}
                      </Text>

                      <Text
                        style={styles.arrow}
                      >
                        ›
                      </Text>

                    </View>

                    <Text
                      style={
                        styles.poiDescription
                      }
                      numberOfLines={3}
                    >
                      {poiDescription}
                    </Text>

                    <View
                      style={styles.poiMeta}
                    >

                      <Text
                        style={
                          styles.poiMetaText
                        }
                        numberOfLines={1}
                      >
                        📍{" "}
                        {poi.city ===
                        "ho-chi-minh"
                          ? common.hoChiMinh
                          : poi.city}
                      </Text>

                      {distance !==
                        null && (
                        <Text
                          style={
                            styles.poiMetaText
                          }
                        >
                          📏{" "}
                          {distance < 1000
                            ? `${Math.round(
                                distance
                              )} ${common.meters}`
                            : `${(
                                distance /
                                1000
                              ).toFixed(
                                1
                              )} km`}
                        </Text>
                      )}

                    </View>

                    <Text
                      style={
                        styles.detailText
                      }
                    >
                      {common.viewDetail} →
                    </Text>

                  </View>

                </Pressable>
              );
            })}

            {/* EMPTY */}

            {filteredPois.length === 0 && (
              <View
                style={styles.emptyState}
              >

                <Text
                  style={styles.emptyIcon}
                >
                  🔎
                </Text>

                <Text
                  style={styles.emptyTitle}
                >
                  {common.noResults}
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  {common.changeFilters}
                </Text>

              </View>
            )}

          </>
        )}

        <View
          style={{ height: 120 }}
        />

      </ScrollView>
   {/* ================= AI CHAT FLOATING BUBBLE ================= */}

    <Pressable
      style={styles.aiChatBubble}
      onPress={() => navigation.navigate("Chat")}
    >
      <Text style={styles.aiChatIcon}>✦</Text>

      <View style={styles.aiChatBadge}>
        <Text style={styles.aiChatBadgeText}>AI</Text>
      </View>
    </Pressable>
     {/* ================= BOTTOM NAV ================= */}

<View style={styles.bottomBar}>
  {/* PROFILE */}
  <Pressable
    style={styles.bottomItem}
    onPress={() =>
      navigation.navigate("Profile")
    }
  >
    <Text style={styles.bottomIcon}>
      👤
    </Text>

    <Text style={styles.bottomText}>
      {common.profile}
    </Text>
  </Pressable>

  {/* SCAN QR */}
  <Pressable
    style={styles.bottomItem}
    onPress={() =>
      navigation.navigate("ScanQR")
    }
  >
    <View style={styles.scanQrButton}>
      <Text style={styles.scanQrIcon}>
        ▣
      </Text>
    </View>

    <Text style={styles.bottomText}>
      {language === "vi"
        ? "Quét QR"
        : "Scan QR"}
    </Text>
  </Pressable>

  {/* ADD POI */}
  <Pressable
    style={styles.bottomItem}
    onPress={() =>
      navigation.navigate("AddPoi")
    }
  >
    <View style={styles.addButton}>
      <Text style={styles.addIcon}>
        ＋
      </Text>
    </View>

    <Text style={styles.bottomText}>
      {common.add}
    </Text>
  </Pressable>

  {/* HISTORY / CHECK-IN */}
  <Pressable
    style={styles.bottomItem}
    onPress={() =>
      navigation.navigate("History")
    }
  >
    <Text style={styles.bottomIcon}>
      📍
    </Text>

    <Text style={styles.bottomText}>
      {common.checkin}
    </Text>
  </Pressable>
</View>
    </View>
  );
}

/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: "#168dcc",
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  brandBlock: {
    alignItems: "flex-start",
  },

  brandTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  brandTitleSecond: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: -4,
  },

  brandSubtitle: {
    marginTop: 6,
    color: "#dff3ff",
    fontSize: 13,
    fontWeight: "500",
  },

  welcomeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcomeBlock: {
    flex: 1,
    marginRight: 12,
  },

  welcomeLabel: {
    color: "#dff3ff",
    fontSize: 12,
    fontWeight: "500",
  },

  welcomeName: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },

  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.35)",
  },

  logoutText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  languageSection: {
    marginTop: 16,
  },

  /* ================= FILTER ================= */

  fixedControls: {
    backgroundColor: "#f5f7fa",
    paddingTop: 6,
    paddingBottom: 4,
  },

  filters: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
  },

  filterBox: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  filterBoxActive: {
    backgroundColor: "#dff5f4",
  },

  filterIcon: {
    fontSize: 20,
    marginBottom: 3,
  },

  filterTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },

  filterSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#777",
  },

  mapButton: {
    width: 64,
    minHeight: 72,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  mapIcon: {
    fontSize: 24,
  },

  mapButtonText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
  },

  /* ================= SEARCH ================= */

  searchBox: {
    height: 50,
    marginHorizontal: 12,
    marginTop: 6,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  searchIcon: {
    fontSize: 25,
    color: "#888",
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#222",
  },

  /* ================= DEMO GPS ================= */

  demoLocationBox: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 12,
    backgroundColor: "#fff8e8",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0d28a",
  },

  demoLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  demoLocationTitleWrap: {
    flex: 1,
    marginRight: 10,
  },

  demoLocationTitle: {
    color: "#8a5a00",
    fontSize: 13,
    fontWeight: "900",
  },

  demoLocationSubtitle: {
    marginTop: 3,
    color: "#9a7a3a",
    fontSize: 10,
    lineHeight: 15,
  },

  demoClearButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9c080",
  },

  demoClearButtonText: {
    color: "#7a5a10",
    fontSize: 11,
    fontWeight: "800",
  },

  demoLocationList: {
    paddingTop: 10,
    paddingRight: 8,
    gap: 8,
  },

  demoPoiButton: {
    maxWidth: 150,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5d6ab",
  },

  demoPoiButtonActive: {
    backgroundColor: "#168dcc",
    borderColor: "#168dcc",
  },

  demoPoiButtonText: {
    color: "#6b5318",
    fontSize: 11,
    fontWeight: "800",
  },

  demoPoiButtonTextActive: {
    color: "#fff",
  },

  /* ================= GPS ================= */

  locationStatus: {
    marginHorizontal: 12,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#eaf7ff",
    borderRadius: 12,
  },

  locationStatusText: {
    color: "#168dcc",
    fontSize: 12,
    fontWeight: "600",
  },

  locationError: {
    marginHorizontal: 12,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fff1f1",
    borderRadius: 12,
  },

  locationErrorText: {
    color: "#d33",
    fontSize: 12,
  },

  /* ================= POI AREA ================= */

  poiScroll: {
    flex: 1,
  },

  poiContent: {
    paddingTop: 0,
    paddingBottom: 120,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 8,
  },

  listTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#222",
  },

  listSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#777",
  },

  countBadge: {
    backgroundColor: "#e8f6ff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  resultCount: {
    color: "#168dcc",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ================= POI CARD ================= */

  poiCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  poiImage: {
    height: 200,
    backgroundColor: "#dcecf7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  poiImageContent: {
    width: "100%",
    height: "100%",
  },

  poiImageIcon: {
    fontSize: 55,
  },

  poiCategory: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor:
      "rgba(0,0,0,0.62)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },

  poiCategoryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  poiInfo: {
    padding: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  poiTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: "#222",
  },

  arrow: {
    marginLeft: 8,
    fontSize: 27,
    lineHeight: 24,
    color: "#168dcc",
    fontWeight: "700",
  },

  poiDescription: {
    marginTop: 8,
    color: "#666",
    lineHeight: 21,
    fontSize: 14,
  },

  poiMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },

  poiMetaText: {
    color: "#777",
    fontSize: 12,
    flexShrink: 1,
  },

  detailText: {
    marginTop: 13,
    color: "#119fd1",
    fontWeight: "800",
    fontSize: 14,
  },

  /* ================= EMPTY ================= */

  emptyState: {
    marginHorizontal: 16,
    marginTop: 30,
    padding: 30,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 5,
    color: "#777",
    fontSize: 13,
    textAlign: "center",
  },

  /* ================= MAP ================= */

  mapContainer: {
    height: 520,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  /* ================= BOTTOM ================= */
  /* ================= AI CHAT ================= */

  aiChatBubble: {
    position: "absolute",
    right: 18,
    bottom: 98,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#27c1b7",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    zIndex: 100,
  },

  aiChatIcon: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },

  aiChatBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  aiChatBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
  },

  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomIcon: {
    fontSize: 24,
  },

  bottomText: {
    marginTop: 4,
    color: "#555555",
    fontSize: 12,
    fontWeight: "600",
  },
  scanQrButton: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: "#168DCC",
  alignItems: "center",
  justifyContent: "center",
},

scanQrIcon: {
  color: "#FFFFFF",
  fontSize: 27,
  fontWeight: "900",
},

  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#27c1b7",
    alignItems: "center",
    justifyContent: "center",
  },

  addIcon: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "300",
  },

  /* ================= MENU ================= */

  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },

  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0,0,0,0.35)",
  },

  menuBox: {
    width: "82%",
    maxHeight: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  menuTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#222",
    marginBottom: 12,
  },

  menuScroll: {
    maxHeight: 280,
  },

  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  menuItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },

});