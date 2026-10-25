import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import pool from "../config/db.js";

/*
 * Ghi lại thời điểm hoạt động gần nhất để dashboard đếm người đang online.
 * Mỗi user tối đa 1 lần ghi / phút; lỗi ghi không chặn request.
 */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;
const lastSeenWrittenAt = new Map();

function touchLastSeen(userId) {
  const now = Date.now();

  if (now - (lastSeenWrittenAt.get(userId) || 0) < LAST_SEEN_THROTTLE_MS) {
    return;
  }

  lastSeenWrittenAt.set(userId, now);

  pool
    .execute(
      "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId]
    )
    .catch((error) => {
      console.error("touchLastSeen error:", error.message);
    });
}

export function requireAuth(req, res, next) {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Yêu cầu đăng nhập.",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Yêu cầu đăng nhập.",
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (
      typeof payload === "string" ||
      typeof payload.userId !== "number"
    ) {
      throw new Error("Invalid token payload");
    }

    req.auth = {
      userId: payload.userId,
      email: payload.email,
    };

    touchLastSeen(payload.userId);

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
}
