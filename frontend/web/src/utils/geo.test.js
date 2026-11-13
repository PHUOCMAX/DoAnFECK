import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RADIUS,
  buildRecommendedRoute,
  distanceMeters,
  formatDistance,
  googleDirectionsUrl,
  haversineMeters,
  isInCooldown,
  poiRadius,
  selectBestPoi,
} from "./geo.js";

// Bưu điện Trung tâm Sài Gòn và Nhà thờ Đức Bà cách nhau khoảng 100–150 m.
const POST_OFFICE = { latitude: 10.77998, longitude: 106.70002 };
const CATHEDRAL = { latitude: 10.77979, longitude: 106.69902 };

test("haversineMeters: cùng một điểm thì khoảng cách bằng 0", () => {
  assert.equal(haversineMeters(10.78, 106.7, 10.78, 106.7), 0);
});

test("haversineMeters: 1 độ vĩ tuyến xấp xỉ 111,2 km", () => {
  const meters = haversineMeters(10, 106, 11, 106);

  assert.ok(Math.abs(meters - 111195) < 50, `nhận được ${meters}`);
});

test("haversineMeters: khoảng cách hai chiều bằng nhau", () => {
  const a = haversineMeters(10.77998, 106.70002, 10.77479, 106.69309);
  const b = haversineMeters(10.77479, 106.69309, 10.77998, 106.70002);

  assert.ok(Math.abs(a - b) < 1e-6);
});

test("distanceMeters: tính được khoảng cách từ vị trí tới POI", () => {
  const meters = distanceMeters(
    { lat: POST_OFFICE.latitude, lng: POST_OFFICE.longitude },
    CATHEDRAL
  );

  assert.ok(meters > 90 && meters < 150, `nhận được ${meters}`);
});

test("distanceMeters: trả về null khi thiếu hoặc sai toạ độ", () => {
  assert.equal(distanceMeters(null, CATHEDRAL), null);
  assert.equal(distanceMeters({ lat: 10, lng: 106 }, null), null);
  assert.equal(distanceMeters({ lat: 10, lng: 106 }, { latitude: "abc", longitude: 106 }), null);
  assert.equal(distanceMeters({ lat: Number.NaN, lng: 106 }, CATHEDRAL), null);
});

test("poiRadius: dùng bán kính của POI, thiếu thì dùng mặc định", () => {
  assert.equal(poiRadius({ radius: 30 }), 30);
  assert.equal(poiRadius({ radius: "50" }), 50);
  assert.equal(poiRadius({}), DEFAULT_RADIUS);
  assert.equal(poiRadius(null), DEFAULT_RADIUS);
});

test("isInCooldown: không đọc lại POI trong 5 phút", () => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  const now = 1_000_000_000;

  assert.equal(isInCooldown(now - 60 * 1000, now, FIVE_MINUTES), true);
  assert.equal(isInCooldown(now - FIVE_MINUTES, now, FIVE_MINUTES), false);
  assert.equal(isInCooldown(undefined, now, FIVE_MINUTES), false);
});

test("selectBestPoi: ưu tiên priority cao, cùng priority thì chọn POI gần hơn", () => {
  const near = { poi: { id: 1 }, distance: 10 };
  const far = { poi: { id: 2 }, distance: 40 };
  const important = { poi: { id: 3, priority: 2 }, distance: 45 };

  assert.equal(selectBestPoi([]), null);
  assert.equal(selectBestPoi([far, near]).poi.id, 1);
  assert.equal(selectBestPoi([near, far, important]).poi.id, 3);
});

test("formatDistance: hiển thị mét dưới 1 km, km từ 1 km trở lên", () => {
  assert.equal(formatDistance(null), "");
  assert.equal(formatDistance(20.4), "20 m");
  assert.equal(formatDistance(999), "999 m");
  assert.equal(formatDistance(1500), "1.5 km");
});

test("googleDirectionsUrl: điểm cuối là đích, các điểm trước là điểm dừng", () => {
  const url = new URL(
    googleDirectionsUrl({ lat: 10.78, lng: 106.7 }, [
      { latitude: 10.77, longitude: 106.69 },
      { latitude: 10.76, longitude: 106.68 },
    ])
  );

  assert.equal(url.searchParams.get("origin"), "10.78,106.7");
  assert.equal(url.searchParams.get("destination"), "10.76,106.68");
  assert.equal(url.searchParams.get("waypoints"), "10.77,106.69");
  assert.equal(url.searchParams.get("travelmode"), "walking");
  assert.equal(googleDirectionsUrl(null, []), "");
});

test("buildRecommendedRoute: mỗi bước đi tới POI gần nhất chưa ghé", () => {
  const start = { lat: 10.0, lng: 106.0 };
  const pois = [
    { id: "C", latitude: 10.003, longitude: 106.0 },
    { id: "A", latitude: 10.001, longitude: 106.0 },
    { id: "B", latitude: 10.002, longitude: 106.0 },
    { id: "X", latitude: "sai", longitude: 106.0 },
  ];

  const route = buildRecommendedRoute(pois, start, 3);

  assert.deepEqual(route.map((item) => item.poi.id), ["A", "B", "C"]);
  assert.equal(buildRecommendedRoute(pois, start, 0).length, 0);
  assert.equal(buildRecommendedRoute(pois, null, 3).length, 0);
  assert.equal(buildRecommendedRoute(pois, start, 2).length, 2);
});
