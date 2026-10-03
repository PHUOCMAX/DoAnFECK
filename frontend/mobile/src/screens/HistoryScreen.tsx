import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";

import { useEffect, useState } from "react";

import { useAppStore } from "../store/useAppStore";
import { usePoiStore } from "../store/usePoiStore";

import { getTranslations } from "../translations";

import {
  getCheckinHistory,
  type CheckinRecord,
} from "../services/checkinService";

export default function HistoryScreen() {
  const language = useAppStore(
    (state) => state.language
  );

  const user = useAppStore(
    (state) => state.user
  );

  const pois = usePoiStore(
    (state) => state.pois
  );

  const texts = getTranslations(language);
  const historyTexts = texts.history;

  const [history, setHistory] =
    useState<CheckinRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, [user?.id]);

  const loadHistory = async () => {
    if (!user?.id) {
      setHistory([]);
      return;
    }

    const data = await getCheckinHistory(
      user.id
    );

    setHistory(data);
  };

  const renderItem = ({
    item,
  }: {
    item: CheckinRecord;
  }) => {
    const poi = pois.find(
      (place) => place.id === item.poiId
    );

   const poiName = poi
  ? poi.name[language]
  : `POI #${item.poiId}`;

    const date = new Date(
      item.checkedInAt
    );

    return (
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>
            📍
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.poiName}>
            {poiName}
          </Text>

          <Text style={styles.date}>
            {date.toLocaleString()}
          </Text>

          <Text style={styles.coordinates}>
            {item.latitude.toFixed(6)},{" "}
            {item.longitude.toFixed(6)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            📍
          </Text>

          <Text style={styles.emptyTitle}>
            {historyTexts.emptyTitle}
          </Text>

          <Text style={styles.emptyDescription}>
            {historyTexts.emptyDescription}
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
  },

  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e5f7f5",
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: {
    fontSize: 22,
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  poiName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  date: {
    marginTop: 5,
    fontSize: 13,
    color: "#777",
  },

  coordinates: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#777",
    textAlign: "center",
  },
});