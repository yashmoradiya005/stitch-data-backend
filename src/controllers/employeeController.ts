import { Request, Response } from "express";
import { query } from "../db/connection";

async function verifyCompanyOwner(companyId: string, userId: string): Promise<boolean> {
  const result = await query(
    "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
    [companyId, userId]
  );
  return result.rows.length > 0;
}

function mapEmployee(row: any) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    phone: row.phone ?? null,
    imageData: row.image_data ?? null,
    createdAt: row.created_at,
  };
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { companyId, name, phone, imageData } = req.body;
    const userId = req.user?.userId;

    if (!companyId || !name?.trim()) {
      res.status(400).json({ message: "Company and employee name are required" });
      return;
    }

    if (!(await verifyCompanyOwner(companyId, userId!))) {
      res.status(403).json({ message: "Company not found" });
      return;
    }

    const result = await query(
      `INSERT INTO employees (company_id, name, phone, image_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [companyId, name.trim(), phone?.trim() || null, imageData || null]
    );

    res.status(201).json(mapEmployee(result.rows[0]));
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phone, imageData } = req.body;
    const userId = req.user?.userId;

    if (!name?.trim()) {
      res.status(400).json({ message: "Employee name is required" });
      return;
    }

    // Verify employee belongs to a company owned by this user
    const check = await query(
      `SELECT e.id FROM employees e
       JOIN companies c ON e.company_id = c.id
       WHERE e.id = $1 AND c.user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    const result = await query(
      `UPDATE employees
       SET name = $1, phone = $2, image_data = $3
       WHERE id = $4
       RETURNING *`,
      [name.trim(), phone?.trim() || null, imageData ?? null, id]
    );

    res.json(mapEmployee(result.rows[0]));
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const check = await query(
      `SELECT e.id FROM employees e
       JOIN companies c ON e.company_id = c.id
       WHERE e.id = $1 AND c.user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    await query("DELETE FROM employees WHERE id = $1", [id]);
    res.json({ message: "Employee deleted" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getEmployees(req: Request, res: Response): Promise<void> {
  try {
    const { companyId } = req.query as { companyId: string };
    const userId = req.user?.userId;

    if (!companyId) {
      res.status(400).json({ message: "companyId is required" });
      return;
    }

    if (!(await verifyCompanyOwner(companyId, userId!))) {
      res.status(403).json({ message: "Company not found" });
      return;
    }

    const result = await query(
      "SELECT * FROM employees WHERE company_id = $1 ORDER BY LOWER(name) ASC",
      [companyId]
    );

    res.json(result.rows.map(mapEmployee));
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
