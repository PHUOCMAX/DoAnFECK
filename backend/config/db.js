import mysql from "mysql2/promise";
import { env } from "./env.js";

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,

  ssl:
    env.nodeEnv === "production"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
pool.getConnection()
  .then(async (connection) => {
    try {
      console.log("MYSQL CONNECTION CONFIG:", {
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
      });

      console.log("MYSQL CONNECTION THREAD ID:", connection.threadId);

      const [rows] = await connection.query(`
        SELECT
          DATABASE() AS database_name,
          @@hostname AS mysql_host,
          @@port AS mysql_port,
          CONNECTION_ID() AS connection_id
      `);

      console.log("MYSQL SERVER RESPONSE:", rows[0]);
    } catch (error) {
      console.error("MYSQL CHECK ERROR:", error.message);
    } finally {
      connection.release();
    }
  })
  .catch((error) => {
    console.error("MYSQL CONNECTION ERROR:", error.message);
  });
export default pool;