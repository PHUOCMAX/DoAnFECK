import { useEffect } from "react";

import { useAudioPlayer } from "expo-audio";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";

import {
  useRoute,
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";

import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";
import { usePoiStore } from "../store/usePoiStore";

import {
  speakText,
  stopSpeaking,
} from "../services/nativeTts";

type RouteParams = {
  poiId: number;
  autoPlay?: boolean;
};

type PoiDetailNavigationParamList = {
  Map: {
    poiId: number;
  };
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(
    /\/+$/,
    ""
  ) || "";

function resolveImageUrl(
  image?: string | null
) {
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

function resolveAudioUrl(
  audio?: string | null
) {
  if (!audio) {
    return null;
  }

  const value = audio.trim();

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

export default function PoiDetailScreen() {
  const route = useRoute();

  const navigation =
    useNavigation<
      NavigationProp<PoiDetailNavigationParamList>
    >();

  const {
    poiId,
    autoPlay,
  } = route.params as RouteParams;

  /* ================= APP STORE ================= */

  const language = useAppStore(
    (state) => state.language
  );

  /* ================= POI ================= */

  const getPoiById = usePoiStore(
    (state) => state.getPoiById
  );

  const poi = getPoiById(poiId);

  /* ================= TRANSLATION ================= */

  const texts = getTranslations(language);
  const common = texts.common;

  /* ================= AUDIO ================= */

  const audioUrl = resolveAudioUrl(
    poi?.audio?.[language]
  );

  const player = useAudioPlayer(
    audioUrl,
    {
      downloadFirst: true,
    }
  );

  /* ================= AUTO PLAY ================= */

  useEffect(() => {
    if (!autoPlay || !poi) {
      return;
    }

    const description =
      poi.description[language] ??
      poi.description.vi ??
      Object.values(
        poi.description
      )[0] ??
      "";

    /*
     * Ưu tiên audio MP3 đã được
     * generate từ backend.
     */
    if (audioUrl) {
      console.log(
        "POI AUDIO PLAY:",
        poi.id,
        language,
        audioUrl
      );

      stopSpeaking();

      try {
        player.play();
      } catch (error) {
        console.error(
          "POI AUDIO PLAY ERROR:",
          error
        );

        if (description) {
          console.log(
            "POI AUDIO FALLBACK TTS:",
            poi.id,
            language
          );

          speakText(
            description,
            language
          );
        }
      }

      return () => {
        try {
          player.pause();
        } catch {
          // ignore
        }

        stopSpeaking();
      };
    }

    /*
     * Không có audio MP3
     * → fallback native TTS.
     */
    if (!description) {
      return;
    }

    console.log(
      "POI AUDIO FALLBACK TTS:",
      poi.id,
      language
    );

    speakText(
      description,
      language
    );

    return () => {
      stopSpeaking();
    };
  }, [
    autoPlay,
    poi,
    language,
    audioUrl,
    player,
  ]);

  /* ================= PLAY ================= */

  const handlePlayAudio = () => {
    if (!poi) {
      return;
    }

    if (audioUrl) {
      console.log(
        "MANUAL POI AUDIO PLAY:",
        poi.id,
        language,
        audioUrl
      );

      stopSpeaking();

      try {
        player.play();
      } catch (error) {
        console.error(
          "MANUAL POI AUDIO ERROR:",
          error
        );

        const description =
          poi.description[language] ??
          poi.description.vi ??
          Object.values(
            poi.description
          )[0] ??
          "";

        if (description) {
          console.log(
            "MANUAL POI AUDIO FALLBACK TTS:",
            poi.id,
            language
          );

          speakText(
            description,
            language
          );
        }
      }

      return;
    }

    const description =
      poi.description[language] ??
      poi.description.vi ??
      Object.values(
        poi.description
      )[0] ??
      "";

    if (!description) {
      return;
    }

    console.log(
      "MANUAL POI AUDIO FALLBACK TTS:",
      poi.id,
      language
    );

    speakText(
      description,
      language
    );
  };

  /* ================= STOP ================= */

  const handleStopAudio = () => {
    try {
      player.pause();
    } catch {
      // ignore
    }

    stopSpeaking();
  };

  /* ================= NOT FOUND ================= */

  if (!poi) {
    return (
      <View style={styles.notFound}>
        <Text
          style={styles.notFoundIcon}
        >
          📍
        </Text>

        <Text
          style={styles.notFoundText}
        >
          POI not found
        </Text>
      </View>
    );
  }

  /* ================= LOCALIZED CONTENT ================= */

  const poiName =
    poi.name[language] ??
    poi.name.vi ??
    Object.values(
      poi.name
    )[0] ??
    "";

  const poiDescription =
    poi.description[language] ??
    poi.description.vi ??
    Object.values(
      poi.description
    )[0] ??
    "";

  const category =
    poi.category === "food"
      ? common.food
      : common.tourism;

  const imageUrl =
    resolveImageUrl(
      poi.image
    );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ================= IMAGE ================= */}

        <View style={styles.hero}>
          {imageUrl ? (
            <Image
              source={{
                uri: imageUrl,
              }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View
              style={
                styles.imageFallback
              }
            >
              <Text
                style={
                  styles.imageFallbackIcon
                }
              >
                🏞️
              </Text>
            </View>
          )}

          <View
            style={
              styles.imageOverlay
            }
          />

          <View
            style={
              styles.categoryBadge
            }
          >
            <Text
              style={
                styles.categoryBadgeText
              }
            >
              {category}
            </Text>
          </View>
        </View>

        {/* ================= MAIN CONTENT ================= */}

        <View
          style={styles.container}
        >
          {/* TITLE */}

          <Text
            style={styles.title}
          >
            {poiName}
          </Text>

          {/* LOCATION */}

          <View
            style={
              styles.locationRow
            }
          >
            <Text
              style={
                styles.locationIcon
              }
            >
              📍
            </Text>

            <Text
              style={
                styles.locationText
              }
            >
              {poi.city ===
              "ho-chi-minh"
                ? common.hoChiMinh
                : poi.city}
            </Text>
          </View>

          {/* DESCRIPTION */}

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {
                common.detailDescription
              }
            </Text>

            <View
              style={
                styles.descriptionCard
              }
            >
              <Text
                style={
                  styles.description
                }
              >
                {poiDescription}
              </Text>
            </View>
          </View>

          {/* ================= AUDIO ================= */}

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {common.playAudio}
            </Text>

            <View
              style={styles.audioCard}
            >
              <View
                style={
                  styles.audioIconBox
                }
              >
                <Text
                  style={
                    styles.audioIcon
                  }
                >
                  🔊
                </Text>
              </View>

              <View
                style={styles.audioInfo}
              >
                <Text
                  style={
                    styles.audioTitle
                  }
                >
                  {common.playAudio}
                </Text>

                <Text
                  style={
                    styles.audioDescription
                  }
                >
                  {poiDescription.length >
                  80
                    ? `${poiDescription.substring(
                        0,
                        80
                      )}...`
                    : poiDescription}
                </Text>
              </View>
            </View>

            {/* PLAY */}

            <Pressable
              style={({
                pressed,
              }) => [
                styles.audioButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                handlePlayAudio
              }
            >
              <Text
                style={
                  styles.audioButtonIcon
                }
              >
                ▶
              </Text>

              <Text
                style={
                  styles.audioButtonText
                }
              >
                {common.playAudio}
              </Text>
            </Pressable>

            {/* STOP */}

            <Pressable
              style={({
                pressed,
              }) => [
                styles.stopAudioButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                handleStopAudio
              }
            >
              <Text
                style={
                  styles.stopAudioButtonText
                }
              >
                {common.stopAudio}
              </Text>
            </Pressable>
          </View>

          {/* ================= GPS ================= */}

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {common.coordinates}
            </Text>

            <View
              style={styles.infoCard}
            >
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  {common.latitude}
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {Number(
                    poi.latitude
                  ).toFixed(6)}
                </Text>
              </View>

              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  {common.longitude}
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {Number(
                    poi.longitude
                  ).toFixed(6)}
                </Text>
              </View>

              <View
                style={[
                  styles.infoRow,
                  styles.lastInfoRow,
                ]}
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  {common.radius}
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {poi.radius}{" "}
                  {common.meters}
                </Text>
              </View>
            </View>
          </View>

          {/* ================= CHECK-IN ================= */}

          <View
            style={
              styles.checkinCard
            }
          >
            <View
              style={
                styles.checkinIconBox
              }
            >
              <Text
                style={
                  styles.checkinIcon
                }
              >
                ✓
              </Text>
            </View>

            <View
              style={
                styles.checkinContent
              }
            >
              <Text
                style={
                  styles.checkinTitle
                }
              >
                {common.checkin}
              </Text>

              <Text
                style={
                  styles.checkinDescription
                }
              >
                {
                  common.checkinAvailable
                }
              </Text>
            </View>
          </View>

          {/* ================= MAP ================= */}

          <Pressable
            style={({
              pressed,
            }) => [
              styles.mapButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={() =>
              navigation.navigate(
                "Map",
                {
                  poiId: poi.id,
                }
              )
            }
          >
            <Text
              style={
                styles.mapButtonIcon
              }
            >
              🗺️
            </Text>

            <Text
              style={
                styles.mapButtonText
              }
            >
              {common.map}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  content: {
    paddingBottom: 32,
  },

  /* ================= HERO ================= */

  hero: {
    width: "100%",
    height: 270,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#dcecf7",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcecf7",
  },

  imageFallbackIcon: {
    fontSize: 72,
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    backgroundColor:
      "rgba(0,0,0,0.25)",
  },

  categoryBadge: {
    position: "absolute",
    left: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor:
      "rgba(0,0,0,0.65)",
  },

  categoryBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  /* ================= MAIN ================= */

  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
    color: "#171717",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  locationIcon: {
    fontSize: 16,
  },

  locationText: {
    marginLeft: 5,
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },

  /* ================= SECTION ================= */

  section: {
    marginTop: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#171717",
    marginBottom: 10,
  },

  /* ================= DESCRIPTION ================= */

  descriptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#edf0f2",
  },

  description: {
    color: "#555",
    fontSize: 15,
    lineHeight: 24,
  },

  /* ================= AUDIO ================= */

  audioCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#edf0f2",
  },

  audioIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5fc",
  },

  audioIcon: {
    fontSize: 23,
  },

  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },

  audioTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  audioDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },

  audioButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#168dcc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  audioButtonIcon: {
    color: "#fff",
    fontSize: 15,
    marginRight: 8,
  },

  audioButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  stopAudioButton: {
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#eef0f2",
    alignItems: "center",
    justifyContent: "center",
  },

  stopAudioButtonText: {
    color: "#444",
    fontSize: 14,
    fontWeight: "700",
  },

  /* ================= GPS ================= */

  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#edf0f2",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    color: "#777",
    fontSize: 14,
    fontWeight: "600",
  },

  infoValue: {
    color: "#222",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: "65%",
    textAlign: "right",
  },

  /* ================= CHECK-IN ================= */

  checkinCard: {
    marginTop: 22,
    backgroundColor: "#e7f8f3",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d4eee7",
  },

  checkinIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  checkinIcon: {
    fontSize: 21,
    fontWeight: "900",
    color: "#168c72",
  },

  checkinContent: {
    flex: 1,
    marginLeft: 12,
  },

  checkinTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#222",
  },

  checkinDescription: {
    marginTop: 4,
    color: "#667",
    fontSize: 13,
    lineHeight: 19,
  },

  /* ================= MAP ================= */

  mapButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  mapButtonIcon: {
    fontSize: 21,
  },

  mapButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "900",
    color: "#222",
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /* ================= NOT FOUND ================= */

  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
  },

  notFoundIcon: {
    fontSize: 48,
    marginBottom: 10,
  },

  notFoundText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "700",
  },
});