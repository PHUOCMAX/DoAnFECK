import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPPORTED_LANGUAGES,
  validatePoiPayload,
} from "../utils/poiValidation.js";

const validPoi = {
  name: { vi: "Bưu điện Thành phố" },
  description: { vi: "Công trình kiến trúc lịch sử." },
  city: "ho-chi-minh",
  category: "tourism",
  latitude: 10.7798,
  longitude: 106.699,
  radius: 50,
};

test("normalizes missing POI translations to supported languages", () => {
  const result = validatePoiPayload(validPoi);

  assert.equal(result.error, undefined);

  for (const language of SUPPORTED_LANGUAGES) {
    if (language === "vi") {
      assert.equal(
        result.value.name[language],
        "Bưu điện Thành phố"
      );
    } else {
      assert.equal(
        result.value.name[language],
        ""
      );
    }
  }
});

test("rejects invalid POI coordinates and radius", () => {
  for (const latitude of [91, 0, -10]) {
    assert.equal(
      validatePoiPayload({
        ...validPoi,
        latitude,
      }).error,
      "Vĩ độ phải lớn hơn 0 và tối đa 90."
    );
  }

  for (const longitude of [181, 0, -10]) {
    assert.equal(
      validatePoiPayload({
        ...validPoi,
        longitude,
      }).error,
      "Kinh độ phải lớn hơn 0 và tối đa 180."
    );
  }

  for (const radius of [-1, 51]) {
    assert.equal(
      validatePoiPayload({
        ...validPoi,
        radius,
      }).error,
      "Bán kính check-in phải từ 0 đến 50 mét."
    );
  }
});

test("preserves optional image and multilingual audio", () => {
  const result = validatePoiPayload({
    ...validPoi,
    image: "/images/poi-1.jpg",
    audio: {
      vi: "/audio/poi-1-vi.mp3",
      en: "/audio/poi-1-en.mp3",
      zh: "/audio/poi-1-zh.mp3",
    },
  });

  assert.equal(result.error, undefined);
  assert.equal(
    result.value.image,
    "/images/poi-1.jpg"
  );

  assert.equal(
    result.value.audio.vi,
    "/audio/poi-1-vi.mp3"
  );

  assert.equal(
    result.value.audio.en,
    "/audio/poi-1-en.mp3"
  );

  assert.equal(
    result.value.audio.zh,
    "/audio/poi-1-zh.mp3"
  );

  for (const language of SUPPORTED_LANGUAGES) {
    if (!["vi", "en", "zh"].includes(language)) {
      assert.equal(
        result.value.audio[language],
        ""
      );
    }
  }
});