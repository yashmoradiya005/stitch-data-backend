import { Request, Response } from "express";
import { query } from "../db/connection";
import { CreateCompanyRequest } from "../types";

function mapCompany(row: any) {
  return {
    id: row.id,
    name: row.name,
    machineCount: row.machine_count,
    createdAt: row.created_at,
  };
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  try {
    const { name, machineCount } = req.body as CreateCompanyRequest;
    const userId = req.user?.userId;

    if (!name || !machineCount) {
      res.status(400).json({ message: "Company name and machine count are required" });
      return;
    }

    if (machineCount < 1) {
      res.status(400).json({ message: "Machine count must be at least 1" });
      return;
    }

    const result = await query(
      "INSERT INTO companies (user_id, name, machine_count) VALUES ($1, $2, $3) RETURNING id, name, machine_count, created_at",
      [userId, name, machineCount]
    );

    res.status(201).json(mapCompany(result.rows[0]));
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCompanies(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const result = await query(
      "SELECT id, name, machine_count, created_at FROM companies WHERE user_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC",
      [userId]
    );

    res.json(result.rows.map(mapCompany));
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, machineCount } = req.body;
    const userId = req.user?.userId;

    if (!name?.trim()) {
      res.status(400).json({ message: "Business name is required" });
      return;
    }

    if (!machineCount || machineCount < 1) {
      res.status(400).json({ message: "Machine count must be at least 1" });
      return;
    }

    const result = await query(
      `UPDATE companies
       SET name = $1, machine_count = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND is_deleted = FALSE
       RETURNING id, name, machine_count, created_at`,
      [name.trim(), machineCount, id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Business not found" });
      return;
    }

    res.json(mapCompany(result.rows[0]));
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function softDeleteCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Verify ownership
    const check = await query(
      "SELECT id, name FROM companies WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE",
      [id, userId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ message: "Business not found" });
      return;
    }

    await query(
      "UPDATE companies SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
