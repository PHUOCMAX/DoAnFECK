import crypto from "crypto";
import pool from "../config/db.js";
import { env } from "../config/env.js";
import {
  visitorColumns,
  visitorCondition,
} from "../middleware/visitorMiddleware.js";

/* =========================================================
   HELPERS
========================================================= */

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizeNullableDate(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return value;
}

/* =========================================================
   ADMIN - CREATE SESSION
========================================================= */

export async function createSession(req, res, next) {
  try {
    const {
      name = null,
      startsAt = null,
      expiresAt = null,
    } = req.body ?? {};

    const normalizedStartsAt =
      normalizeNullableDate(startsAt);

    const normalizedExpiresAt =
      normalizeNullableDate(expiresAt);

    if (
      normalizedStartsAt &&
      normalizedExpiresAt &&
      new Date(normalizedExpiresAt) <=
        new Date(normalizedStartsAt)
    ) {
      return res.status(400).json({
        success: false,
        message: "expiresAt phải lớn hơn startsAt.",
      });
    }

    const userId = Number(req.auth?.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được tài khoản tạo session.",
      });
    }

    const [result] = await pool.execute(
      `
        INSERT INTO tour_sessions (
          name,
          status,
          starts_at,
          expires_at,
          created_by
        )
        VALUES (?, 'active', ?, ?, ?)
      `,
      [
        typeof name === "string" && name.trim()
          ? name.trim()
          : null,
        normalizedStartsAt,
        normalizedExpiresAt,
        userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo session thành công.",
      session: {
        id: Number(result.insertId),
        name:
          typeof name === "string" && name.trim()
            ? name.trim()
            : null,
        status: "active",
        startsAt: normalizedStartsAt,
        expiresAt: normalizedExpiresAt,
        createdBy: userId,
      },
    });
  } catch (error) {
    console.error("createSession error:", error);

    return res.status(500).json({
      success: false,
      message: error.sqlMessage || error.message || "Lỗi tạo session.",
      code: error.code || null,
    });
  }
}

/* =========================================================
   ADMIN - CREATE QR
========================================================= */

export async function createQrCode(
  req,
  res,
  next
) {
  try {
    const sessionId =
      Number(req.params.sessionId);

    const {
      poiId = null,
      expiresAt = null,
    } = req.body ?? {};

    if (
      !Number.isInteger(sessionId) ||
      sessionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session ID không hợp lệ.",
      });
    }

    const [sessions] =
      await pool.execute(
        `
          SELECT
            id,
            status,
            starts_at,
            expires_at
          FROM tour_sessions
          WHERE id = ?
        `,
        [sessionId]
      );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy session.",
      });
    }

    const session =
      sessions[0];

    if (
      session.status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session không còn hoạt động.",
      });
    }

    if (
      session.expires_at &&
      new Date(session.expires_at) <=
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session đã hết hạn.",
      });
    }

    let normalizedPoiId = null;

    if (
      poiId !== null &&
      poiId !== undefined &&
      poiId !== ""
    ) {
      normalizedPoiId =
        Number(poiId);

      if (
        !Number.isInteger(
          normalizedPoiId
        ) ||
        normalizedPoiId < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "POI ID không hợp lệ.",
        });
      }

      const [pois] =
        await pool.execute(
          `
            SELECT id, status
            FROM pois
            WHERE id = ?
          `,
          [normalizedPoiId]
        );

      if (pois.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy POI.",
        });
      }

      if (
        pois[0].status !== "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Chỉ POI approved mới được gắn với QR.",
        });
      }
    }

    const qrToken =
      generateToken();

    const [result] =
      await pool.execute(
        `
          INSERT INTO qr_codes (
            session_id,
            qr_token,
            poi_id,
            status,
            expires_at
          )
          VALUES (?, ?, ?, 'active', ?)
        `,
        [
          sessionId,
          qrToken,
          normalizedPoiId,
          normalizeNullableDate(
            expiresAt
          ),
        ]
      );

    const [rows] =
      await pool.execute(
        `
          SELECT
            id,
            session_id,
            qr_token,
            poi_id,
            status,
            expires_at,
            created_at
          FROM qr_codes
          WHERE id = ?
        `,
        [result.insertId]
      );

    return res.status(201).json({
      success: true,
      message:
        "Tạo QR token thành công.",
      qr: rows[0],
    });
  } catch (error) {
    console.error(
      "createQrCode error:",
      error
    );

    return next(error);
  }
}

