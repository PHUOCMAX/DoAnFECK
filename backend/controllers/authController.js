import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  normalizeEmail,
  validateLoginPayload,
  validateRegistrationPayload,
} from "../utils/authValidation.js";

export async function register(req, res) {
  try {
    const { name, email, password } = req.body ?? {};

    const validationError = validateRegistrationPayload(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được đăng ký.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES (?, ?, ?)`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công.",
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role: "user",
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server.",
    });
  }
}
export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    const validationError = validateLoginPayload(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const [users] = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      env.jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      success: true,
      message: "Đăng nhập thành công.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server.",
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const [users] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.auth.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    return res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server.",
    });
  }
}
