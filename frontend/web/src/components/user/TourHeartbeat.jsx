import { useEffect } from "react";

import {
  deviceHeaders,
  getTourAuthorization,
} from "../../services/userService";

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

const HEARTBEAT_MS = 60 * 1000;

/*
 * Báo cho backend "thiết bị này đang ở trong tour" mỗi 60 giây,
 * chỉ khi đã có quyền tour và tab đang hiển thị.
 * Dashboard admin đếm thiết bị có heartbeat trong 2 phút gần nhất.
 */
function sendHeartbeat() {
  if (
    document.visibilityState !== "visible" ||
    !getTourAuthorization()
  ) {
    return;
  }

  fetch(`${API_URL}/api/tour/heartbeat`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...deviceHeaders(),
    },
    keepalive: true,
  }).catch(() => {
    // Mất mạng thì bỏ qua, lần sau gửi lại.
  });
}

export default function TourHeartbeat() {
  useEffect(() => {
    sendHeartbeat();

    const timer = setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Vừa quay lại tab hoặc vừa được cấp quyền tour: báo ngay.
    document.addEventListener("visibilitychange", sendHeartbeat);
    window.addEventListener("tour-authorization-changed", sendHeartbeat);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sendHeartbeat);
      window.removeEventListener("tour-authorization-changed", sendHeartbeat);
    };
  }, []);

  return null;
}
