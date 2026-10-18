
import pool from "../config/db.js";

export async function requireTourAuthorization(req, res, next) {
  try {
    const userId = Number(req.auth?.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập.",
      });
    }

    const [rows] = await pool.execute(
      `
        SELECT sa.id
        FROM session_authorizations sa
        INNER JOIN tour_sessions s
          ON s.id = sa.session_id
        WHERE sa.user_id = ?
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
      [userId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần quét QR hợp lệ để truy cập nội dung hướng dẫn.",
        authorizationRequired: true,
      });
    }
    console.log("TOUR AUTHORIZATION CHECK:", {
  userId,
  authorizationCount: rows.length,
});

    return next();
  } catch (error) {
    return next(error);
  }
}
