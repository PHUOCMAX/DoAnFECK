import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

/*
 * Du khách được nhận diện theo một trong hai cách:
 * - Mã thiết bị (header X-Device-Id, UUID do web tự tạo) — không cần đăng nhập.
 * - Token đăng nhập (Authorization: Bearer) — app mobile hiện tại vẫn dùng.
 * Có mã thiết bị thì ưu tiên mã thiết bị.
 */
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readDeviceId(req) {
  const value = String(req.get("x-device-id") || "").trim();

  return DEVICE_ID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function readUserId(req) {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const payload = jwt.verify(
      authorization.slice("Bearer ".length).trim(),
      env.jwtSecret
    );

    return typeof payload === "object" && typeof payload.userId === "number"
      ? payload.userId
      : null;
  } catch {
    return null;
  }
}

export function requireVisitor(req, res, next) {
  const deviceId = readDeviceId(req);
  const userId = readUserId(req);

  if (!deviceId && !userId) {
    return res.status(401).json({
      success: false,
      message: "Thiếu mã thiết bị. Hãy tải lại trang.",
    });
  }

  req.visitor = { deviceId, userId };

  // Giữ req.auth cho các đoạn code cũ còn đọc userId.
  if (userId && !req.auth) {
    req.auth = { userId };
  }

  return next();
}

/*
 * Điều kiện SQL chọn bản ghi của du khách hiện tại.
 * alias: tiền tố bảng, ví dụ "sa." hoặc "".
 */
export function visitorCondition(req, alias = "") {
  if (req.visitor?.deviceId) {
    return {
      sql: `${alias}device_id = ?`,
      params: [req.visitor.deviceId],
    };
  }

  return {
    sql: `${alias}user_id = ?`,
    params: [req.visitor?.userId ?? null],
  };
}

/* Giá trị ghi vào cột device_id / user_id khi tạo bản ghi mới. */
export function visitorColumns(req) {
  return {
    deviceId: req.visitor?.deviceId ?? null,
    userId: req.visitor?.deviceId ? null : req.visitor?.userId ?? null,
  };
}
