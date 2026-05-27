import { Router } from "express";
import { createCompany, getCompanies, updateCompany, softDeleteCompany } from "../controllers/companyController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", createCompany);
router.get("/", getCompanies);
router.put("/:id", updateCompany);
router.delete("/:id", softDeleteCompany);

export default router;
