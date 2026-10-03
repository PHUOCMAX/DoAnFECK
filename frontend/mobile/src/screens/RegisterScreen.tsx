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
import { ApiError, registerWithApi } from "../services/api";

export default function RegisterScreen() {
  const navigation = useNavigation<any>();

  const login = useAppStore(
    (state) => state.login
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ thông tin."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Mật khẩu không hợp lệ",
        "Mật khẩu phải có ít nhất 8 ký tự."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Mật khẩu không khớp",
        "Vui lòng nhập lại mật khẩu."
      );
      return;
    }

    try {
      setLoading(true);

      await registerWithApi({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      /*
       * Backend Register hiện tại trả user
       * nhưng chưa trả JWT.
       *
       * Vì vậy sau khi đăng ký thành công,
       * quay về Login để người dùng đăng nhập.
       */

      Alert.alert(
        "Đăng ký thành công",
        "Tài khoản đã được tạo. Vui lòng đăng nhập.",
        [
          {
            text: "Đăng nhập",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      Alert.alert(
        error instanceof ApiError && error.status && error.status < 500
          ? "Đăng ký thất bại"
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
          Tạo tài khoản
        </Text>

        <Text style={styles.subtitle}>
          Bắt đầu hành trình khám phá
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>
          Họ và tên
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nhập họ và tên"
          placeholderTextColor="#999"
          style={styles.input}
          editable={!loading}
        />

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

        <Text style={styles.label}>
          Xác nhận mật khẩu
        </Text>

        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#999"
          secureTextEntry
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.registerButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.registerButtonText}>
            {loading
              ? "Đang tạo tài khoản..."
              : "Đăng ký"}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>
            Đã có tài khoản?
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.loginLink}>
              Đăng nhập
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
    marginBottom: 28,
  },

  logo: {
    fontSize: 48,
    marginBottom: 10,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#222",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    color: "#777",
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
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#222",
    marginBottom: 14,
  },

  registerButton: {
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

  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },

  loginText: {
    color: "#777",
    fontSize: 14,
  },

  loginLink: {
    color: "#2196f3",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },
});
