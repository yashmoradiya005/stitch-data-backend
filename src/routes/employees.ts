import { Router } from "express";
import { createEmployee, getEmployees } from "../controllers/employeeController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", createEmployee);
router.get("/", getEmployees);

export default router;
