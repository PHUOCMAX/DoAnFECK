import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LANGUAGES } from "../../../../../shared/constants/languages";

type Props = {
  language: string;
  onSelect: (code: string) => void;
  label?: string;
};

export default function LanguageMenu({
  language,
  onSelect,
  label = "Language",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<View>(null);

  const current = LANGUAGES.find((item) => item.code === language);

  const getNativeName = (item: (typeof LANGUAGES)[number]) =>
    (item as { nativeName?: string }).nativeName;

  const getFlag = (item: (typeof LANGUAGES)[number]) =>
    (item as { flag?: string }).flag;

  const handleSelect = (code: string) => {
    onSelect(code);
    setOpen(false);
  };

  // Nếu language được đổi từ bên ngoài menu thì không giữ menu mở.
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
    // Chỉ cần chạy khi giá trị language thay đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return (
    <View ref={wrapperRef} style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      {/* Nút đóng/mở. Không làm thay đổi chiều cao header khi mở. */}
      <Pressable
        style={({ pressed }) => [
          styles.currentRow,
          pressed && styles.currentPressed,
        ]}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.globe}>🌐</Text>

        <Text style={styles.currentText} numberOfLines={1}>
          {(current &&
            (getNativeName(current) ?? current.name)) ??
            language.toUpperCase()}
        </Text>

        <Text style={styles.chevron}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>

      {open ? (
        <>
          {/* Vùng bắt click bên ngoài menu. */}
          <Pressable
            style={styles.outside}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close language menu"
          />

          {/* Absolute nên mở menu không kéo giãn header. */}
          <View style={styles.dropdown}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {LANGUAGES.map((item) => {
                const active = item.code === language;
                const nativeName =
                  getNativeName(item) ?? item.name;

                return (
                  <Pressable
                    key={item.code}
                    onPress={() => handleSelect(item.code)}
                    style={({ pressed }) => [
                      styles.item,
                      active && styles.itemActive,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <Text style={styles.flag}>
                      {getFlag(item) ?? "🌐"}
                    </Text>

                    <View style={styles.itemTextWrap}>
                      <Text
                        style={[
                          styles.itemName,
                          active && styles.itemNameActive,
                        ]}
                      >
                        {nativeName}
                      </Text>

                      {getNativeName(item) &&
                      item.name !== nativeName ? (
                        <Text style={styles.itemSubName}>
                          {item.name}
                        </Text>
                      ) : null}
                    </View>

                    {active ? (
                      <Text style={styles.check}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginTop: 14,
    zIndex: 100,
    position: "relative",
  },

  label: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  currentRow: {
    minHeight: 44,
    width: "100%",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
  },

  currentPressed: {
    opacity: 0.82,
  },

  globe: {
    fontSize: 18,
    marginRight: 8,
  },

  currentText: {
    flex: 1,
    color: "#168dcc",
    fontSize: 14,
    fontWeight: "800",
  },

  chevron: {
    color: "#168dcc",
    fontSize: 20,
    marginLeft: 8,
    width: 20,
    textAlign: "center",
  },

  /*
   * Dropdown nằm absolute:
   * - không chiếm thêm layout height
   * - không kéo giãn header
   * - chỉ phần ScrollView bên trong mới cuộn
   */
  dropdown: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 110,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },

  scroll: {
    maxHeight: 220,
  },

  list: {
    paddingVertical: 4,
  },

  item: {
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  itemActive: {
    backgroundColor: "#eaf7ff",
  },

  itemPressed: {
    opacity: 0.7,
  },

  flag: {
    width: 30,
    fontSize: 19,
  },

  itemTextWrap: {
    flex: 1,
  },

  itemName: {
    color: "#222",
    fontSize: 14,
    fontWeight: "700",
  },

  itemNameActive: {
    color: "#168dcc",
  },

  itemSubName: {
    color: "#888",
    fontSize: 11,
    marginTop: 1,
  },

  check: {
    color: "#168dcc",
    fontSize: 18,
    fontWeight: "900",
  },

  /*
   * Full-screen transparent touch target.
   * Menu nằm trên nó nhờ zIndex/elevation.
   */
  outside: {
    position: "absolute",
    top: 70,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 90,
  },
});
