const API_URL = (
  import.meta.env.VITE_API_URL ||""
).replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

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
        "Không thể hoàn tất yêu cầu."
    );
  }

  return body;
}

/* =========================
   USER SESSION
========================= */

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
  localStorage.setItem("user_token", token);
  localStorage.setItem("user_user", JSON.stringify(user));
  window.dispatchEvent(new Event("user-session-changed"));
}

export function clearUserSession() {
  localStorage.removeItem("user_token");
  localStorage.removeItem("user_user");
  window.dispatchEvent(new Event("user-session-changed"));
}

/* =========================
   AUTH
========================= */

export function loginUser(
  email,
  password
) {
  return request("/api/auth/login", {
    method: "POST",

    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export function registerUser(
  name,
  email,
  password
) {
  return request("/api/auth/register", {
    method: "POST",

    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });
}

export function getCurrentUser() {
  const token = getUserToken();

  if (!token) {
    return Promise.reject(
      new Error("Bạn chưa đăng nhập.")
    );
  }

  return request("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/* =========================
   POI
========================= */

export function getPois() {
  return request("/api/pois", {
    method: "GET",
  });
}

export function createPoi(poi) {
  return request("/api/pois", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },

    body: JSON.stringify(poi),
  });
}
export function resolveAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
export function createCheckin({ poiId, latitude, longitude }) {
  return request("/api/checkins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
    body: JSON.stringify({ poiId, latitude, longitude }),
  });
}

export function getMyCheckins(limit = 50) {
  return request(`/api/checkins?limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getUserToken()}`,
    },
  });
}
