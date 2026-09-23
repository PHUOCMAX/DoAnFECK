const CATEGORIES = new Set(["tourism", "food"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function localizedValue(value, fallback) {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function normalizeLocalizedText(value, fieldName, maxLength) {
  if (!value || typeof value !== "object" || !isNonEmptyString(value.vi)) {
    return {
      error: `${fieldName} tiếng Việt là bắt buộc.`,
    };
  }

  const vi = value.vi.trim();
  const en = localizedValue(value.en, vi);
  const zh = localizedValue(value.zh, vi);

  if ([vi, en, zh].some((text) => text.length > maxLength)) {
    return {
      error: `${fieldName} không được dài quá ${maxLength} ký tự.`,
    };
  }

  return {
    value: { vi, en, zh },
  };
}

export function validatePoiPayload(payload = {}) {
  const name = normalizeLocalizedText(payload.name, "Tên địa điểm", 150);

  if (name.error) {
    return { error: name.error };
  }

  const description = normalizeLocalizedText(
    payload.description,
    "Mô tả",
    5_000
  );

  if (description.error) {
    return { error: description.error };
  }

  const city = typeof payload.city === "string" ? payload.city.trim() : "";

  if (!city || city.length > 100) {
    return { error: "Thành phố là bắt buộc và tối đa 100 ký tự." };
  }

  if (!CATEGORIES.has(payload.category)) {
    return { error: "Loại địa điểm không hợp lệ." };
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const radius = Number(payload.radius);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Vĩ độ phải nằm trong khoảng -90 đến 90." };
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Kinh độ phải nằm trong khoảng -180 đến 180." };
  }

  if (!Number.isInteger(radius) || radius < 10 || radius > 1_000) {
    return { error: "Bán kính check-in phải từ 10 đến 1000 mét." };
  }

  return {
    value: {
      name: name.value,
      description: description.value,
      city,
      category: payload.category,
      latitude,
      longitude,
      radius,
    },
  };
}
