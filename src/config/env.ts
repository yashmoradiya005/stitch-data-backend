export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "15m",
  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET || "refresh-secret-change-in-production",
  REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN || "http://localhost:3000,https://vercel.com",
};

if (!config.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Database features will not work.");
}
