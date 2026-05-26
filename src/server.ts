// Must run before any imports so env vars are available at module load time
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();

import express, { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { initializeDatabase } from "./db/connection";
import routes from "./routes";

const app: Express = express();

const allowedOrigins = config.CORS_ORIGIN.split(",").map((o) => o.trim());

// Always allow localhost so local dev is never blocked regardless of env vars
const LOCALHOST_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];

function isOriginAllowed(origin: string): boolean {
  if (LOCALHOST_ORIGINS.includes(origin)) return true;
  return allowedOrigins.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
      return regex.test(origin);
    }
    return pattern === origin;
  });
}

// Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api", routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware (must be last)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// Start server
const PORT = config.PORT;

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        `✓ Server running on http://localhost:${PORT} in ${config.NODE_ENV} mode`
      );
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
