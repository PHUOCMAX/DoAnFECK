import crypto from "crypto";
import pool from "../config/db.js";

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

    const sessionToken = generateToken();

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
          session_token,
          name,
          status,
          starts_at,
          expires_at,
          created_by
        )
        VALUES (?, ?, 'active', ?, ?, ?)
      `,
      [
        sessionToken,
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
        sessionToken,
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

    await pool.execute(
      `
        INSERT INTO session_authorizations (
          session_id,
          user_id,
          authorization_source,
          status,
          authorized_at,
          expires_at
        )
        VALUES (
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
        req.auth.userId,
        qr.session_expires_at,
      ]
    );

    return res.json({
      success: true,
      message:
        "Ủy quyền session thành công.",

      authorization: {
        sessionId:
          Number(qr.session_id),

        userId:
          Number(req.auth.userId),

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
            AND sa.user_id = ?

          LIMIT 1
        `,
        [
          sessionId,
          req.auth.userId,
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