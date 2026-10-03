import cors from "cors";
import express from "express";
import path from "path";
import agentRoutes from "./routes/agentRoutes.js";

import { env } from "./config/env.js";
import pool from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import adminPoiRoutes from "./routes/adminPoiRoutes.js";
import poiRoutes from "./routes/poiRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";

function corsOptions() {
  return {
    origin(origin, callback) {
      // Native applications and server-to-server calls do not send Origin.
      if (
        !origin ||
        env.corsOrigins.length === 0 ||
        env.corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      const error = new Error("Origin không được phép truy cập API.");
      error.statusCode = 403;
      return callback(error);
    },
  };
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.use(cors(corsOptions()));

  app.use(
    "/uploads",
    express.static(
      path.resolve(process.cwd(), "uploads")
    )
  );

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT 1 AS result");

      return res.json({
        success: true,
        message: "Backend and MySQL are connected",
        database: rows[0].result === 1,
      });
    } catch (error) {
      return next(error);
    }
  });

  // =========================
  // AUTH
  // =========================
  app.use("/api/auth", authRoutes);

  // =========================
  // USER
  // =========================
  app.use("/api/agent", agentRoutes);
  app.use("/api/checkins", checkinRoutes);
  app.use("/api/pois", poiRoutes);

  // =========================
  // ADMIN
  // =========================
  app.use("/api/admin", adminPoiRoutes);
  app.use("/api/admin/users", adminUserRoutes);

  // =========================
  // ERROR HANDLERS
  // =========================
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}