import cors from "cors";
import jwt from "jsonwebtoken";
import express from "express";
import path from "path";
import { VNPay } from "vnpay";
import {
  IpnSuccess,
  IpnOrderNotFound,
  InpOrderAlreadyConfirmed,
  IpnInvalidAmount,
  IpnFailChecksum,
  IpnUnknownError,
} from "vnpay";

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
import adminDeviceRoutes from "./routes/adminDeviceRoutes.js";

import {
  createSession,
  createQrCode,
  authorizeByQr,
  getSessionAuthorization,
  getMySessionAuthorizations,
  listSessions,
  updateSessionStatus,
  setDefaultSession,
} from "./controllers/sessionController.js";

import { requireAuth } from "./middleware/authMiddleware.js";
import { requireAdmin } from "./middleware/adminMiddleware.js";
import {
  requireVisitor,
  visitorColumns,
  visitorCondition,
} from "./middleware/visitorMiddleware.js";

/* =========================================================
   HELPERS
========================================================= */
function createVnpayClient() {
  if (!env.vnpay.enabled) {
    throw new Error("VNPAY integration is disabled.");
  }

  const {
    tmnCode,
    secureSecret,
  } = env.vnpay;

  if (!tmnCode || !secureSecret) {
    throw new Error("VNPAY credentials are not configured.");
  }

  return new VNPay({
    vnpayHost: "https://sandbox.vnpayment.vn",
    tmnCode,
    secureSecret,
    testMode: true,
    hashAlgorithm: "SHA512",
    endpoints: {
      paymentEndpoint: "paymentv2/vpcpay.html",
    },
  });
}
// Chỉ cho redirect về deep link của app (Expo Go hoặc bản build),
// tránh biến Return URL thành open redirect.
const APP_RETURN_URL_PATTERN = /^(exps?|multilingualtour):\/\/[^\s]{1,300}$/;

function isAllowedAppReturnUrl(value) {
  return (
    typeof value === "string" &&
    APP_RETURN_URL_PATTERN.test(value)
  );
}

function decodeAppReturnUrl(encoded) {
  try {
    const value = Buffer.from(String(encoded ?? ""), "base64url").toString("utf8");
    return isAllowedAppReturnUrl(value) ? value : null;
  } catch {
    return null;
  }
}

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
   Tour có giá thì du khách (thiết bị) phải có một khoản paid mới được vào.
   QR và hạn tour được kiểm tra TRƯỚC, để không bao giờ đòi tiền
   cho tour đã hết hạn hoặc chưa bắt đầu.
========================================================= */

