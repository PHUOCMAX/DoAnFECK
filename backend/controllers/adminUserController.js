import pool from "../config/db.js";

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
      ORDER BY created_at DESC
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
        SELECT id
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

    await pool.query(
      `
        DELETE FROM users
        WHERE id = ?
      `,
      [userId]
    );

    return res.json({
      success: true,
      message: "Xóa user thành công.",
    });
  } catch (error) {
    next(error);
  }
}