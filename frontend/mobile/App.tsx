import { useState, useEffect } from "react";

import {
  NavigationContainer,
  useNavigation,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import HomeScreen from "./src/screens/HomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import PoiDetailScreen from "./src/screens/PoiDetailScreen";
import MapScreen from "./src/screens/MapScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import AddPoiScreen from "./src/screens/AddPoiScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ChatScreen from "./src/screens/ChatScreen";

import { useAppStore } from "./src/store/useAppStore";
import { usePoiStore } from "./src/store/usePoiStore";
import { getTranslations } from "./src/translations";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  History: undefined;

  PoiDetail: {
    poiId: number;
    autoPlay?: boolean;
  };

  Map: {
    poiId?: number;
  };

  Register: undefined;
  Profile: undefined;
  AddPoi: undefined;
  Chat: undefined;
  ScanQR: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

/* =========================================================
   SCAN QR SCREEN
========================================================= */
type PaymentMethod = "online" | "offline";

function ScanQRScreen() {
  const navigation = useNavigation<any>();

  const token = useAppStore(
    (state) => state.token
  );

  const [permission, requestPermission] =
    useCameraPermissions();

  const [scanned, setScanned] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [paymentRequired, setPaymentRequired] =
    useState(false);

  const [paymentSession, setPaymentSession] =
    useState<{
      id: number;
      price: number;
      currency: string;
    } | null>(null);

  const [payment, setPayment] =
    useState<any>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("online");

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [paymentError, setPaymentError] =
    useState("");

  const [pendingQrToken, setPendingQrToken] =
    useState("");

  const API_URL = (
    process.env.EXPO_PUBLIC_API_URL ||
    "http://192.168.1.42:5001"
  ).replace(/\/+$/, "");

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      void requestPermission();
    }
  }, [
    permission,
    requestPermission,
  ]);

  const resetScanner = () => {
    setScanned(false);
    setProcessing(false);

    setPaymentRequired(false);
    setPaymentSession(null);
    setPayment(null);
    setPaymentMethod("online");
    setPaymentLoading(false);
    setPaymentError("");
    setPendingQrToken("");
  };

  const authorizeSession = async (
    qrToken: string
  ) => {
    if (!token) {
      Alert.alert(
        "Phiên đăng nhập",
        "Vui lòng đăng nhập lại."
      );

      navigation.replace("Login");
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch(
        `${API_URL}/api/sessions/authorize`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            qrToken,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      console.log(
        "QR AUTH RESPONSE:",
        response.status,
        data
      );

      // =========================
      // CẦN THANH TOÁN
      // =========================
      if (
        response.status === 402 &&
        data?.paymentRequired
      ) {
        setPaymentRequired(true);
        setPaymentSession(
          data?.session
            ? {
                id: Number(data.session.id),
                price: Number(
                  data.session.price || 0
                ),
                currency:
                  data.session.currency || "VND",
              }
            : null
        );

        const existingPayment = data?.payment || null;

        setPayment(existingPayment);

        if (
          existingPayment?.method === "online" ||
          existingPayment?.method === "offline"
        ) {
          setPaymentMethod(existingPayment.method);
        } else {
          setPaymentMethod("online");
        }

        setPendingQrToken(qrToken);
        setPaymentError("");
        setProcessing(false);

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Không thể xác thực QR."
        );
      }

      const authorization =
        data?.authorization;

      const session =
        data?.session;

      if (
        authorization?.status !== "active"
      ) {
        throw new Error(
          "Authorization chưa ở trạng thái active."
        );
      }

      setPaymentRequired(false);
      setPaymentSession(null);
      setPayment(null);
      setPendingQrToken("");

      Alert.alert(
        "Vào tour thành công",
        session?.name
          ? `Bạn đã được cấp quyền vào "${session.name}".`
          : "Bạn đã được cấp quyền vào session.",
        [
          {
            text: "Vào tour",
            onPress: () => {
              navigation.replace("Home");
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        "QR AUTH ERROR:",
        error
      );

      setProcessing(false);

      Alert.alert(
        "Không thể vào tour",
        error instanceof Error
          ? error.message
          : "Không thể xác thực QR.",
        [
          {
            text: "Quét lại",
            onPress: resetScanner,
          },
        ]
      );
    }
  };

  // =========================
  // TẠO PAYMENT
  // =========================

  const createPayment = async () => {
    if (
      !token ||
      !paymentSession?.id
    ) {
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");

      const response = await fetch(
        `${API_URL}/api/payments`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId:
              paymentSession.id,
            method: paymentMethod,
            note:
              paymentMethod === "online"
                ? "Thanh toán online để vào tour"
                : "Thanh toán tiền mặt tại quầy để vào tour",
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Không thể tạo yêu cầu thanh toán."
        );
      }

      setPayment(
        data?.payment || null
      );

      if (
        data?.payment?.status ===
        "paid"
      ) {
        await authorizeSession(
          pendingQrToken
        );
        return;
      }
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Không thể tạo yêu cầu thanh toán."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // =========================
  // TỰ KIỂM TRA PAYMENT
  // =========================

  useEffect(() => {
    if (
      !paymentRequired ||
      !paymentSession?.id ||
      !token ||
      !pendingQrToken
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<
      typeof setTimeout
    > | null = null;

    const checkPayment = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/payments/${paymentSession.id}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response
          .json()
          .catch(() => null);

        if (
          !response.ok
        ) {
          throw new Error(
            data?.message ||
              "Không thể kiểm tra thanh toán."
          );
        }

        if (cancelled) {
          return;
        }

        const currentPayment =
          data?.payment || null;

        setPayment(
          currentPayment
        );

        if (
          currentPayment?.method === "online" ||
          currentPayment?.method === "offline"
        ) {
          setPaymentMethod(currentPayment.method);
        }

        // =========================
        // ĐÃ THANH TOÁN
        // =========================

        if (
          currentPayment?.status ===
          "paid"
        ) {
          setPaymentRequired(false);
          setPaymentLoading(false);
          setProcessing(true);

          try {
            const authResponse =
              await fetch(
                `${API_URL}/api/sessions/authorize`,
                {
                  method: "POST",
                  headers: {
                    Accept:
                      "application/json",
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    qrToken:
                      pendingQrToken,
                  }),
                }
              );

            const authData =
              await authResponse
                .json()
                .catch(() => null);

            if (!authResponse.ok) {
              throw new Error(
                authData?.message ||
                  "Thanh toán thành công nhưng không thể vào tour."
              );
            }

            const authorization =
              authData?.authorization;

            const session =
              authData?.session;

            if (
              authorization?.status !==
              "active"
            ) {
              throw new Error(
                "Authorization chưa ở trạng thái active."
              );
            }

            setPendingQrToken("");

            Alert.alert(
              "Thanh toán thành công",
              session?.name
                ? `Bạn đã thanh toán và được cấp quyền vào "${session.name}".`
                : "Bạn đã thanh toán và được cấp quyền vào tour.",
              [
                {
                  text: "Vào tour",
                  onPress: () => {
                    navigation.replace(
                      "Home"
                    );
                  },
                },
              ]
            );
          } catch (error) {
            Alert.alert(
              "Không thể vào tour",
              error instanceof Error
                ? error.message
                : "Không thể xác thực quyền vào tour."
            );

            setProcessing(false);
            setPaymentRequired(true);
          }

          return;
        }
      } catch (error) {
        console.warn(
          "PAYMENT CHECK ERROR:",
          error
        );
      }

      if (!cancelled) {
        timer = setTimeout(
          checkPayment,
          2500
        );
      }
    };

    void checkPayment();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    paymentRequired,
    paymentSession?.id,
    token,
    pendingQrToken,
  ]);

  const handleBarcodeScanned = ({
    data,
  }: {
    data: string;
  }) => {
    if (
      scanned ||
      processing
    ) {
      return;
    }

    if (
      typeof data !== "string" ||
      !data.trim()
    ) {
      return;
    }

    setScanned(true);

    void authorizeSession(
      data.trim()
    );
  };

  if (!permission) {
    return (
      <View
        style={styles.scanCenter}
      >
        <Text
          style={
            styles.scanLoadingText
          }
        >
          Đang kiểm tra quyền camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={
          styles.scanPermissionContainer
        }
      >
        <Text
          style={
            styles.scanPermissionTitle
          }
        >
          Cần quyền Camera
        </Text>

        <Text
          style={
            styles.scanPermissionText
          }
        >
          Cho phép camera để quét
          QR và tham gia tour.
        </Text>

        {permission.canAskAgain ? (
          <Pressable
            style={
              styles.scanPermissionButton
            }
            onPress={() =>
              void requestPermission()
            }
          >
            <Text
              style={
                styles.scanPermissionButtonText
              }
            >
              Cho phép Camera
            </Text>
          </Pressable>
        ) : (
          <Text
            style={
              styles.scanPermissionText
            }
          >
            Camera đã bị từ chối.
            Hãy bật quyền Camera
            trong phần Cài đặt của
            thiết bị.
          </Text>
        )}
      </View>
    );
  }

  // =========================
  // PAYMENT SCREEN
  // =========================

  if (
    paymentRequired &&
    paymentSession
  ) {
    const isPending =
      payment?.status ===
      "pending";

    const isPaid =
      payment?.status === "paid";

    return (
      <View
        style={
          styles.paymentContainer
        }
      >
        <View
          style={
            styles.paymentCard
          }
        >
          <Text
            style={
              styles.paymentTitle
            }
          >
            Thanh toán để vào tour
          </Text>

          <Text
            style={
              styles.paymentDescription
            }
          >
            Phiên tham quan này yêu
            cầu thanh toán trước khi
            cấp quyền vào tour.
          </Text>

          <View
            style={
              styles.paymentAmountBox
            }
          >
            <Text
              style={
                styles.paymentAmountLabel
              }
            >
              Số tiền
            </Text>

            <Text
              style={
                styles.paymentAmountValue
              }
            >
              {Number(
                paymentSession.price || 0
              ).toLocaleString(
                "vi-VN"
              )}{" "}
              ₫
            </Text>
          </View>

          {/* =========================
              PAYMENT METHOD
          ========================= */}
          <View style={styles.paymentMethodSection}>
            <Text style={styles.paymentMethodTitle}>
              Chọn phương thức thanh toán
            </Text>

            <Pressable
              style={[
                styles.paymentMethodCard,
                paymentMethod === "online" &&
                  styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod("online")}
              disabled={isPending || isPaid || paymentLoading}
            >
              <View style={styles.paymentMethodTextWrap}>
                <Text style={styles.paymentMethodName}>
                  Thanh toán online
                </Text>
                <Text style={styles.paymentMethodDescription}>
                  Payoo / cổng thanh toán trực tuyến
                </Text>
              </View>

              <View
                style={[
                  styles.paymentRadio,
                  paymentMethod === "online" &&
                    styles.paymentRadioActive,
                ]}
              />
            </Pressable>

            <Pressable
              style={[
                styles.paymentMethodCard,
                paymentMethod === "offline" &&
                  styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod("offline")}
              disabled={isPending || isPaid || paymentLoading}
            >
              <View style={styles.paymentMethodTextWrap}>
                <Text style={styles.paymentMethodName}>
                  Thanh toán tại quầy
                </Text>
                <Text style={styles.paymentMethodDescription}>
                  Tiền mặt / Admin xác nhận thanh toán
                </Text>
              </View>

              <View
                style={[
                  styles.paymentRadio,
                  paymentMethod === "offline" &&
                    styles.paymentRadioActive,
                ]}
              />
            </Pressable>
          </View>

          {payment?.transaction_code && (
            <View
              style={
                styles.paymentInfoBox
              }
            >
              <Text
                style={
                  styles.paymentInfoLabel
                }
              >
                Mã giao dịch
              </Text>

              <Text
                style={
                  styles.paymentInfoValue
                }
              >
                {payment.transaction_code}
              </Text>
            </View>
          )}

          {isPaid ? (
            <Text
              style={
                styles.paymentStatusSuccess
              }
            >
              Thanh toán đã hoàn tất.
              Đang cấp quyền vào tour...
            </Text>
          ) : isPending ? (
            <Text
              style={
                styles.paymentStatusPending
              }
            >
              Đang chờ Admin xác nhận
              thanh toán...
            </Text>
          ) : (
            <Pressable
              style={
                styles.paymentButton
              }
              onPress={
                createPayment
              }
              disabled={
                paymentLoading
              }
            >
              <Text
                style={
                  styles.paymentButtonText
                }
              >
                {paymentLoading
                  ? "Đang tạo yêu cầu..."
                  : paymentMethod === "online"
                    ? "Thanh toán online"
                    : "Đăng ký thanh toán tiền mặt"}
              </Text>
            </Pressable>
          )}

          {paymentError ? (
            <Text
              style={
                styles.paymentError
              }
            >
              {paymentError}
            </Text>
          ) : null}

          <Text
            style={
              styles.paymentDemoText
            }
          >
            {paymentMethod === "online"
              ? "Thanh toán online hiện đang ở chế độ demo, chưa kết nối cổng Payoo thật. Sau khi payment được xác nhận là paid, ứng dụng sẽ tự động cấp quyền vào tour."
              : "Thanh toán tiền mặt được ghi nhận là pending. Sau khi Admin xác nhận đã thu tiền, ứng dụng sẽ tự động cấp quyền vào tour."}
          </Text>

          <Pressable
            style={
              styles.paymentSecondaryButton
            }
            onPress={
              resetScanner
            }
          >
            <Text
              style={
                styles.paymentSecondaryButtonText
              }
            >
              Quét QR khác
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={
        styles.scanContainer
      }
    >
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : handleBarcodeScanned
        }
      />

      <View
        style={
          styles.scanOverlay
        }
      >
        <View
          style={
            styles.scanHeader
          }
        >
          <Text
            style={
              styles.scanTitle
            }
          >
            Quét QR
          </Text>

          <Text
            style={
              styles.scanSubtitle
            }
          >
            Đưa mã QR vào khung để
            tham gia tour
          </Text>
        </View>

        <View
          style={
            styles.scanFrame
          }
        >
          <View
            style={[
              styles.corner,
              styles.cornerTopLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerTopRight,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerBottomLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerBottomRight,
            ]}
          />
        </View>

        <View
          style={
            styles.scanBottom
          }
        >
          {processing ? (
            <Text
              style={
                styles.scanProcessingText
              }
            >
              Đang xác thực QR...
            </Text>
          ) : scanned ? (
            <Pressable
              style={
                styles.scanRetryButton
              }
              onPress={
                resetScanner
              }
            >
              <Text
                style={
                  styles.scanRetryButtonText
                }
              >
                Quét lại
              </Text>
            </Pressable>
          ) : (
            <Text
              style={
                styles.scanHint
              }
            >
              Đặt QR chính giữa khung
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const language = useAppStore(
    (state) => state.language
  );

  const initialized = useAppStore(
    (state) => state.initialized
  );

  const isLoggedIn = useAppStore(
    (state) => state.isLoggedIn
  );

  const token = useAppStore(
    (state) => state.token
  );

  const loadLanguage = useAppStore(
    (state) => state.loadLanguage
  );

  const loadPois = usePoiStore(
    (state) => state.loadPois
  );

  const resetPois = usePoiStore(
    (state) => state.resetPois
  );

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (
      !isLoggedIn ||
      !token
    ) {
      resetPois();
      return;
    }

    void loadPois(token).catch(
      (error) => {
        console.warn(
          "Failed to load POIs:",
          error
        );
      }
    );
  }, [
    initialized,
    isLoggedIn,
    token,
    loadPois,
    resetPois,
  ]);

  const texts =
    getTranslations(language);

  if (!initialized) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: "",
        }}
      >
        {!isLoggedIn ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Register"
              component={
                RegisterScreen
              }
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="History"
              component={
                HistoryScreen
              }
              options={{
                title:
                  texts.history.title,
              }}
            />

            <Stack.Screen
              name="Profile"
              component={
                ProfileScreen
              }
              options={{
                title:
                  texts.common.profile,
              }}
            />

            <Stack.Screen
              name="AddPoi"
              component={
                AddPoiScreen
              }
              options={{
                title:
                  texts.addPoi.title,
              }}
            />

            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title:
                  "AI Tour Guide",
              }}
            />

            <Stack.Screen
              name="ScanQR"
              component={
                ScanQRScreen
              }
              options={{
                title: "Quét QR",
              }}
            />

            <Stack.Screen
              name="PoiDetail"
              component={
                PoiDetailScreen
              }
              options={{
                title:
                  texts.common
                    .viewDetail,
              }}
            />

            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{
                title:
                  texts.common.map,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    scanContainer: {
      flex: 1,
      backgroundColor:
        "#000000",
    },

    camera: {
      flex: 1,
    },

  scanOverlay: {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  justifyContent: "space-between",
},

    scanHeader: {
      paddingTop: 70,
      paddingHorizontal: 24,
      alignItems:
        "center",
    },

    scanTitle: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "900",
    },

    scanSubtitle: {
      marginTop: 8,
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },

    scanFrame: {
      alignSelf: "center",
      width: 250,
      height: 250,
      position:
        "relative",
    },

    corner: {
      position: "absolute",
      width: 42,
      height: 42,
      borderColor:
        "#FFFFFF",
    },

    cornerTopLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 5,
      borderLeftWidth: 5,
    },

    cornerTopRight: {
      top: 0,
      right: 0,
      borderTopWidth: 5,
      borderRightWidth: 5,
    },

    cornerBottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 5,
      borderLeftWidth: 5,
    },

    cornerBottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 5,
      borderRightWidth: 5,
    },

    scanBottom: {
      paddingHorizontal: 24,
      paddingBottom: 50,
      alignItems:
        "center",
    },

    scanHint: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      backgroundColor:
        "rgba(0,0,0,0.55)",
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      overflow:
        "hidden",
    },

    scanProcessingText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
      backgroundColor:
        "rgba(0,0,0,0.55)",
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      overflow:
        "hidden",
    },

    scanRetryButton: {
      backgroundColor:
        "#168DCC",
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 14,
    },

    scanRetryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },

    scanCenter: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    scanLoadingText: {
      color: "#555555",
      fontSize: 14,
      fontWeight: "600",
    },

    scanPermissionContainer: {
      flex: 1,
      padding: 28,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    scanPermissionTitle: {
      fontSize: 24,
      fontWeight: "900",
      color: "#171717",
      marginBottom: 10,
    },

    scanPermissionText: {
      color: "#666666",
      fontSize: 14,
      lineHeight: 21,
      textAlign:
        "center",
      marginBottom: 20,
    },

    scanPermissionButton: {
      backgroundColor:
        "#168DCC",
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 14,
    },

    scanPermissionButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
      
    },
    paymentContainer: {
  flex: 1,
  backgroundColor: "#F5F7FA",
  paddingHorizontal: 20,
  justifyContent: "center",
},

paymentCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  padding: 22,
  shadowColor: "#000000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
},

paymentTitle: {
  fontSize: 25,
  fontWeight: "900",
  color: "#171717",
  textAlign: "center",
},

paymentDescription: {
  marginTop: 10,
  color: "#666666",
  fontSize: 14,
  lineHeight: 21,
  textAlign: "center",
},

paymentAmountBox: {
  marginTop: 22,
  padding: 18,
  borderRadius: 18,
  backgroundColor: "#F0F7FF",
  alignItems: "center",
},

paymentAmountLabel: {
  color: "#666666",
  fontSize: 13,
  fontWeight: "700",
},

paymentAmountValue: {
  marginTop: 6,
  color: "#168DCC",
  fontSize: 30,
  fontWeight: "900",
},

paymentInfoBox: {
  marginTop: 14,
  padding: 14,
  borderRadius: 14,
  backgroundColor: "#F5F5F5",
},

paymentInfoLabel: {
  color: "#777777",
  fontSize: 12,
  fontWeight: "700",
},

paymentInfoValue: {
  marginTop: 5,
  color: "#222222",
  fontSize: 12,
  fontWeight: "800",
},

paymentMethodSection: {
  marginTop: 20,
},

paymentMethodTitle: {
  fontSize: 14,
  fontWeight: "900",
  color: "#171717",
  marginBottom: 10,
},

