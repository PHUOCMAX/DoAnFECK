import pool from "../config/db.js";

export async function requireAdmin(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập." });
  }

  try {
    const [users] = await pool.execute(
      "SELECT role FROM users WHERE id = ?",
      [req.auth.userId]
    );

    if (users[0]?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản trị viên có quyền thực hiện thao tác này.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
