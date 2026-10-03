import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";

import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";

export default function ProfileScreen() {
  const user = useAppStore((state) => state.user);
  const language = useAppStore((state) => state.language);

  const texts = getTranslations(language);
  const common = texts.common;

  return (
    <View style={styles.container}>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          👤
        </Text>
      </View>

      <Text style={styles.name}>
        {user?.name || "User"}
      </Text>

      <Text style={styles.email}>
        {user?.email || ""}
      </Text>

      <View style={styles.card}>

        <View style={styles.row}>
          <Text style={styles.label}>
            Tên
          </Text>

          <Text style={styles.value}>
            {user?.name || "-"}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>
            Email
          </Text>

          <Text style={styles.value}>
            {user?.email || "-"}
          </Text>
        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#66b9ee",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 48,
  },

  name: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
  },

  email: {
    marginTop: 5,
    fontSize: 14,
    color: "#777",
  },

  card: {
    width: "100%",
    marginTop: 30,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  label: {
    fontSize: 15,
    color: "#777",
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    maxWidth: "65%",
  },

  divider: {
    height: 1,
    backgroundColor: "#eeeeee",
  },
});