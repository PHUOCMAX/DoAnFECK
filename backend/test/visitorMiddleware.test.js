import assert from "node:assert/strict";
import test from "node:test";

import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const { requireVisitor, visitorColumns, visitorCondition } = await import(
  "../middleware/visitorMiddleware.js"
);

const DEVICE_ID = "3f2b8c1a-9d4e-4f6a-8b7c-1234567890ab";

function fakeRequest(headers = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return { get: (name) => lower[name.toLowerCase()] };
}

function fakeResponse() {
  return {
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

function run(headers) {
  const req = fakeRequest(headers);
  const res = fakeResponse();
  let nextCalled = false;

  requireVisitor(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

test("requireVisitor: nhận diện du khách bằng mã thiết bị hợp lệ", () => {
  const { req, nextCalled } = run({ "X-Device-Id": DEVICE_ID });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.visitor, { deviceId: DEVICE_ID, userId: null });
});

test("requireVisitor: mã thiết bị viết hoa được chuẩn hoá về chữ thường", () => {
  const { req } = run({ "X-Device-Id": DEVICE_ID.toUpperCase() });

  assert.equal(req.visitor.deviceId, DEVICE_ID);
});

test("requireVisitor: từ chối khi thiếu hoặc sai mã thiết bị", () => {
  for (const headers of [{}, { "X-Device-Id": "khong-phai-uuid" }]) {
    const { res, nextCalled } = run(headers);

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
  }
});

test("requireVisitor: chấp nhận token đăng nhập hợp lệ của app mobile", () => {
  const token = jwt.sign({ userId: 7 }, "test-secret");
  const { req, nextCalled } = run({ Authorization: `Bearer ${token}` });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.visitor, { deviceId: null, userId: 7 });
  assert.equal(req.auth.userId, 7);
});

test("requireVisitor: từ chối token ký sai khoá bí mật", () => {
  const token = jwt.sign({ userId: 7 }, "khoa-khac");
  const { res, nextCalled } = run({ Authorization: `Bearer ${token}` });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("visitorCondition: ưu tiên mã thiết bị, có tiền tố bảng", () => {
  assert.deepEqual(
    visitorCondition({ visitor: { deviceId: DEVICE_ID, userId: 7 } }, "sa."),
    { sql: "sa.device_id = ?", params: [DEVICE_ID] }
  );

  assert.deepEqual(visitorCondition({ visitor: { deviceId: null, userId: 7 } }), {
    sql: "user_id = ?",
    params: [7],
  });
});

test("visitorColumns: có mã thiết bị thì không ghi user_id", () => {
  assert.deepEqual(visitorColumns({ visitor: { deviceId: DEVICE_ID, userId: 7 } }), {
    deviceId: DEVICE_ID,
    userId: null,
  });

  assert.deepEqual(visitorColumns({ visitor: { deviceId: null, userId: 7 } }), {
    deviceId: null,
    userId: 7,
  });
});
