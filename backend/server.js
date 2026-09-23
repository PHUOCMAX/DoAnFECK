import pool from "./config/db.js";
import { createApp } from "./app.js";
import { env, validateEnvironment } from "./config/env.js";

validateEnvironment();

const app = createApp();

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend running at http://0.0.0.0:${env.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));