paymentMethodCard: {
  minHeight: 72,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#E1E5EA",
  borderRadius: 16,
  backgroundColor: "#FFFFFF",
},

paymentMethodCardActive: {
  borderColor: "#168DCC",
  backgroundColor: "#F0F7FF",
},

paymentMethodTextWrap: {
  flex: 1,
  paddingRight: 12,
},

paymentMethodName: {
  color: "#171717",
  fontSize: 14,
  fontWeight: "900",
},

paymentMethodDescription: {
  marginTop: 4,
  color: "#777777",
  fontSize: 12,
  lineHeight: 17,
},

paymentRadio: {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: "#B8BEC7",
},

paymentRadioActive: {
  borderWidth: 6,
  borderColor: "#168DCC",
},

paymentButton: {
  marginTop: 18,
  backgroundColor: "#168DCC",
  paddingVertical: 15,
  borderRadius: 14,
  alignItems: "center",
},

paymentButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "900",
},

paymentStatusPending: {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  backgroundColor: "#FFF7E6",
  color: "#9A6700",
  fontSize: 14,
  lineHeight: 21,
  fontWeight: "800",
  textAlign: "center",
},

paymentStatusSuccess: {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  backgroundColor: "#EAF8EF",
  color: "#18794E",
  fontSize: 14,
  lineHeight: 21,
  fontWeight: "800",
  textAlign: "center",
},

paymentError: {
  marginTop: 12,
  color: "#C62828",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "center",
  fontWeight: "700",
},

paymentDemoText: {
  marginTop: 16,
  color: "#888888",
  fontSize: 12,
  lineHeight: 18,
  textAlign: "center",
},

paymentSecondaryButton: {
  marginTop: 16,
  paddingVertical: 12,
  alignItems: "center",
},

paymentSecondaryButtonText: {
  color: "#666666",
  fontSize: 14,
  fontWeight: "800",
},
  });