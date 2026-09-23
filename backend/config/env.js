import dotenv from "dotenv";

dotenv.config();

function parsePort(value) {
  if (value === undefined || value === "") {
    return 5000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    throw new Error("DB_PORT must be a positive integer.");
  }

  return number;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  db: {
    host: process.env.DB_HOST,
    port: parsePositiveInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export function validateEnvironment() {
  const required = [
    ["DB_HOST", env.db.host],
    ["DB_USER", env.db.user],
    ["DB_PASSWORD", env.db.password],
    ["DB_NAME", env.db.name],
    ["JWT_SECRET", env.jwtSecret],
  ];

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (env.nodeEnv === "production" && env.corsOrigins.length === 0) {
    missing.push("CORS_ORIGIN");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
