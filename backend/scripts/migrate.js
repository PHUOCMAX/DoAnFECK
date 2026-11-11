import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { env } from "../config/env.js";

/*
 * Chạy các file migration chưa chạy, theo thứ tự tên file.
 * File nào đã chạy được ghi vào bảng schema_migrations nên chạy lại
 * bao nhiêu lần cũng được.
 *   docker exec multilingual-tour-guide-backend npm run migrate
 *
 * init.sql là ảnh chụp database sau migration 008, nên:
 * - Database trống: chạy init.sql rồi coi 001–008 là đã chạy.
 * - Database đã có bảng nhưng chưa có schema_migrations (tạo bằng init.sql
 *   hoặc chạy tay): coi 001–008 là đã chạy.
 * Từ 009 trở đi chạy bình thường.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_DIR = path.resolve(__dirname, "../database");
const MIGRATIONS_DIR = path.join(DATABASE_DIR, "migrations");
const INIT_SQL = path.join(DATABASE_DIR, "init.sql");

const BASELINE = "008_drop_unused_columns.sql";

async function tableExists(connection, table) {
  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [table]
  );

  return Number(row.total) > 0;
}

async function markApplied(connection, files) {
  for (const file of files) {
    await connection.query(
      "INSERT IGNORE INTO schema_migrations (filename) VALUES (?)",
      [file]
    );
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const baselineFiles = files.filter((file) => file <= BASELINE);

    const hasTracking = await tableExists(connection, "schema_migrations");

    if (!hasTracking) {
      const hasSchema = await tableExists(connection, "pois");

      if (!hasSchema) {
        console.log("Database trống: chạy init.sql");
        await connection.query(await fs.readFile(INIT_SQL, "utf8"));
      }

      await connection.query(`
        CREATE TABLE schema_migrations (
          filename varchar(255) NOT NULL,
          applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (filename)
        )
      `);

      await markApplied(connection, baselineFiles);

      console.log(`Đánh dấu đã chạy: ${baselineFiles.length} migration (đến ${BASELINE})`);
    }

    const [rows] = await connection.query(
      "SELECT filename FROM schema_migrations"
    );

    const applied = new Set(rows.map((row) => row.filename));
    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log("Database đã mới nhất, không có migration nào cần chạy.");
      return;
    }

    for (const file of pending) {
      console.log(`Chạy ${file}`);

      try {
        await connection.query(
          await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8")
        );
      } catch (error) {
        console.error(`Lỗi ở ${file}: ${error.message}`);
        console.error("Các migration sau file này chưa được chạy.");
        process.exitCode = 1;
        return;
      }

      await markApplied(connection, [file]);
    }

    console.log(`Xong: đã chạy ${pending.length} migration.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
