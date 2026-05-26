import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authMiddleware, logout);

export default router;
