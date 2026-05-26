import { Router } from "express";
import authRoutes from "./auth";
import companyRoutes from "./companies";
import userRoutes from "./users";

const router = Router();

router.use("/auth", authRoutes);
router.use("/companies", companyRoutes);
router.use("/users", userRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
