/* =========================================================
   API CONFIG
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://doanfeck.onrender.com"
    : "")
).replace(/\/+$/, "");

console.log("API_URL =", API_URL);
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
   * User mới không được kế thừa
   * tour authorization của user trước.
   */
  localStorage.removeItem(
    "tour_authorization"
  );

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

  window.dispatchEvent(
    new Event("tour-authorization-changed")
  );
}

export function clearUserSession() {
  localStorage.removeItem(
    "user_token"
  );

  localStorage.removeItem(
    "user_user"
  );

  localStorage.removeItem(
    "tour_authorization"
  );

  localStorage.removeItem(
    "pending_tour_payment"
  );

  window.dispatchEvent(
    new Event("user-session-changed")
  );

  window.dispatchEvent(
    new Event("tour-authorization-changed")
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
  return request(
    "/api/pois",
    {
      method: "GET",
    }
  );
}

export function createPoi(poi) {
  return request(
    "/api/pois",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${getUserToken()}`,
      },

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

      headers: {
        Authorization:
          `Bearer ${getUserToken()}`,
      },

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

      headers: {
        Authorization:
          `Bearer ${getUserToken()}`,
      },
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

    const user =
      getStoredUser();

    /*
     * Authorization phải thuộc
     * đúng user hiện tại.
     */
    if (
      !user ||
      !authorization ||
      Number(
        authorization.userId
      ) !== Number(user.id)
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

/* =========================================================
   QR AUTHORIZATION
========================================================= */

export async function authorizeSessionByQr(
  qrToken
) {
  const token =
    getUserToken();

  if (!token) {
    throw new Error(
      "Bạn chưa đăng nhập."
    );
  }

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

          Authorization:
            `Bearer ${token}`,
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

      headers: {
        Authorization:
          `Bearer ${getUserToken()}`,
      },

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

      headers: {
        Authorization:
          `Bearer ${getUserToken()}`,
      },
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