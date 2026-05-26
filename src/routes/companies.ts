import { Router } from "express";
import { createCompany, getCompanies } from "../controllers/companyController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);
router.post("/", createCompany);
router.get("/", getCompanies);

export default router;
