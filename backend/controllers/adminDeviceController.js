import pool from "../config/db.js";
import { env } from "../config/env.js";

/*
 * Khách không có tài khoản: admin tra cứu theo mã thiết bị
 * (khách xem mã rút gọn ở trang "Tài khoản" trên web).
 */

const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function placeholders(list) {
  return list.map(() => "?").join(", ");
}

/* GET /api/admin/devices?q=89541c99 */
export async function listDevices(req, res, next) {
  try {
    // Cho phép gõ mã rút gọn có/không gạch ngang, hoa/thường.
    const q = String(req.query.q || "")
      .trim()
      .toLowerCase()
      .replace(/[^0-9a-f-]/g, "")
      .slice(0, 36);

    const [devices] = await pool.query(
      `
        SELECT device_id, MAX(activity_at) AS last_activity
        FROM (
          -- Các bảng có collation khác nhau: ép về một collation để UNION được.
          SELECT CONVERT(device_id USING utf8mb4) COLLATE utf8mb4_unicode_ci AS device_id,
                 last_seen_at AS activity_at
          FROM tour_presence
          UNION ALL
          SELECT CONVERT(device_id USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                 COALESCE(paid_at, created_at)
          FROM payments WHERE device_id IS NOT NULL
          UNION ALL
          SELECT CONVERT(device_id USING utf8mb4) COLLATE utf8mb4_unicode_ci, authorized_at
          FROM session_authorizations WHERE device_id IS NOT NULL
          UNION ALL
          SELECT CONVERT(device_id USING utf8mb4) COLLATE utf8mb4_unicode_ci, checked_in_at
          FROM checkins WHERE device_id IS NOT NULL
        ) activity
        WHERE ? = '' OR device_id LIKE ?
        GROUP BY device_id
        ORDER BY last_activity DESC
        LIMIT 100
      `,
      [q, `${q}%`]
    );

    if (devices.length === 0) {
      return res.json({ success: true, devices: [] });
    }

    const ids = devices.map((row) => row.device_id);
    const inList = placeholders(ids);

    const [[access], [payments], [presence], [checkins]] = await Promise.all([
      pool.query(
        `
          SELECT sa.device_id, sa.session_id, s.name, sa.expires_at
          FROM session_authorizations sa
          INNER JOIN tour_sessions s ON s.id = sa.session_id
          WHERE sa.device_id IN (${inList})
            AND sa.status = 'active'
            AND s.status = 'active'
            AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
            AND (s.expires_at IS NULL OR s.expires_at > NOW())
          ORDER BY sa.expires_at DESC
        `,
        ids
      ),
      pool.query(
        `
          SELECT id, device_id, session_id, amount, method, status, paid_at, created_at
          FROM payments
          WHERE device_id IN (${inList})
          ORDER BY id DESC
        `,
        ids
      ),
      pool.query(
        `
          SELECT device_id, MAX(last_seen_at) AS last_seen_at
          FROM tour_presence
          WHERE device_id IN (${inList})
          GROUP BY device_id
        `,
        ids
      ),
      pool.query(
        `
          SELECT device_id, COUNT(*) AS total
          FROM checkins
          WHERE device_id IN (${inList})
          GROUP BY device_id
        `,
        ids
      ),
    ]);

    const result = devices.map((row) => {
      const id = row.device_id;
      const activeAccess = access.find((item) => item.device_id === id);
      const devicePayments = payments.filter((item) => item.device_id === id);
      const seen = presence.find((item) => item.device_id === id);
      const visits = checkins.find((item) => item.device_id === id);

      return {
        deviceId: id,
        shortCode: id.slice(0, 8).toUpperCase(),
        lastActivity: row.last_activity,
        lastSeenInTour: seen?.last_seen_at || null,
        access: activeAccess
          ? {
              sessionId: Number(activeAccess.session_id),
              tourName: activeAccess.name,
              expiresAt: activeAccess.expires_at,
            }
          : null,
        payments: devicePayments.slice(0, 5).map((item) => ({
          id: Number(item.id),
          sessionId: Number(item.session_id),
          amount: Number(item.amount),
          method: item.method,
          status: item.status,
          paidAt: item.paid_at,
          createdAt: item.created_at,
        })),
        checkinCount: Number(visits?.total || 0),
      };
    });

    return res.json({ success: true, devices: result });
  } catch (error) {
    return next(error);
  }
}

/*
 * POST /api/admin/devices/:deviceId/grant { sessionId }
 * Cấp lại quyền tour cho thiết bị (khách báo đã trả mà không vào được).
 * Thời hạn = env.tourAccessHours tính từ bây giờ, không vượt hạn tour.
 */
export async function grantDeviceAccess(req, res, next) {
  try {
    const deviceId = String(req.params.deviceId || "").toLowerCase();
    const sessionId = Number(req.body?.sessionId);

    if (!DEVICE_ID_PATTERN.test(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Mã thiết bị không hợp lệ.",
      });
    }

    if (!Number.isInteger(sessionId) || sessionId < 1) {
      return res.status(400).json({
        success: false,
        message: "Tour không hợp lệ.",
      });
    }

    const [sessions] = await pool.execute(
      "SELECT id, status, starts_at, expires_at FROM tour_sessions WHERE id = ?",
      [sessionId]
    );

    const session = sessions[0];
    const now = new Date();

    if (
      !session ||
      session.status !== "active" ||
      (session.expires_at && new Date(session.expires_at) <= now) ||
      (session.starts_at && new Date(session.starts_at) > now)
    ) {
      return res.status(400).json({
        success: false,
        message: "Chỉ cấp quyền được cho tour đang chạy.",
      });
    }

    let expiresAt = new Date(now.getTime() + env.tourAccessHours * 60 * 60 * 1000);

    if (session.expires_at && new Date(session.expires_at) < expiresAt) {
      expiresAt = new Date(session.expires_at);
    }

    await pool.execute(
      `
        INSERT INTO session_authorizations (
          session_id, user_id, device_id, authorization_source,
          status, authorized_at, expires_at
        )
        VALUES (?, NULL, ?, 'admin', 'active', CURRENT_TIMESTAMP, ?)
        ON DUPLICATE KEY UPDATE
          status = 'active',
          authorization_source = 'admin',
          authorized_at = CURRENT_TIMESTAMP,
          expires_at = VALUES(expires_at),
          revoked_at = NULL
      `,
      [sessionId, deviceId, expiresAt]
    );

    return res.json({
      success: true,
      message: "Đã cấp quyền tour cho thiết bị.",
      expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * POST /api/admin/devices/:deviceId/revoke
 * Thu hồi mọi quyền tour đang hiệu lực của thiết bị (cấp nhầm, cần chặn).
 */
export async function revokeDeviceAccess(req, res, next) {
  try {
    const deviceId = String(req.params.deviceId || "").toLowerCase();

    if (!DEVICE_ID_PATTERN.test(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Mã thiết bị không hợp lệ.",
      });
    }

    const [result] = await pool.execute(
      `
        UPDATE session_authorizations
        SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
        WHERE device_id = ? AND status = 'active'
      `,
      [deviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Thiết bị không có quyền tour nào đang hiệu lực.",
      });
    }

    return res.json({
      success: true,
      message: "Đã thu hồi quyền tour của thiết bị.",
    });
  } catch (error) {
    return next(error);
  }
}
