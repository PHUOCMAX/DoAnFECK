/*
 * Các hàm tính toán vị trí dùng chung cho bản đồ và geofence.
 * Không phụ thuộc React hay trình duyệt nên kiểm thử được bằng node --test.
 */

const EARTH_RADIUS_METERS = 6371000;

// Bán kính mặc định khi POI không có bán kính hợp lệ.
export const DEFAULT_RADIUS = 100;

/* Khoảng cách Haversine (mét) giữa hai toạ độ. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const d = Math.PI / 180;

  const dLat = (lat2 - lat1) * d;
  const dLon = (lon2 - lon1) * d;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/*
 * Khoảng cách từ vị trí { lat, lng } tới một POI { latitude, longitude }.
 * Trả về null nếu thiếu dữ liệu hoặc toạ độ không phải số.
 */
export function distanceMeters(a, b) {
  if (!a || !b) return null;

  const latitude = Number(b.latitude);
  const longitude = Number(b.longitude);

  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return haversineMeters(a.lat, a.lng, latitude, longitude);
}

/* Bán kính kích hoạt thuyết minh của POI. */
export function poiRadius(poi) {
  return Number(poi?.radius) || DEFAULT_RADIUS;
}

/* POI vừa được đọc trong khoảng cooldownMs thì không đọc lại. */
export function isInCooldown(lastNarratedAt, now, cooldownMs) {
  return now - (lastNarratedAt || 0) < cooldownMs;
}

/*
 * Chọn POI để đọc khi đứng trong vùng của nhiều POI:
 * ưu tiên priority cao hơn, cùng priority thì chọn POI gần hơn.
 */
export function selectBestPoi(candidates) {
  if (!candidates.length) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const priorityA = Number(a.poi.priority) || 0;
    const priorityB = Number(b.poi.priority) || 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    return a.distance - b.distance;
  });

  return sorted[0] || null;
}

export function formatDistance(m) {
  if (m == null) return "";

  if (m < 1000) {
    return `${Math.round(m)} m`;
  }

  return `${(m / 1000).toFixed(1)} km`;
}

/* Link chỉ đường đi bộ của Google Maps qua các POI của tuyến. */
export function googleDirectionsUrl(origin, routePois) {
  if (!origin || !routePois.length) {
    return "";
  }

  const destination = routePois[routePois.length - 1];

  const waypoints = routePois
    .slice(0, -1)
    .map((poi) => `${Number(poi.latitude)},${Number(poi.longitude)}`)
    .join("|");

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${Number(destination.latitude)},${Number(destination.longitude)}`,
    travelmode: "walking",
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/*
 * Gợi ý tuyến tham quan: từ vị trí hiện tại, mỗi bước đi tới
 * POI gần nhất chưa ghé (thuật toán láng giềng gần nhất).
 */
export function buildRecommendedRoute(pois, location, count) {
  if (!location || !pois.length || count <= 0) {
    return [];
  }

  const candidates = pois
    .map((poi) => ({
      poi,
      distance: distanceMeters(location, poi),
    }))
    .filter((item) => item.distance != null);

  if (!candidates.length) {
    return [];
  }

  const route = [];
  const remaining = [...candidates];

  let current = location;

  while (route.length < count && remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.MAX_SAFE_INTEGER;

    for (let index = 0; index < remaining.length; index += 1) {
      const distance = distanceMeters(current, remaining[index].poi);

      if (distance != null && distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [selected] = remaining.splice(nearestIndex, 1);

    route.push({
      ...selected,
      routeDistance: nearestDistance,
    });

    current = {
      lat: Number(selected.poi.latitude),
      lng: Number(selected.poi.longitude),
    };
  }

  return route;
}
