import { Router } from "express";
import { getProfile, updateProfile, changePassword } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);
router.get("/me", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

export default router;
