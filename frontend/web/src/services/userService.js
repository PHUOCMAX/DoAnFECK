/* =========================================================
   API CONFIG
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

console.log("API_URL =", API_URL);
/* =========================================================
   DEVICE ID
   Du khách không cần đăng nhập: mỗi trình duyệt có một mã thiết bị
   ngẫu nhiên, lưu trong localStorage, gửi kèm mọi request.
========================================================= */

const DEVICE_ID_KEY = "device_id";

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Dự phòng cho trình duyệt cũ / trang không chạy HTTPS.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId() {
  let id = null;

  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    // localStorage bị chặn: dùng mã tạm cho phiên này.
  }

  if (!id) {
    id = createUuid();

    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      // bỏ qua
    }
  }

  return id;
}

/*
 * Ngân hàng đưa khách về một trình duyệt khác với trình duyệt đã thanh toán
 * (ví dụ quét QR bằng Zalo, quay về Safari): đổi mã ký từ backend lấy mã
 * thiết bị đã trả tiền, để trình duyệt này dùng tiếp quyền tour.
 */
export async function claimDeviceTransfer(token) {
  const response = await fetch(`${API_URL}/api/device/claim`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.deviceId) {
    return null;
  }

  try {
    localStorage.setItem(DEVICE_ID_KEY, data.deviceId);
  } catch {
    // bỏ qua
  }

  return data.deviceId;
}

export function deviceHeaders() {
  return { "X-Device-Id": getDeviceId() };
}

/* =========================================================
   GENERIC REQUEST
========================================================= */

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...deviceHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("API CONNECTION ERROR:", error);

    throw new Error(
      `Không thể kết nối tới máy chủ API: ${API_URL}`
    );
  }

  const text = await response.text();

  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu không hợp lệ."
    );
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        `Yêu cầu thất bại (${response.status}).`
    );
  }

  return body;
}

/* =========================================================
   USER SESSION
========================================================= */

export function getUserToken() {
  return localStorage.getItem("user_token");
}

export function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user_user") || "null"
    );
  } catch {
    return null;
  }
}

export function saveUserSession(token, user) {
  /*
   * Không xóa tour_authorization ở đây.
   *
   * getTourAuthorization() sẽ kiểm tra
   * authorization có thuộc đúng user hiện tại hay không.
   */
  localStorage.removeItem(
    "pending_tour_payment"
  );

  localStorage.setItem(
    "user_token",
    token
  );

  localStorage.setItem(
    "user_user",
    JSON.stringify(user)
  );

  window.dispatchEvent(
    new Event("user-session-changed")
  );

  
}

export function clearUserSession() {
  localStorage.removeItem(
    "user_token"
  );

  localStorage.removeItem(
    "user_user"
  );

  /*
   * Không xóa tour_authorization.
   *
   * Tour authorization được giữ lại để user
   * có thể đăng nhập lại và tiếp tục tour.
   */
  localStorage.removeItem(
    "pending_tour_payment"
  );

  window.dispatchEvent(
    new Event("user-session-changed")
  );

  
}

/* =========================================================
   AUTH
========================================================= */

