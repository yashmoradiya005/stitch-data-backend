import { Router } from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee } from "../controllers/employeeController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", createEmployee);
router.get("/", getEmployees);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
