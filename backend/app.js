import cors from "cors";
import express from "express";
import path from "path";

import agentRoutes from "./routes/agentRoutes.js";

import { env } from "./config/env.js";
import pool from "./config/db.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import adminPoiRoutes from "./routes/adminPoiRoutes.js";
import poiRoutes from "./routes/poiRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";

import {
  createSession,
  createQrCode,
  authorizeByQr,
  getSessionAuthorization,
} from "./controllers/sessionController.js";

import { requireAuth } from "./middleware/authMiddleware.js";
import { requireAdmin } from "./middleware/adminMiddleware.js";

/* =========================================================
   HELPERS
========================================================= */

function corsOptions() {
  return {
    origin(origin, callback) {
      if (
        !origin ||
        env.corsOrigins.length === 0 ||
        env.corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      const error = new Error(
        "Origin không được phép truy cập API."
      );

      error.statusCode = 403;

      return callback(error);
    },
  };
}

/* =========================================================
   PAYMENT MIDDLEWARE
   Session có price > 0 thì user phải paid mới authorize QR.
========================================================= */

async function requirePaidSession(req, res, next) {
  try {
    const sessionId = Number(
      req.body?.sessionId || req.body?.qrSessionId
    );

    /*
     * Với QR hiện tại, sessionId không nằm trong body.
     * Ta lấy qrToken để xác định session.
     */
    const qrToken = req.body?.qrToken;

    if (!qrToken && (!Number.isInteger(sessionId) || sessionId < 1)) {
      return next();
    }

    let resolvedSessionId = sessionId;

    if (qrToken) {
      const [rows] = await pool.execute(
        `
          SELECT session_id
          FROM qr_codes
          WHERE qr_token = ?
          LIMIT 1
        `,
        [qrToken.trim()]
      );

      if (rows.length === 0) {
        return next();
      }

      resolvedSessionId = Number(rows[0].session_id);
    }

    const [sessions] = await pool.execute(
      `
        SELECT id, price, status
        FROM tour_sessions
        WHERE id = ?
        LIMIT 1
      `,
      [resolvedSessionId]
    );

    if (sessions.length === 0) {
      return next();
    }

    const session = sessions[0];
    const price = Number(session.price || 0);

    // Session miễn phí.
    if (price <= 0) {
      return next();
    }

    const [payments] = await pool.execute(
      `
        SELECT
          id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          paid_at
        FROM payments
        WHERE session_id = ?
          AND user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [
        resolvedSessionId,
        req.auth.userId,
      ]
    );

    const payment = payments[0];

    if (!payment || payment.status !== "paid") {
      return res.status(402).json({
        success: false,
        message: "Bạn cần thanh toán trước khi vào session.",
        paymentRequired: true,
        session: {
          id: Number(session.id),
          price,
          currency: "VND",
        },
        payment: payment
          ? {
              id: Number(payment.id),
              amount: Number(payment.amount),
              method: payment.method,
              status: payment.status,
            }
          : null,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PAYMENT - CREATE
========================================================= */

async function createPayment(req, res, next) {
  try {
    const {
      sessionId,
      method,
      note = null,
    } = req.body ?? {};

    const normalizedSessionId = Number(sessionId);

    if (
      !Number.isInteger(normalizedSessionId) ||
      normalizedSessionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Session ID không hợp lệ.",
      });
    }

    if (!["online", "offline"].includes(method)) {
      return res.status(400).json({
        success: false,
        message:
          "Phương thức thanh toán phải là online hoặc offline.",
      });
    }

    const [sessions] = await pool.execute(
      `
        SELECT
          id,
          name,
          price,
          status,
          starts_at,
          expires_at
        FROM tour_sessions
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedSessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy session.",
      });
    }

    const session = sessions[0];
    const amount = Number(session.price || 0);

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Session không còn hoạt động.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Session này không yêu cầu thanh toán.",
      });
    }

    /*
     * Không tạo thêm payment nếu user đã paid.
     */
    const [paidPayments] = await pool.execute(
      `
        SELECT
          id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          paid_at,
          created_at
        FROM payments
        WHERE session_id = ?
          AND user_id = ?
          AND status = 'paid'
        ORDER BY id DESC
        LIMIT 1
      `,
      [
        normalizedSessionId,
        req.auth.userId,
      ]
    );

    if (paidPayments.length > 0) {
      return res.json({
        success: true,
        message: "Session đã được thanh toán.",
        payment: {
          ...paidPayments[0],
          id: Number(paidPayments[0].id),
          amount: Number(paidPayments[0].amount),
        },
      });
    }

    /*
     * Online hiện là payment foundation/demo.
     * Chưa kết nối VNPay/MoMo/ZaloPay.
     */
    const provider =
      method === "online" ? "demo" : "offline";

    const transactionCode =
      `${method.toUpperCase()}-${Date.now()}-${req.auth.userId}`;

    const [result] = await pool.execute(
      `
        INSERT INTO payments (
          session_id,
          user_id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          note
        )
        VALUES (?, ?, ?, 'VND', ?, 'pending', ?, ?, ?)
      `,
      [
        normalizedSessionId,
        req.auth.userId,
        amount,
        method,
        provider,
        transactionCode,
        note,
      ]
    );

    const [rows] = await pool.execute(
      `
        SELECT
          id,
          session_id,
          user_id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          note,
          paid_at,
          created_at,
          updated_at
        FROM payments
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message:
        method === "online"
          ? "Tạo yêu cầu thanh toán online thành công."
          : "Tạo yêu cầu thanh toán offline thành công.",
      payment: {
        ...rows[0],
        id: Number(rows[0].id),
        sessionId: Number(rows[0].session_id),
        userId: Number(rows[0].user_id),
        amount: Number(rows[0].amount),
      },
      paymentProvider:
        method === "online"
          ? {
              type: "demo",
              integrated: false,
              message:
                "Online payment hiện đang ở chế độ demo. Chưa kết nối cổng thanh toán thực tế.",
            }
          : null,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PAYMENT - GET MY PAYMENT
========================================================= */

async function getMyPayment(req, res, next) {
  try {
    const sessionId = Number(
      req.params.sessionId
    );

    if (
      !Number.isInteger(sessionId) ||
      sessionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Session ID không hợp lệ.",
      });
    }

    const [rows] = await pool.execute(
      `
        SELECT
          id,
          session_id,
          user_id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          note,
          paid_at,
          created_at,
          updated_at
        FROM payments
        WHERE session_id = ?
          AND user_id = ?
        ORDER BY id DESC
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
        payment: null,
      });
    }

    const payment = rows[0];

    return res.json({
      success: true,
      payment: {
        ...payment,
        id: Number(payment.id),
        sessionId: Number(payment.session_id),
        userId: Number(payment.user_id),
        amount: Number(payment.amount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PAYMENT - ADMIN CONFIRM
   Dùng để xác nhận offline hoặc demo online.
========================================================= */

async function confirmPayment(req, res, next) {
  try {
    const paymentId = Number(
      req.params.paymentId
    );

    if (
      !Number.isInteger(paymentId) ||
      paymentId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment ID không hợp lệ.",
      });
    }

    const [payments] = await pool.execute(
      `
        SELECT
          id,
          session_id,
          user_id,
          amount,
          method,
          status
        FROM payments
        WHERE id = ?
        LIMIT 1
      `,
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy payment.",
      });
    }

    const payment = payments[0];

    if (payment.status === "paid") {
      return res.json({
        success: true,
        message: "Payment đã được xác nhận trước đó.",
        payment: {
          id: Number(payment.id),
          status: "paid",
        },
      });
    }

    await pool.execute(
      `
        UPDATE payments
        SET
          status = 'paid',
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [paymentId]
    );

    return res.json({
      success: true,
      message: "Xác nhận thanh toán thành công.",
      payment: {
        id: Number(payment.id),
        sessionId: Number(payment.session_id),
        userId: Number(payment.user_id),
        amount: Number(payment.amount),
        method: payment.method,
        status: "paid",
      },
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   SESSION - UPDATE PRICE
========================================================= */

async function updateSessionPrice(req, res, next) {
  try {
    const sessionId = Number(
      req.params.sessionId
    );

    const price = Number(
      req.body?.price
    );

    if (
      !Number.isInteger(sessionId) ||
      sessionId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Session ID không hợp lệ.",
      });
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Giá session phải >= 0.",
      });
    }

    await pool.execute(
      `
        UPDATE tour_sessions
        SET price = ?
        WHERE id = ?
      `,
      [
        price,
        sessionId,
      ]
    );

    return res.json({
      success: true,
      message: "Cập nhật giá session thành công.",
      session: {
        id: sessionId,
        price,
        currency: "VND",
      },
    });
  } catch (error) {
    return next(error);
  }
}

// =========================================================
// ADMIN MONITORING
// =========================================================

async function getMonitoringStats(req, res, next) {
  try {
    const [
      [users],
      [pois],
      [sessions],
      [payments],
      [checkins],
      [authorizations],
      [revenue],
      [recentPayments],
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS total
        FROM users
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'approved') AS approved,
          SUM(status = 'pending') AS pending,
          SUM(status = 'rejected') AS rejected
        FROM pois
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'active') AS active,
          SUM(status = 'expired') AS expired,
          SUM(status = 'revoked') AS revoked
        FROM tour_sessions
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'paid') AS paid,
          SUM(status = 'pending') AS pending,
          SUM(status = 'failed') AS failed,
          SUM(status = 'cancelled') AS cancelled
        FROM payments
      `),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM checkins
      `),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM session_authorizations
        WHERE status = 'active'
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE status = 'paid'
      `),

      pool.query(`
        SELECT
          id,
          user_id,
          session_id,
          amount,
          method,
          status,
          created_at
        FROM payments
        ORDER BY id DESC
        LIMIT 5
      `),
    ]);

    return res.json({
      success: true,

      stats: {
        users: {
          total: Number(users[0].total),
        },

        pois: {
          total: Number(pois[0].total || 0),
          approved: Number(pois[0].approved || 0),
          pending: Number(pois[0].pending || 0),
          rejected: Number(pois[0].rejected || 0),
        },

        sessions: {
          total: Number(sessions[0].total || 0),
          active: Number(sessions[0].active || 0),
          expired: Number(sessions[0].expired || 0),
          revoked: Number(sessions[0].revoked || 0),
        },

        payments: {
          total: Number(payments[0].total || 0),
          paid: Number(payments[0].paid || 0),
          pending: Number(payments[0].pending || 0),
          failed: Number(payments[0].failed || 0),
          cancelled: Number(payments[0].cancelled || 0),
        },

        checkins: {
          total: Number(checkins[0].total || 0),
        },

        activeAuthorizations: Number(
          authorizations[0].total || 0
        ),

        revenue: Number(
          revenue[0].total || 0
        ),
      },

      recentPayments: recentPayments.map(
        (payment) => ({
          id: Number(payment.id),
          userId: Number(payment.user_id),
          sessionId: Number(payment.session_id),
          amount: Number(payment.amount),
          method: payment.method,
          status: payment.status,
          createdAt: payment.created_at,
        })
      ),

      system: {
        database: true,
        api: true,
      },

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}
/* =========================================================
   APP
========================================================= */

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    res.setHeader(
      "Referrer-Policy",
      "no-referrer"
    );

    next();
  });

  app.use(cors(corsOptions()));

  app.use(
    "/uploads",
    express.static(
      path.resolve(
        process.cwd(),
        "uploads"
      )
    )
  );

  app.use(
    express.json({
      limit: "100kb",
    })
  );

  // =========================
  // HEALTH
  // =========================

  app.get(
    "/api/health",
    async (req, res, next) => {
      try {
        const [rows] =
          await pool.query(
            "SELECT 1 AS result"
          );

        return res.json({
          success: true,
          message:
            "Backend and MySQL are connected",
          database:
            rows[0].result === 1,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  // =========================
  // AUTH
  // =========================

  app.use(
    "/api/auth",
    authRoutes
  );

  // =========================
  // USER
  // =========================

  app.use(
    "/api/agent",
    agentRoutes
  );

  app.use(
    "/api/checkins",
    checkinRoutes
  );

  app.use(
    "/api/pois",
    poiRoutes
  );

  // =========================
  // SESSION + QR
  // =========================

  // Admin tạo session
  app.post(
    "/api/sessions",
    requireAuth,
    requireAdmin,
    createSession
  );

  // Admin cập nhật giá session
  app.patch(
    "/api/sessions/:sessionId/price",
    requireAuth,
    requireAdmin,
    updateSessionPrice
  );

  // Admin tạo QR cho session
  app.post(
    "/api/sessions/:sessionId/qr",
    requireAuth,
    requireAdmin,
    createQrCode
  );

  // User authorize session bằng QR
  // Session có price > 0 => phải paid trước
  app.post(
    "/api/sessions/authorize",
    requireAuth,
    requirePaidSession,
    authorizeByQr
  );

  // User kiểm tra quyền của mình
  app.get(
    "/api/sessions/:sessionId/authorization",
    requireAuth,
    getSessionAuthorization
  );

  // =========================
  // PAYMENT
  // =========================

  // User tạo payment
  app.post(
    "/api/payments",
    requireAuth,
    createPayment
  );

  // User xem payment của mình
  app.get(
    "/api/payments/:sessionId",
    requireAuth,
    getMyPayment
  );

  // Admin xác nhận payment
  app.post(
    "/api/payments/:paymentId/confirm",
    requireAuth,
    requireAdmin,
    confirmPayment
  );

  // =========================
  // ADMIN
  // =========================
// Monitoring dashboard
app.get(
  "/api/admin/monitoring",
  requireAuth,
  requireAdmin,
  getMonitoringStats
);
  app.use(
    "/api/admin",
    adminPoiRoutes
  );

  app.use(
    "/api/admin/users",
    adminUserRoutes
  );

  // =========================
  // ERROR HANDLERS
  // =========================

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}