import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEmail,
  validateLoginPayload,
  validateRegistrationPayload,
} from "../utils/authValidation.js";

test("normalizes an email before persisting or querying it", () => {
  assert.equal(normalizeEmail("  TOURIST@Example.COM "), "tourist@example.com");
});

test("rejects invalid registration data", () => {
  assert.equal(validateRegistrationPayload({}), "Vui lòng nhập đầy đủ thông tin.");
  assert.equal(
    validateRegistrationPayload({
      name: "Visitor",
      email: "not-an-email",
      password: "password123",
    }),
    "Email không hợp lệ."
  );
  assert.equal(
    validateRegistrationPayload({
      name: "Visitor",
      email: "visitor@example.com",
      password: "short",
    }),
    "Mật khẩu phải có ít nhất 8 ký tự."
  );
});

test("accepts valid authentication payloads", () => {
  assert.equal(
    validateRegistrationPayload({
      name: "Visitor",
      email: "visitor@example.com",
      password: "password123",
    }),
    null
  );
  assert.equal(
    validateLoginPayload({
      email: "visitor@example.com",
      password: "password123",
    }),
    null
  );
});