/* =========================================================
   USER - AUTHORIZE BY QR
========================================================= */

export async function authorizeByQr(
  req,
  res,
  next
) {
  try {
    const { qrToken } =
      req.body ?? {};

    if (
      typeof qrToken !== "string" ||
      !qrToken.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "qrToken không được để trống.",
      });
    }

    const [rows] =
      await pool.execute(
        `
          SELECT
            q.id AS qr_id,
            q.session_id,
            q.poi_id,
            q.status AS qr_status,
            q.expires_at AS qr_expires_at,

            s.name AS session_name,
            s.price AS session_price,
            s.status AS session_status,
            s.starts_at,
            s.expires_at AS session_expires_at

          FROM qr_codes q

          INNER JOIN tour_sessions s
            ON s.id = q.session_id

          WHERE q.qr_token = ?

          LIMIT 1
        `,
        [qrToken.trim()]
      );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "QR không hợp lệ.",
      });
    }

    const qr = rows[0];

    if (
      qr.qr_status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "QR không còn hoạt động.",
      });
    }

    if (
      qr.qr_expires_at &&
      new Date(qr.qr_expires_at) <=
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "QR đã hết hạn.",
      });
    }

    if (
      qr.session_status !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session không còn hoạt động.",
      });
    }

    if (
      qr.starts_at &&
      new Date(qr.starts_at) >
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session chưa bắt đầu.",
      });
    }

    if (
      qr.session_expires_at &&
      new Date(
        qr.session_expires_at
      ) <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session đã hết hạn.",
      });
    }
    // Cấp quyền cho thiết bị (du khách) hoặc tài khoản (app mobile cũ).
    // Mỗi cặp (tour, thiết bị) / (tour, tài khoản) chỉ có một bản ghi.
    const owner = visitorColumns(req);

    // Mỗi lượt được dùng env.tourAccessHours giờ:
    // - tour có phí: tính từ lúc thanh toán (quét lại không được cộng thêm giờ)
    // - tour miễn phí: tính từ lần quét này
    const accessMs = env.tourAccessHours * 60 * 60 * 1000;
    let accessFrom = new Date();

    if (Number(qr.session_price || 0) > 0) {
      const who = visitorCondition(req);
      const [paid] = await pool.execute(
        `
          SELECT paid_at
          FROM payments
          WHERE session_id = ?
            AND ${who.sql}
            AND status = 'paid'
          ORDER BY paid_at DESC
          LIMIT 1
        `,
        [qr.session_id, ...who.params]
      );

      if (paid[0]?.paid_at) {
        accessFrom = new Date(paid[0].paid_at);
      }
    }

    let accessUntil = new Date(accessFrom.getTime() + accessMs);

    if (
      qr.session_expires_at &&
      new Date(qr.session_expires_at) < accessUntil
    ) {
      accessUntil = new Date(qr.session_expires_at);
    }

    await pool.execute(
      `
        INSERT INTO session_authorizations (
          session_id,
          user_id,
          device_id,
          authorization_source,
          status,
          authorized_at,
          expires_at
        )
        VALUES (
          ?,
          ?,
          ?,
          'qr',
          'active',
          CURRENT_TIMESTAMP,
          ?
        )

        ON DUPLICATE KEY UPDATE
          status = 'active',
          authorization_source = 'qr',
          authorized_at = CURRENT_TIMESTAMP,
          expires_at = VALUES(expires_at),
          revoked_at = NULL
      `,
      [
        qr.session_id,
        owner.userId,
        owner.deviceId,
        accessUntil,
      ]
    );

    return res.json({
      success: true,
      message:
        "Ủy quyền session thành công.",

      authorization: {
        sessionId:
          Number(qr.session_id),

        userId: owner.userId,

        deviceId: owner.deviceId,

        expiresAt: accessUntil,

        source: "qr",

        status: "active",
      },

      session: {
        id:
          Number(qr.session_id),

        name:
          qr.session_name,

        poiId:
          qr.poi_id
            ? Number(qr.poi_id)
            : null,
      },
    });
  } catch (error) {
    console.error(
      "authorizeByQr error:",
      error
    );

    return next(error);
  }
}
/* =========================================================
   USER - GET MY ACTIVE AUTHORIZATIONS
========================================================= */

