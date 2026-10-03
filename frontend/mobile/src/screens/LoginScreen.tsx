import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";

import { useAppStore } from "../store/useAppStore";
import { ApiError, loginWithApi } from "../services/api";

export default function LoginScreen() {
  const navigation = useNavigation<any>();

  const login = useAppStore(
    (state) => state.login
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập email và mật khẩu."
      );
      return;
    }

    try {
      setLoading(true);

      const data = await loginWithApi({
        email: email.trim(),
        password,
      });

      await login(data.user, data.token);

      navigation.replace("Home");
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      Alert.alert(
        error instanceof ApiError && error.status && error.status < 500
          ? "Đăng nhập thất bại"
          : "Không thể kết nối",
        error instanceof ApiError
          ? error.message
          : "Không thể kết nối đến máy chủ."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          🌏
        </Text>

        <Text style={styles.title}>
          Multilingual Tour Guide
        </Text>

        <Text style={styles.subtitle}>
          Đăng nhập để bắt đầu hành trình
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Nhập email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.label}>
          Mật khẩu
        </Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#999"
          secureTextEntry
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>
            Chưa có tài khoản?
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Register")
            }
            disabled={loading}
          >
            <Text style={styles.registerLink}>
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "center",
    marginBottom: 35,
  },

  logo: {
    fontSize: 52,
    marginBottom: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },

  form: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#222",
    marginBottom: 17,
  },

  loginButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#2196f3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  registerText: {
    color: "#777",
    fontSize: 14,
  },

  registerLink: {
    color: "#2196f3",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },
});