async function requirePaidSession(req, res, next) {
  try {
    const qrToken =
      typeof req.body?.qrToken === "string"
        ? req.body.qrToken.trim()
        : "";

    if (!qrToken) {
      return next();
    }

    const [rows] = await pool.execute(
      `
        SELECT
          q.status AS qr_status,
          q.expires_at AS qr_expires_at,
          s.id,
          s.price,
          s.status,
          s.starts_at,
          s.expires_at
        FROM qr_codes q
        INNER JOIN tour_sessions s
          ON s.id = q.session_id
        WHERE q.qr_token = ?
        LIMIT 1
      `,
      [qrToken]
    );

    // QR không tồn tại / không hợp lệ: để authorizeByQr trả lỗi chi tiết.
    if (rows.length === 0) {
      return next();
    }

    const session = rows[0];
    const now = new Date();
    const usable =
      session.qr_status === "active" &&
      (!session.qr_expires_at || new Date(session.qr_expires_at) > now) &&
      session.status === "active" &&
      (!session.starts_at || new Date(session.starts_at) <= now) &&
      (!session.expires_at || new Date(session.expires_at) > now);

    if (!usable) {
      return next();
    }

    const price = Number(session.price || 0);

    if (price <= 0) {
      return next();
    }

    const who = visitorCondition(req);

    // Chỉ cần có một khoản paid (tiền mặt hay VNPAY đều được).
    const [paid] = await pool.execute(
      `
        SELECT id
        FROM payments
        WHERE session_id = ?
          AND ${who.sql}
          AND status = 'paid'
          -- Một lần trả tiền chỉ dùng được trong tourAccessHours giờ.
          AND paid_at >= NOW() - INTERVAL ? MINUTE
        LIMIT 1
      `,
      [session.id, ...who.params, Math.round(env.tourAccessHours * 60)]
    );

    if (paid.length > 0) {
      return next();
    }

    const [latest] = await pool.execute(
      `
        SELECT id, amount, method, status
        FROM payments
        WHERE session_id = ?
          AND ${who.sql}
          -- Khoản paid ở đây chắc chắn đã quá hạn (còn hạn thì đã cho qua):
          -- không gửi về, để trang thanh toán cho trả lượt mới.
          AND status <> 'paid'
        ORDER BY id DESC
        LIMIT 1
      `,
      [session.id, ...who.params]
    );

    const payment = latest[0];

    return res.status(402).json({
      success: false,
      message: "Bạn cần thanh toán trước khi vào tour.",
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
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   CẤP QUYỀN NGAY KHI THANH TOÁN THÀNH CÔNG
   Trả tiền xong là có quyền tour, không cần quét lại QR.
   Quyền kéo dài env.tourAccessHours tính từ lúc trả (không vượt hạn tour).
========================================================= */

async function grantAccessForPaidPayment(paymentId) {
  const [rows] = await pool.execute(
    `
      SELECT p.session_id, p.user_id, p.device_id, p.paid_at, s.expires_at
      FROM payments p
      INNER JOIN tour_sessions s ON s.id = p.session_id
      WHERE p.id = ?
        AND p.status = 'paid'
        AND p.paid_at IS NOT NULL
    `,
    [paymentId]
  );

  const payment = rows[0];

  if (!payment || (!payment.device_id && !payment.user_id)) {
    return;
  }

  let accessUntil = new Date(
    new Date(payment.paid_at).getTime() + env.tourAccessHours * 60 * 60 * 1000
  );

  if (payment.expires_at && new Date(payment.expires_at) < accessUntil) {
    accessUntil = new Date(payment.expires_at);
  }

  if (accessUntil <= new Date()) {
    return;
  }

  await pool.execute(
    `
      INSERT INTO session_authorizations (
        session_id, user_id, device_id, authorization_source,
        status, authorized_at, expires_at
      )
      VALUES (?, ?, ?, 'qr', 'active', CURRENT_TIMESTAMP, ?)
      ON DUPLICATE KEY UPDATE
        status = 'active',
        authorized_at = CURRENT_TIMESTAMP,
        expires_at = VALUES(expires_at),
        revoked_at = NULL
    `,
    [
      payment.session_id,
      payment.device_id ? null : payment.user_id,
      payment.device_id,
      accessUntil,
    ]
  );
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
      appReturnUrl = null,
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

    const now = new Date();

    if (
      session.status !== "active" ||
      (session.expires_at && new Date(session.expires_at) <= now)
    ) {
      return res.status(400).json({
        success: false,
        message: "Tour đã kết thúc, không thể thanh toán.",
      });
    }

    if (session.starts_at && new Date(session.starts_at) > now) {
      return res.status(400).json({
        success: false,
        message: "Tour chưa bắt đầu.",
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
          AND ${visitorCondition(req).sql}
          AND status = 'paid'
          AND paid_at >= NOW() - INTERVAL ? MINUTE
        ORDER BY id DESC
        LIMIT 1
      `,
      [
        normalizedSessionId,
        ...visitorCondition(req).params,
        Math.round(env.tourAccessHours * 60),
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

    if (method === "offline") {
      const [waiting] = await pool.execute(
        `
          SELECT id, session_id, user_id, amount, currency, method, status,
                 provider, transaction_code, note, paid_at, created_at, updated_at
          FROM payments
          WHERE session_id = ?
            AND ${visitorCondition(req).sql}
            AND method = 'offline'
            AND status = 'pending'
          ORDER BY id DESC
          LIMIT 1
        `,
        [normalizedSessionId, ...visitorCondition(req).params]
      );

      if (waiting.length > 0) {
        return res.json({
          success: true,
          message: "Bạn đã có yêu cầu thanh toán tiền mặt đang chờ xác nhận.",
          payment: {
            ...waiting[0],
            id: Number(waiting[0].id),
            sessionId: Number(waiting[0].session_id),
            userId: waiting[0].user_id ? Number(waiting[0].user_id) : null,
            amount: Number(waiting[0].amount),
          },
          paymentUrl: null,
          paymentProvider: null,
        });
      }
    }

        if (method === "online" && !env.vnpay.enabled) {
      return res.status(503).json({
        success: false,
        message:
          "Thanh toán VNPAY chưa được bật. Vui lòng thử lại sau.",
      });
    }

        const provider =
      method === "online" ? "vnpay" : "offline";

    // Mã giao dịch VNPAY cần duy nhất trong ngày.
    const transactionCode =
      method === "online"
        ? `VNP${Date.now()}${Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, "0")}`
        : `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const owner = visitorColumns(req);

    const [result] = await pool.execute(
      `
        INSERT INTO payments (
          session_id,
          user_id,
          device_id,
          amount,
          currency,
          method,
          status,
          provider,
          transaction_code,
          note
        )
        VALUES (?, ?, ?, ?, 'VND', ?, 'pending', ?, ?, ?)
      `,
      [
        normalizedSessionId,
        owner.userId,
        owner.deviceId,
        amount,
        method,
        provider,
        transactionCode,
        note,
      ]
    );

    let paymentUrl = null;

    if (method === "online") {
      const vnpay = createVnpayClient();

      const remoteIp = req.socket.remoteAddress || "";
const clientIp = remoteIp.startsWith("::ffff:")
  ? remoteIp.slice(7)
  : remoteIp;

      paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_OrderInfo: `Thanh toan tour ${normalizedSessionId}`,
        vnp_TxnRef: transactionCode,
        vnp_IpAddr: clientIp,
        // Mobile gửi kèm deep link của app: gắn vào path (không phải query)
        // để VNPAY trả về không làm sai chữ ký.
        vnp_ReturnUrl: isAllowedAppReturnUrl(appReturnUrl)
          ? `${env.vnpay.returnUrl.replace(/\/+$/, "")}/app/${Buffer.from(
              appReturnUrl
            ).toString("base64url")}`
          : env.vnpay.returnUrl,
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
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message:
        method === "online"
          ? "Tạo yêu cầu thanh toán VNPAY thành công."
          : "Tạo yêu cầu thanh toán offline thành công.",
      payment: {
        ...rows[0],
        id: Number(rows[0].id),
        sessionId: Number(rows[0].session_id),
        userId: rows[0].user_id ? Number(rows[0].user_id) : null,
        amount: Number(rows[0].amount),
      },
      paymentUrl,
      paymentProvider:
        method === "online"
          ? {
              type: "vnpay",
              integrated: true,
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
          AND ${visitorCondition(req).sql}
          -- Khoản paid quá thời hạn mỗi lượt coi như không còn.
          AND (status <> 'paid' OR paid_at >= NOW() - INTERVAL ? MINUTE)
        -- Còn khoản paid hợp lệ thì trả khoản đó, không thì khoản mới nhất.
        ORDER BY (status = 'paid') DESC, id DESC
        LIMIT 1
      `,
      [
        sessionId,
        ...visitorCondition(req).params,
        Math.round(env.tourAccessHours * 60),
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
        userId: payment.user_id ? Number(payment.user_id) : null,
        amount: Number(payment.amount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PAYMENT - USER DEMO RESULT
   Chỉ áp dụng cho payment online provider=demo của user hiện tại.
========================================================= */

async function setDemoPaymentResult(req, res, next) {
  try {
    const paymentId = Number(req.params.paymentId);
    const { status } = req.body ?? {};

    if (!Number.isInteger(paymentId) || paymentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Payment ID không hợp lệ.",
      });
    }

    if (!["paid", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái demo chỉ được là paid hoặc failed.",
      });
    }

    const [payments] = await pool.execute(
      `
        SELECT id, session_id, user_id, amount, currency, method, status, provider
        FROM payments
        WHERE id = ? AND ${visitorCondition(req).sql}
        LIMIT 1
      `,
      [paymentId, ...visitorCondition(req).params]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thanh toán của bạn.",
      });
    }

    const payment = payments[0];
    if (payment.method !== "online" || payment.provider !== "demo") {
      return res.status(403).json({
        success: false,
        message: "Chỉ hỗ trợ mô phỏng kết quả cho đơn online demo.",
      });
    }

    if (payment.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "Đơn thanh toán này không còn ở trạng thái chờ.",
        payment: { id: Number(payment.id), status: payment.status },
      });
    }

    await pool.execute(
      `
        UPDATE payments
        SET status = ?,
            paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `,
      [status, status, paymentId]
    );

    if (status === "paid") {
      await grantAccessForPaidPayment(paymentId);
    }

    return res.json({
      success: true,
      message: status === "paid"
        ? "Mô phỏng thanh toán thành công."
        : "Mô phỏng thanh toán thất bại.",
      payment: {
        id: Number(payment.id),
        sessionId: Number(payment.session_id),
        userId: Number(payment.user_id),
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status,
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
        if (payment.method === "online") {
      return res.status(403).json({
        success: false,
        message:
          "Không thể xác nhận thủ công payment online. Giao dịch phải được xác minh qua cổng thanh toán.",
      });
    }
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

    await grantAccessForPaidPayment(paymentId);

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
      [presence],
      [presenceByTour],
    ] = await Promise.all([
      // online = có gọi API trong 5 phút gần nhất (last_seen_at do requireAuth ghi)
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(last_seen_at >= NOW() - INTERVAL 5 MINUTE) AS online
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
          -- status chỉ được ghi lúc tạo, nên hết hạn phải tính theo expires_at
          SUM(
            status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())
          ) AS active,
          SUM(
            status = 'expired'
            OR (status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW())
          ) AS expired,
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

      // Số người dùng (không phải số bản ghi) đang có quyền tour còn hiệu lực,
      // cùng điều kiện với requireTourAuthorization.
      pool.query(`
        SELECT COUNT(DISTINCT COALESCE(sa.device_id, CONCAT('u', sa.user_id))) AS total
        FROM session_authorizations sa
        INNER JOIN tour_sessions s
          ON s.id = sa.session_id
        WHERE sa.status = 'active'
          AND s.status = 'active'
          AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
          AND (s.starts_at IS NULL OR s.starts_at <= NOW())
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
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

      // Thiết bị đang trong tour = gửi heartbeat trong 2 phút gần nhất.
      pool.query(`
        SELECT
          COUNT(DISTINCT CASE
            WHEN last_seen_at >= NOW() - INTERVAL 2 MINUTE THEN device_id
          END) AS in_tour_now,
          COUNT(DISTINCT CASE
            WHEN last_seen_at >= CONVERT_TZ(
              DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')),
              '+07:00',
              '+00:00'
            ) THEN device_id
          END) AS joined_today
        FROM tour_presence
      `),

      pool.query(`
        SELECT s.id, s.name, COUNT(p.device_id) AS in_tour_now
        FROM tour_presence p
        INNER JOIN tour_sessions s ON s.id = p.session_id
        WHERE p.last_seen_at >= NOW() - INTERVAL 2 MINUTE
        GROUP BY s.id, s.name
        ORDER BY in_tour_now DESC
        LIMIT 10
      `),
    ]);

    return res.json({
      success: true,

      stats: {
        users: {
          total: Number(users[0].total),
          online: Number(users[0].online || 0),
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

        presence: {
          inTourNow: Number(presence[0].in_tour_now || 0),
          joinedToday: Number(presence[0].joined_today || 0),
          byTour: presenceByTour.map((row) => ({
            sessionId: Number(row.id),
            name: row.name,
            inTourNow: Number(row.in_tour_now),
          })),
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
          userId: payment.user_id ? Number(payment.user_id) : null,
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
  // Chỉ tin X-Forwarded-For từ proxy trong mạng nội bộ (nginx trong Docker),
  // không phụ thuộc IP cụ thể mà Docker cấp cho container.
  app.set("trust proxy", "loopback, uniquelocal");

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

  // Admin: danh sách tour (trang "Tour và QR")
  app.get(
    "/api/sessions",
    requireAuth,
    requireAdmin,
    listSessions
  );

  // Admin: kết thúc / mở lại tour
  app.patch(
    "/api/sessions/:sessionId/status",
    requireAuth,
    requireAdmin,
    updateSessionStatus
  );

  // Admin: đặt tour mặc định (QR dùng chung)
  app.patch(
    "/api/sessions/:sessionId/default",
    requireAuth,
    requireAdmin,
    setDefaultSession
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
    requireVisitor,
    requirePaidSession,
    authorizeByQr
  );
// User lấy danh sách session đã được cấp quyền
app.get(
  "/api/sessions/my-authorizations",
  requireVisitor,
  getMySessionAuthorizations
);
  // User kiểm tra quyền của mình
  app.get(
    "/api/sessions/:sessionId/authorization",
    requireVisitor,
    getSessionAuthorization
  );

  // =========================
  // PAYMENT
  // =========================
  // VNPAY IPN: xác minh giao dịch từ máy chủ VNPAY.
  // VNPAY Return: xác minh chữ ký, cập nhật payment còn pending
  // (sandbox thường không gọi IPN), rồi chuyển về frontend.
  // Điều kiện status = 'pending' giúp IPN và Return không ghi đè nhau.

  // /return/app/:target: giao dịch tạo từ mobile, redirect về deep link của app.
  app.get(
    ["/api/payments/vnpay/return", "/api/payments/vnpay/return/app/:target"],
    async (req, res) => {
    const appReturnUrl = req.params.target
      ? decodeAppReturnUrl(req.params.target)
      : null;
    const resultUrl = new URL(appReturnUrl || env.vnpay.frontendReturnUrl);

    if (!env.vnpay.enabled) {
      resultUrl.searchParams.set("status", "unavailable");
      return res.redirect(resultUrl.toString());
    }

    try {
      const vnpay = createVnpayClient();
      const verified = vnpay.verifyReturnUrl(req.query);

      if (!verified.isVerified) {
        resultUrl.searchParams.set("status", "invalid");
        return res.redirect(resultUrl.toString());
      }

      const transactionCode = String(verified.vnp_TxnRef ?? "");

      const [payments] = await pool.execute(
        `SELECT id, session_id, device_id, amount, method, status, provider
         FROM payments
         WHERE transaction_code = ?
         LIMIT 1`,
        [transactionCode]
      );

      if (
        payments.length === 0 ||
        payments[0].method !== "online" ||
        payments[0].provider !== "vnpay"
      ) {
        resultUrl.searchParams.set("status", "not_found");
        return res.redirect(resultUrl.toString());
      }

      const isSuccess =
  verified.isSuccess &&
  String(verified.vnp_ResponseCode) === "00" &&
  String(verified.vnp_TransactionStatus) === "00";

      const payment = payments[0];
      const amountMatches =
        Math.round(Number(payment.amount)) ===
        Math.round(Number(verified.vnp_Amount));

      if (payment.status === "pending") {
        if (isSuccess && amountMatches) {
          await pool.execute(
            `UPDATE payments
             SET status = 'paid',
                 paid_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'pending'`,
            [payment.id]
          );
        } else if (!isSuccess) {
          await pool.execute(
            `UPDATE payments
             SET status = 'failed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'pending'`,
            [payment.id]
          );
        }
      }

      await grantAccessForPaidPayment(payment.id);

      resultUrl.searchParams.set(
        "status",
        isSuccess && amountMatches ? "success" : "failed"
      );
      resultUrl.searchParams.set(
        "sessionId",
        String(payments[0].session_id)
      );

      // Ngân hàng có thể đưa khách về một trình duyệt khác (ví dụ quét QR
      // bằng Zalo, quay về Safari). Kèm mã ký ngắn hạn để trình duyệt đó
      // nhận lại đúng mã thiết bị đã thanh toán.
      if (payments[0].device_id) {
        resultUrl.searchParams.set(
          "device",
          jwt.sign(
            { purpose: "device-transfer", deviceId: payments[0].device_id },
            env.jwtSecret,
            { expiresIn: "15m" }
          )
        );
      }

      return res.redirect(resultUrl.toString());
    } catch (error) {
      console.error("VNPAY Return verification failed:", error.message);
      resultUrl.searchParams.set("status", "error");
      return res.redirect(resultUrl.toString());
    }
  }
  );

  app.get("/api/payments/vnpay/ipn", async (req, res) => {
    if (!env.vnpay.enabled) {
      return res.status(503).json({
        RspCode: "99",
        Message: "VNPAY integration is disabled",
      });
    }

    try {
      const vnpay = createVnpayClient();
      console.error("[VNPAY IPN amount diagnostic]", {
  amount: req.query.vnp_Amount,
  amountType: typeof req.query.vnp_Amount,
});
      const verified = vnpay.verifyIpnCall(req.query);

      if (!verified.isVerified) {
        return res.json(IpnFailChecksum);
      }

      const transactionCode = String(verified.vnp_TxnRef ?? "");

      if (!transactionCode) {
        return res.json(IpnOrderNotFound);
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [payments] = await connection.execute(
          `
            SELECT id, amount, method, status, provider
            FROM payments
            WHERE transaction_code = ?
            LIMIT 1
            FOR UPDATE
          `,
          [transactionCode]
        );

        if (payments.length === 0) {
          await connection.rollback();
          return res.json(IpnOrderNotFound);
        }

        const payment = payments[0];

        if (
          payment.method !== "online" ||
          payment.provider !== "vnpay"
        ) {
          await connection.rollback();
          return res.json(IpnOrderNotFound);
        }

        if (payment.status === "paid") {
  await connection.rollback();
  return res.json(InpOrderAlreadyConfirmed);
}

if (payment.status !== "pending") {
  await connection.rollback();
  return res.json(InpOrderAlreadyConfirmed);
}

        const paymentAmount = Math.round(Number(payment.amount));
const vnpayAmount = Math.round(Number(verified.vnp_Amount));

if (
  !Number.isFinite(paymentAmount) ||
  !Number.isFinite(vnpayAmount) ||
  paymentAmount <= 0 ||
  paymentAmount !== vnpayAmount
) {
  await connection.rollback();
  return res.json(IpnInvalidAmount);
}

        if (
  verified.isSuccess &&
  String(verified.vnp_ResponseCode) === "00" &&
  String(verified.vnp_TransactionStatus) === "00"
) {
          await connection.execute(
            `
              UPDATE payments
              SET status = 'paid',
                  paid_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'pending'
            `,
            [payment.id]
          );
        } else {
          await connection.execute(
            `
              UPDATE payments
              SET status = 'failed',
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'pending'
            `,
            [payment.id]
          );
        }

        await connection.commit();
        await grantAccessForPaidPayment(payment.id);
        return res.json(IpnSuccess);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("VNPAY IPN processing failed:", error.message);

      return res.status(500).json(IpnUnknownError);
    }
  });
  // Trình duyệt quay về từ VNPAY đổi mã ký lấy mã thiết bị đã thanh toán.
  app.post("/api/device/claim", (req, res) => {
    try {
      const payload = jwt.verify(String(req.body?.token || ""), env.jwtSecret);

      if (payload?.purpose !== "device-transfer" || !payload.deviceId) {
        throw new Error("invalid");
      }

      return res.json({ success: true, deviceId: payload.deviceId });
    } catch {
      return res.status(400).json({
        success: false,
        message: "Mã chuyển thiết bị không hợp lệ hoặc đã hết hạn.",
      });
    }
  });

  // Heartbeat: thiết bị đang mở app trong tour gửi mỗi ~60 giây.
  // Ghi nhận cho mọi tour mà thiết bị đang có quyền hợp lệ.
  app.post(
    "/api/tour/heartbeat",
    requireVisitor,
    async (req, res, next) => {
      try {
        if (!req.visitor.deviceId) {
          return res.json({ success: true, tours: 0 });
        }

        const [result] = await pool.execute(
          `
            INSERT INTO tour_presence (session_id, device_id, last_seen_at)
            SELECT sa.session_id, sa.device_id, CURRENT_TIMESTAMP
            FROM session_authorizations sa
            INNER JOIN tour_sessions s ON s.id = sa.session_id
            WHERE sa.device_id = ?
              AND sa.status = 'active'
              AND s.status = 'active'
              AND (sa.expires_at IS NULL OR sa.expires_at > CURRENT_TIMESTAMP)
              AND (s.starts_at IS NULL OR s.starts_at <= CURRENT_TIMESTAMP)
              AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
          `,
          [req.visitor.deviceId]
        );

        return res.json({ success: true, tours: result.affectedRows > 0 });
      } catch (error) {
        return next(error);
      }
    }
  );

  // User tạo payment
  app.post(
    "/api/payments",
    requireVisitor,
    createPayment
  );

  // User xem payment của mình
  app.get(
    "/api/payments/:sessionId",
    requireVisitor,
    getMyPayment
  );

  // User mô phỏng kết quả cho đơn online demo của chính mình.
  app.post(
    "/api/payments/:paymentId/demo-result",
    requireVisitor,
    setDemoPaymentResult
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
  // Khách theo thiết bị (tra cứu, cấp lại quyền tour)
  app.use(
    "/api/admin/devices",
    adminDeviceRoutes
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