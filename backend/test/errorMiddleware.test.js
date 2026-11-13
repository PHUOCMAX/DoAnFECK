import assert from "node:assert/strict";
import test from "node:test";

import { errorHandler, notFoundHandler } from "../middleware/errorMiddleware.js";

function fakeResponse(headersSent = false) {
  return {
    headersSent,
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("notFoundHandler: trả 404 kèm phương thức và đường dẫn", () => {
  const res = fakeResponse();

  notFoundHandler({ method: "GET", originalUrl: "/api/khong-co" }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Không tìm thấy endpoint GET /api/khong-co.");
});

test("errorHandler: lỗi do người dùng giữ nguyên mã lỗi và thông báo", () => {
  const res = fakeResponse();
  const error = Object.assign(new Error("Bán kính không hợp lệ."), { statusCode: 400 });

  errorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Bán kính không hợp lệ.");
});

test("errorHandler: lỗi máy chủ không để lộ chi tiết", (t) => {
  t.mock.method(console, "error", () => {});
  const res = fakeResponse();

  errorHandler(new Error("ECONNREFUSED 127.0.0.1:3306"), {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Đã xảy ra lỗi máy chủ.");
});

test("errorHandler: đã gửi header thì chuyển lỗi cho Express xử lý", () => {
  const error = new Error("muộn");
  let forwarded = null;

  errorHandler(error, {}, fakeResponse(true), (value) => {
    forwarded = value;
  });

  assert.equal(forwarded, error);
});
