import { Router } from "express";
import { createStitchData, getDailyStitchData, getMonthlyStitchData, updateStitchData, deleteStitchData } from "../controllers/stitchDataController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", createStitchData);
router.get("/", getDailyStitchData);
router.get("/monthly", getMonthlyStitchData);
router.put("/:id", updateStitchData);
router.delete("/:id", deleteStitchData);

export default router;