export async function getMySessionAuthorizations(
  req,
  res,
  next
) {
  try {
    const who = visitorCondition(req, "sa.");

    const [rows] = await pool.execute(
      `
        SELECT
          sa.id AS authorization_id,
          sa.session_id,
          sa.authorization_source,
          sa.status AS authorization_status,
          sa.authorized_at,
          sa.expires_at AS authorization_expires_at,

          s.name AS session_name,
          s.status AS session_status,
          s.starts_at,
          s.expires_at AS session_expires_at

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

        ORDER BY sa.authorized_at DESC
      `,
      who.params
    );

    return res.json({
      success: true,
      authorizations: rows.map((row) => ({
        authorizationId: Number(row.authorization_id),
        sessionId: Number(row.session_id),
        sessionName: row.session_name,
        source: row.authorization_source,
        status: row.authorization_status,
        authorizedAt: row.authorized_at,
        expiresAt: row.authorization_expires_at,
        session: {
          id: Number(row.session_id),
          name: row.session_name,
          status: row.session_status,
          startsAt: row.starts_at,
          expiresAt: row.session_expires_at,
        },
      })),
    });
  } catch (error) {
    console.error(
      "getMySessionAuthorizations error:",
      error
    );

    return next(error);
  }
}

/* =========================================================
   USER - CHECK AUTHORIZATION
========================================================= */

export async function getSessionAuthorization(
  req,
  res,
  next
) {
  try {
    const sessionId =
      Number(req.params.sessionId);

    if (
      !Number.isInteger(sessionId) ||
      sessionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session ID không hợp lệ.",
      });
    }

    const who = visitorCondition(req, "sa.");

    const [rows] =
      await pool.execute(
        `
          SELECT
            sa.id,
            sa.session_id,
            sa.user_id,
            sa.authorization_source,
            sa.status,
            sa.authorized_at,
            sa.expires_at,

            s.name AS session_name,
            s.status AS session_status,
            s.starts_at,
            s.expires_at AS session_expires_at

          FROM session_authorizations sa

          INNER JOIN tour_sessions s
            ON s.id = sa.session_id

          WHERE sa.session_id = ?
            AND ${who.sql}

          LIMIT 1
        `,
        [
          sessionId,
          ...who.params,
        ]
      );

    if (rows.length === 0) {
      return res.json({
        success: true,
        authorized: false,
      });
    }

    const authorization =
      rows[0];

    const expired =
      (
        authorization.expires_at &&
        new Date(
          authorization.expires_at
        ) <= new Date()
      ) ||
      (
        authorization.session_expires_at &&
        new Date(
          authorization.session_expires_at
        ) <= new Date()
      );

    const authorized =
      authorization.status ===
        "active" &&
      authorization.session_status ===
        "active" &&
      !expired;

    return res.json({
      success: true,
      authorized,

      authorization: {
        id:
          Number(authorization.id),

        sessionId:
          Number(
            authorization.session_id
          ),

        userId:
          Number(
            authorization.user_id
          ),

        source:
          authorization.authorization_source,

        status:
          authorized
            ? "active"
            : "expired",

        authorizedAt:
          authorization.authorized_at,

        expiresAt:
          authorization.expires_at,
      },

      session: {
        id:
          Number(
            authorization.session_id
          ),

        name:
          authorization.session_name,

        status:
          authorization.session_status,

        startsAt:
          authorization.starts_at,

        expiresAt:
          authorization.session_expires_at,
      },
    });
  } catch (error) {
    console.error(
      "getSessionAuthorization error:",
      error
    );

    return next(error);
  }
}
/* =========================================================
   ADMIN - LIST TOURS (trang "Tour và QR")
========================================================= */

