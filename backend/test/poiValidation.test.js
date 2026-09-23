import assert from "node:assert/strict";
import test from "node:test";

import { validatePoiPayload } from "../utils/poiValidation.js";

const validPoi = {
  name: { vi: "Bưu điện Thành phố" },
  description: { vi: "Công trình kiến trúc lịch sử." },
  city: "ho-chi-minh",
  category: "tourism",
  latitude: 10.7798,
  longitude: 106.699,
  radius: 100,
};

test("normalizes missing POI translations to Vietnamese", () => {
  const result = validatePoiPayload(validPoi);

  assert.equal(result.error, undefined);
  assert.deepEqual(result.value.name, {
    vi: "Bưu điện Thành phố",
    en: "Bưu điện Thành phố",
    zh: "Bưu điện Thành phố",
  });
});

test("rejects invalid POI coordinates and radius", () => {
  assert.equal(
    validatePoiPayload({ ...validPoi, latitude: 91 }).error,
    "Vĩ độ phải nằm trong khoảng -90 đến 90."
  );
  assert.equal(
    validatePoiPayload({ ...validPoi, longitude: -181 }).error,
    "Kinh độ phải nằm trong khoảng -180 đến 180."
  );
  assert.equal(
    validatePoiPayload({ ...validPoi, radius: 5 }).error,
    "Bán kính check-in phải từ 10 đến 1000 mét."
  );
});
