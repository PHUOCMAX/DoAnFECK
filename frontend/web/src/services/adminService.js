const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://doanfeck.onrender.com"
    : "")
).replace(/\/+$/, "");

async function request(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  console.log("===== API REQUEST =====");
  console.log("URL:", `${API_URL}${path}`);
  console.log("METHOD:", options.method || "GET");
  console.log("HAS AUTH:", Boolean(headers.Authorization));

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("API FETCH ERROR:", error);

    throw new Error(
      `Không thể kết nối tới máy chủ API: ${API_URL}`
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "Không thể thực hiện yêu cầu."
    );
  }

  return data;
}

export function adminLogin(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export function getAdminPois(token, status = "pending") {
  return request(
    `/api/admin/pois?status=${encodeURIComponent(status)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export function createAdminPoi(token, poi) {
  return request("/api/admin/pois", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: poi,
  });
}

export function updateAdminPoi(token, poiId, poi) {
  return request(`/api/admin/pois/${poiId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: poi,
  });
}

export function reviewPoi(token, poiId, status) {
  return request(`/api/admin/pois/${poiId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
    }),
  });
}

export function deleteAdminPoi(token, poiId) {
  return request(`/api/admin/pois/${poiId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getAdminUsers(token, query = "") {
  return request(`/api/admin/users${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateAdminUserRole(token, userId, role) {
  return request(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      role,
    }),
  });
}

export function deleteAdminUser(token, userId) {
  return request(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}