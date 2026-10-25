
import pool from "../config/db.js";
import { visitorCondition } from "./visitorMiddleware.js";

/*
 * Chạy sau requireVisitor: du khách (thiết bị hoặc tài khoản)
 * phải có quyền tour còn hiệu lực.
 */
export async function requireTourAuthorization(req, res, next) {
  try {
    if (!req.visitor) {
      return res.status(401).json({
        success: false,
        message: "Thiếu mã thiết bị. Hãy tải lại trang.",
      });
    }

    const who = visitorCondition(req, "sa.");

    const [rows] = await pool.execute(
      `
        SELECT sa.id
        FROM session_authorizations sa
        INNER JOIN tour_sessions s
          ON s.id = sa.session_id
        WHERE ${who.sql}
          AND sa.status = 'active'
          AND s.status = 'active'
          AND (
            sa.expires_at IS NULL
            OR sa.expires_at > CURRENT_TIMESTAMP
          )
          AND (
            s.starts_at IS NULL
            OR s.starts_at <= CURRENT_TIMESTAMP
          )
          AND (
            s.expires_at IS NULL
            OR s.expires_at > CURRENT_TIMESTAMP
          )
        LIMIT 1
      `,
      who.params
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần quét QR hợp lệ để truy cập nội dung hướng dẫn.",
        authorizationRequired: true,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
