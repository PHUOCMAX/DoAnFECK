import assert from "node:assert/strict";
import test from "node:test";

import {
  MONITORING_RANGES,
  monitoringFilter,
  resolveMonitoringRange,
} from "../utils/monitoringRange.js";

test("resolveMonitoringRange: nhận đúng 4 khoảng thời gian", () => {
  for (const range of ["today", "7d", "month", "all"]) {
    assert.equal(resolveMonitoringRange(range), range);
  }
});

test("resolveMonitoringRange: giá trị lạ hoặc thiếu thì lấy tất cả", () => {
  for (const value of [undefined, "", "1y", "toString", ["today"], "today; DROP TABLE users"]) {
    assert.equal(resolveMonitoringRange(value), "all");
  }
});

test("monitoringFilter: 'all' không giới hạn thời gian", () => {
  assert.equal(monitoringFilter("all")("p.created_at"), "1 = 1");
});

test("monitoringFilter: lọc theo mốc đầu ngày giờ Việt Nam", () => {
  const sql = monitoringFilter("today")("p.created_at");

  assert.equal(sql, `p.created_at >= ${MONITORING_RANGES.today}`);
  assert.match(sql, /'\+07:00'/);
});

test("monitoringFilter: 7 ngày gồm hôm nay và 6 ngày trước", () => {
  assert.match(monitoringFilter("7d")("c.checked_in_at"), /INTERVAL 6 DAY/);
});

test("monitoringFilter: tháng này tính từ ngày 01", () => {
  assert.match(monitoringFilter("month")("created_at"), /%Y-%m-01/);
});

test("monitoringFilter: giá trị lạ không ghép vào SQL", () => {
  assert.equal(monitoringFilter("today; DROP TABLE users")("created_at"), "1 = 1");
});