export async function listSessions(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.price,
        s.status,
        s.is_default,
        s.starts_at,
        s.expires_at,
        s.created_at,
        (
          SELECT q.qr_token
          FROM qr_codes q
          WHERE q.session_id = s.id
            AND q.status = 'active'
            AND (q.expires_at IS NULL OR q.expires_at > NOW())
          ORDER BY q.id
          LIMIT 1
        ) AS qr_token,
        (
          SELECT COUNT(*)
          FROM qr_codes q
          WHERE q.session_id = s.id
        ) AS qr_count,
        (
          SELECT COUNT(*)
          FROM tour_presence p
          WHERE p.session_id = s.id
            AND p.last_seen_at >= NOW() - INTERVAL 2 MINUTE
        ) AS in_tour_now,
        (
          SELECT COUNT(*)
          FROM payments pa
          WHERE pa.session_id = s.id
            AND pa.status = 'paid'
        ) AS paid_count
      FROM tour_sessions s
      ORDER BY s.is_default DESC, s.id DESC
      LIMIT 100
    `);

    const now = new Date();

    return res.json({
      success: true,
      sessions: rows.map((row) => {
        // status chỉ ghi lúc tạo / khi admin kết thúc,
        // nên trạng thái thật phải xét cả thời gian.
        let state = "running";

        if (
          row.status !== "active" ||
          (row.expires_at && new Date(row.expires_at) <= now)
        ) {
          state = "ended";
        } else if (row.starts_at && new Date(row.starts_at) > now) {
          state = "upcoming";
        }

        return {
          id: Number(row.id),
          name: row.name,
          price: Number(row.price || 0),
          status: row.status,
          state,
          isDefault: Boolean(row.is_default),
          startsAt: row.starts_at,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          qrToken: row.qr_token,
          qrCount: Number(row.qr_count),
          inTourNow: Number(row.in_tour_now),
          paidCount: Number(row.paid_count),
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   ADMIN - KẾT THÚC / MỞ LẠI TOUR
========================================================= */

export async function updateSessionStatus(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    const status = req.body?.status;

    if (!Number.isInteger(sessionId) || sessionId < 1) {
      return res.status(400).json({
        success: false,
        message: "Session ID không hợp lệ.",
      });
    }

    if (!["active", "expired"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái chỉ được là active hoặc expired.",
      });
    }

    const [rows] = await pool.execute(
      "SELECT id, is_default, expires_at FROM tour_sessions WHERE id = ?",
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tour.",
      });
    }

    if (status === "expired" && rows[0].is_default) {
      return res.status(400).json({
        success: false,
        message: "Không thể kết thúc tour mặc định. Hãy đặt tour khác làm mặc định trước.",
      });
    }

    if (
      status === "active" &&
      rows[0].expires_at &&
      new Date(rows[0].expires_at) <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Tour đã quá thời gian kết thúc, không mở lại được.",
      });
    }

    await pool.execute(
      "UPDATE tour_sessions SET status = ? WHERE id = ?",
      [status, sessionId]
    );

    return res.json({ success: true, status });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   ADMIN - ĐẶT TOUR MẶC ĐỊNH
========================================================= */

export async function setDefaultSession(req, res, next) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return res.status(400).json({
      success: false,
      message: "Session ID không hợp lệ.",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT id, status, expires_at FROM tour_sessions WHERE id = ? FOR UPDATE",
      [sessionId]
    );

    if (
      rows.length === 0 ||
      rows[0].status !== "active" ||
      (rows[0].expires_at && new Date(rows[0].expires_at) <= new Date())
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ tour đang chạy mới được đặt làm mặc định.",
      });
    }

    await connection.execute("UPDATE tour_sessions SET is_default = (id = ?)", [
      sessionId,
    ]);
    await connection.commit();

    return res.json({ success: true, defaultSessionId: sessionId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return next(error);
  } finally {
    connection?.release();
  }
}