export function loginUser(
  email,
  password
) {
  return request(
    "/api/auth/login",
    {
      method: "POST",

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );
}

export function registerUser(
  name,
  email,
  password
) {
  return request(
    "/api/auth/register",
    {
      method: "POST",

      body: JSON.stringify({
        name,
        email,
        password,
      }),
    }
  );
}

export function getCurrentUser() {
  const token =
    getUserToken();

  if (!token) {
    return Promise.reject(
      new Error(
        "Bạn chưa đăng nhập."
      )
    );
  }

  return request(
    "/api/auth/me",
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}

/* =========================================================
   POI
========================================================= */


export function getPois() {
  return request("/api/pois", {
    method: "GET",
  });
}


export function createPoi(poi) {
  return request(
    "/api/pois",
    {
      method: "POST",

      body: JSON.stringify(poi),
    }
  );
}

export function resolveAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (
    /^https?:\/\//i.test(path)
  ) {
    return path;
  }

  return `${API_URL}${
    path.startsWith("/")
      ? path
      : `/${path}`
  }`;
}

/* =========================================================
   CHECK-IN
========================================================= */

export function createCheckin({
  poiId,
  latitude,
  longitude,
}) {
  return request(
    "/api/checkins",
    {
      method: "POST",

      body: JSON.stringify({
        poiId,
        latitude,
        longitude,
      }),
    }
  );
}

export function getMyCheckins(
  limit = 50
) {
  return request(
    `/api/checkins?limit=${limit}`,
    {
      method: "GET",
    }
  );
}

/* =========================================================
   TOUR AUTHORIZATION
========================================================= */

export function getTourAuthorization() {
  const raw =
    localStorage.getItem(
      "tour_authorization"
    );

  if (!raw) {
    return null;
  }

  try {
    const authorization =
      JSON.parse(raw);

    if (!authorization) {
      return null;
    }

    // Quyền tour thuộc về thiết bị này; mã thiết bị khác thì bỏ.
    if (
      authorization.deviceId &&
      authorization.deviceId !== getDeviceId()
    ) {
      localStorage.removeItem(
        "tour_authorization"
      );

      return null;
    }

    /*
     * Kiểm tra thời gian hết hạn.
     */
    const expiresAt =
      authorization.expiresAt ||
      authorization.session?.expiresAt;

    if (
      expiresAt &&
      new Date(expiresAt) <=
        new Date()
    ) {
      localStorage.removeItem(
        "tour_authorization"
      );

      window.dispatchEvent(
        new Event(
          "tour-authorization-changed"
        )
      );

      return null;
    }

    return authorization;
  } catch {
    localStorage.removeItem(
      "tour_authorization"
    );

    return null;
  }
}

export function saveTourAuthorization(
  authorization,
  session = null
) {
  const payload = {
    ...authorization,

    session:
      session ||
      authorization?.session ||
      null,

    savedAt:
      new Date().toISOString(),
  };

  localStorage.setItem(
    "tour_authorization",
    JSON.stringify(payload)
  );

  window.dispatchEvent(
    new Event(
      "tour-authorization-changed"
    )
  );
}

export function clearTourAuthorization() {
  localStorage.removeItem(
    "tour_authorization"
  );

  window.dispatchEvent(
    new Event(
      "tour-authorization-changed"
    )
  );
}

export async function getMySessionAuthorizations() {
  return request("/api/sessions/my-authorizations", {
    method: "GET",
  });
}


/* =========================================================
   QR AUTHORIZATION
========================================================= */

export async function authorizeSessionByQr(
  qrToken
) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/api/sessions/authorize`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          ...deviceHeaders(),
        },

        body: JSON.stringify({
          qrToken,
        }),
      }
    );
  } catch (error) {
    console.error(
      "QR AUTH CONNECTION ERROR:",
      error
    );

    throw new Error(
      `Không thể kết nối tới máy chủ API: ${API_URL}`
    );
  }

  const rawBody =
    await response.text();

  let data = null;

  try {
    data = rawBody
      ? JSON.parse(rawBody)
      : null;
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu QR không hợp lệ."
    );
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

/* =========================================================
   PAYMENT
========================================================= */

export function createTourPayment({
  sessionId,
  method,
  note = "Thanh toán vào tour",
}) {
  return request(
    "/api/payments",
    {
      method: "POST",

      body: JSON.stringify({
        sessionId,
        method,
        note,
      }),
    }
  );
}

export function getTourPayment(
  sessionId
) {
  return request(
    `/api/payments/${sessionId}`,
    {
      method: "GET",
    }
  );
}

export function setDemoTourPaymentResult({
  paymentId,
  status,
}) {
  return request(
    `/api/payments/${paymentId}/demo-result`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    }
  );
}


/* =========================================================
   PENDING PAYMENT
========================================================= */

export function getPendingTourPayment() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "pending_tour_payment"
      ) || "null"
    );
  } catch {
    return null;
  }
}

export function savePendingTourPayment(
  payload
) {
  localStorage.setItem(
    "pending_tour_payment",
    JSON.stringify(payload)
  );
}

export function clearPendingTourPayment() {
  localStorage.removeItem(
    "pending_tour_payment"
  );
}