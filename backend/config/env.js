import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: [
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ],
});

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

  vnpay: {
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    returnUrl: process.env.VNP_RETURN_URL,
    ipnUrl: process.env.VNP_IPN_URL,
    frontendReturnUrl: process.env.VNP_FRONTEND_RETURN_URL,
    enabled: process.env.VNP_ENABLED === "true",
  },

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
    if (env.vnpay.enabled) {
    const requiredVnpay = [
      ["VNP_TMN_CODE", env.vnpay.tmnCode],
      ["VNP_HASH_SECRET", env.vnpay.secureSecret],
      ["VNP_RETURN_URL", env.vnpay.returnUrl],
      ["VNP_IPN_URL", env.vnpay.ipnUrl],
      ["VNP_FRONTEND_RETURN_URL", env.vnpay.frontendReturnUrl],
    ];

    const missingVnpay = requiredVnpay
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingVnpay.length > 0) {
      missing.push(...missingVnpay);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
