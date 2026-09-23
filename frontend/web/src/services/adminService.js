const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://192.168.1.7:5001";

async function request(path, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Không thể thực hiện yêu cầu."
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

export function getPendingPois(token) {
  return request(
    "/api/admin/pois?status=pending",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export function reviewPoi(
  token,
  poiId,
  status
) {
  return request(
    `/api/admin/pois/${poiId}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
      }),
    }
  );
}