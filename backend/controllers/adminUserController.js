import bcrypt from "bcryptjs";

import pool from "../config/db.js";
import {
  normalizeEmail,
  validateRegistrationPayload,
} from "../utils/authValidation.js";

async function countAdmins() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"
  );
  return Number(rows[0].total);
}

export async function listAdminUsers(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();

    let sql = `
      SELECT
        id,
        name,
        email,
        avatar,
        created_at,
        last_seen_at,
        role
      FROM users
    `;

    const params = [];

    if (search) {
      sql += `
        WHERE name LIKE ?
           OR email LIKE ?
      `;

      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    sql += `
      ORDER BY (role = 'admin') DESC, created_at DESC
    `;

    const [users] = await pool.query(sql, params);

    return res.json({
      success: true,
      data: users,
    });
} catch (error) {
  console.error("listAdminUsers error:", error);

  return res.status(500).json({
    success: false,
    message: error.message || "Lỗi máy chủ.",
  });
}
}

export async function updateAdminUserRole(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { role } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "User ID không hợp lệ.",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role chỉ được là user hoặc admin.",
      });
    }

    // Không cho admin tự thay đổi role của chính mình
    if (Number(req.auth.userId) === userId) {
      return res.status(400).json({
        success: false,
        message: "Không thể tự thay đổi role của chính mình.",
      });
    }

    if (role === "user") {
      const [target] = await pool.query(
        "SELECT role FROM users WHERE id = ?",
        [userId]
      );

      if (target[0]?.role === "admin" && (await countAdmins()) <= 1) {
        return res.status(400).json({
          success: false,
          message: "Không thể hạ quyền admin cuối cùng.",
        });
      }
    }

    const [result] = await pool.query(
      `
        UPDATE users
        SET role = ?
        WHERE id = ?
      `,
      [role, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user.",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật role thành công.",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminUser(req, res, next) {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "User ID không hợp lệ.",
      });
    }

    // Không cho admin tự xóa chính mình
    if (Number(req.auth.userId) === userId) {
      return res.status(400).json({
        success: false,
        message: "Không thể tự xóa tài khoản của chính mình.",
      });
    }

    const [rows] = await pool.query(
      `
        SELECT id, role
        FROM users
        WHERE id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user.",
      });
    }

    if (rows[0].role === "admin" && (await countAdmins()) <= 1) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa admin cuối cùng.",
      });
    }

    const [tours] = await pool.query(
      "SELECT COUNT(*) AS total FROM tour_sessions WHERE created_by = ?",
      [userId]
    );

    if (Number(tours[0].total) > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Tài khoản này đã tạo tour nên không xóa được (cần giữ lịch sử). Hãy hạ quyền thay vì xóa.",
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Giữ lịch sử doanh thu: thanh toán không bị xóa theo tài khoản.
      await connection.query(
        "UPDATE payments SET user_id = NULL WHERE user_id = ?",
        [userId]
      );
      // POI người này gửi / duyệt vẫn giữ lại.
      await connection.query(
        "UPDATE pois SET created_by = NULL WHERE created_by = ?",
        [userId]
      );
      await connection.query(
        "UPDATE pois SET reviewed_by = NULL WHERE reviewed_by = ?",
        [userId]
      );
      await connection.query("DELETE FROM users WHERE id = ?", [userId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({
      success: true,
      message: "Xóa user thành công.",
    });
  } catch (error) {
    next(error);
  }
}
/* =========================================================
   TẠO TÀI KHOẢN ADMIN
   Trang đăng ký đã bỏ (du khách dùng mã thiết bị), nên admin mới
   chỉ được tạo từ trang quản trị.
========================================================= */

export async function createAdminAccount(req, res, next) {
  try {
    const error = validateRegistrationPayload(req.body ?? {});

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const name = req.body.name.trim();
    const email = normalizeEmail(req.body.email);

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email này đã có tài khoản.",
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      [name, email, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: "Đã tạo tài khoản admin.",
      user: { id: Number(result.insertId), name, email, role: "admin" },
    });
  } catch (error) {
    next(error);
  }
}
