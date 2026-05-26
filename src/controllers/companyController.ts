import { Request, Response } from "express";
import { query } from "../db/connection";
import { CreateCompanyRequest } from "../types";

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

    const company = result.rows[0];
    res.status(201).json({
      id: company.id,
      name: company.name,
      machineCount: company.machine_count,
      createdAt: company.created_at,
    });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCompanies(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const result = await query(
      "SELECT id, name, machine_count, created_at FROM companies WHERE user_id = $1 ORDER BY created_at ASC",
      [userId]
    );

    const companies = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      machineCount: row.machine_count,
      createdAt: row.created_at,
    }));

    res.json(companies);
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
