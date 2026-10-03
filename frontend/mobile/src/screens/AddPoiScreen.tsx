import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { PoiCategory } from "../../../../shared/types/poi";
import { ApiError, createPoiWithApi } from "../services/api";
import { useNativeLocation } from "../hooks/useNativeLocation";
import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";

const DEFAULT_RADIUS = "100";
const DEFAULT_CITY = "ho-chi-minh";

export default function AddPoiScreen() {
  const navigation = useNavigation<any>();
  const language = useAppStore((state) => state.language);
  const token = useAppStore((state) => state.token);
  const { location, loading: locationLoading } = useNativeLocation(true);
  const hasPrefilledLocation = useRef(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PoiCategory>("tourism");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [saving, setSaving] = useState(false);

  const texts = getTranslations(language).addPoi;

  useEffect(() => {
    if (!location || hasPrefilledLocation.current) {
      return;
    }

    setLatitude(location.latitude.toFixed(6));
    setLongitude(location.longitude.toFixed(6));
    hasPrefilledLocation.current = true;
  }, [location]);

  const useCurrentLocation = () => {
    if (!location) {
      Alert.alert(texts.location, texts.locationUnavailable);
      return;
    }

    setLatitude(location.latitude.toFixed(6));
    setLongitude(location.longitude.toFixed(6));
  };

  const savePoi = async () => {
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();

    if (!normalizedName || !normalizedDescription || !latitude.trim() || !longitude.trim()) {
      Alert.alert(texts.title, texts.missingFields);
      return;
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedRadius = Number(radius);

    if (
      !Number.isFinite(parsedLatitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      Alert.alert(texts.title, texts.invalidCoordinates);
      return;
    }

    if (
      !Number.isInteger(parsedRadius) ||
      parsedRadius < 10 ||
      parsedRadius > 1_000
    ) {
      Alert.alert(texts.title, texts.invalidRadius);
      return;
    }

    if (!token) {
      Alert.alert("Authentication", "Please sign in again before adding a place.");
      return;
    }

    try {
      setSaving(true);

      await createPoiWithApi(
        {
          name: {
            vi: normalizedName,
            en: normalizedName,
            zh: normalizedName,
          },
          description: {
            vi: normalizedDescription,
            en: normalizedDescription,
            zh: normalizedDescription,
          },
          city: DEFAULT_CITY,
          category,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          radius: parsedRadius,
          image: "",
          audio: {
            vi: "",
            en: "",
            zh: "",
          },
        },
        token
      );

      Alert.alert(texts.successTitle, texts.successMessage, [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("CREATE POI ERROR:", error);
      Alert.alert(
        texts.title,
        error instanceof ApiError
          ? error.message
          : "Could not save this place. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>{texts.translationHint}</Text>

        <Text style={styles.label}>{texts.name}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={texts.namePlaceholder}
          placeholderTextColor="#8b95a1"
          maxLength={150}
          editable={!saving}
          style={styles.input}
        />

        <Text style={styles.label}>{texts.description}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={texts.descriptionPlaceholder}
          placeholderTextColor="#8b95a1"
          maxLength={5000}
          multiline
          textAlignVertical="top"
          editable={!saving}
          style={[styles.input, styles.descriptionInput]}
        />

        <Text style={styles.label}>{texts.category}</Text>
        <View style={styles.categoryRow}>
          {(["tourism", "food"] as PoiCategory[]).map((item) => (
            <Pressable
              key={item}
              disabled={saving}
              onPress={() => setCategory(item)}
              style={[
                styles.categoryButton,
                category === item && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.categoryTextActive,
                ]}
              >
                {item === "tourism" ? texts.tourism : texts.food}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.locationHeader}>
          <Text style={styles.label}>{texts.location}</Text>
          <Pressable
            onPress={useCurrentLocation}
            disabled={saving || locationLoading}
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>{texts.useCurrentLocation}</Text>
          </Pressable>
        </View>

        <View style={styles.coordinateRow}>
          <View style={styles.coordinateField}>
            <Text style={styles.label}>{texts.latitude}</Text>
            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              placeholder="10.776889"
              placeholderTextColor="#8b95a1"
              keyboardType="decimal-pad"
              editable={!saving}
              style={styles.input}
            />
          </View>
          <View style={styles.coordinateField}>
            <Text style={styles.label}>{texts.longitude}</Text>
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="106.700806"
              placeholderTextColor="#8b95a1"
              keyboardType="decimal-pad"
              editable={!saving}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>{texts.radius}</Text>
        <TextInput
          value={radius}
          onChangeText={setRadius}
          placeholder={DEFAULT_RADIUS}
          placeholderTextColor="#8b95a1"
          keyboardType="number-pad"
          editable={!saving}
          style={styles.input}
        />

        <Pressable
          disabled={saving}
          onPress={savePoi}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? texts.saving : texts.save}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hint: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#eaf7ff",
    color: "#2176a5",
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    marginBottom: 8,
    color: "#2b3640",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 50,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d9e0e6",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    color: "#1f2933",
    fontSize: 16,
  },
  descriptionInput: {
    height: 130,
    paddingTop: 14,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  categoryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cfd8df",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  categoryButtonActive: {
    borderColor: "#168dcc",
    backgroundColor: "#eaf7ff",
  },
  categoryText: {
    color: "#52606d",
    fontWeight: "700",
  },
  categoryTextActive: {
    color: "#168dcc",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationButton: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#168dcc",
  },
  locationButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  coordinateRow: {
    flexDirection: "row",
    gap: 12,
  },
  coordinateField: {
    flex: 1,
  },
  saveButton: {
    minHeight: 54,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#168dcc",
  },
  saveButtonDisabled: {
    backgroundColor: "#9bcce6",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
