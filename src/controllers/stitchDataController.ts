import { Request, Response } from "express";
import { query } from "../db/connection";

function mapEntry(row: any) {
  return {
    id: row.id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? null,
    employeeImage: row.employee_image ?? null,
    date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date).split("T")[0],
    shift: row.shift,
    machineNo: row.machine_no,
    bonusRange: row.bonus_range,
    stitchCount: row.stitch_count,
    stitchPerPaisa: parseFloat(row.stitch_per_paisa),
    extraBonusCount: row.extra_bonus_count,
    bonusEarned: row.bonus_earned,
    createdAt: row.created_at,
  };
}

export async function createStitchData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { companyId, employeeId, date, shift, machineNo, bonusRange, stitchCount, stitchPerPaisa } = req.body;

    if (!companyId || !employeeId || !date || !shift || !machineNo || !bonusRange || !stitchCount || !stitchPerPaisa) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Verify company ownership
    const companyCheck = await query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
      [companyId, userId]
    );
    if (companyCheck.rows.length === 0) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Verify employee belongs to this company
    const empCheck = await query(
      "SELECT id FROM employees WHERE id = $1 AND company_id = $2",
      [employeeId, companyId]
    );
    if (empCheck.rows.length === 0) {
      res.status(403).json({ message: "Employee not found in this company" });
      return;
    }

    const extraBonusCount = Math.max(0, Number(stitchCount) - Number(bonusRange));
    const bonusEarned = extraBonusCount * Number(stitchPerPaisa);

    const result = await query(
      `INSERT INTO stitch_data
        (company_id, employee_id, date, shift, machine_no, bonus_range, stitch_count, stitch_per_paisa, extra_bonus_count, bonus_earned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [companyId, employeeId, date, shift, machineNo, bonusRange, stitchCount, stitchPerPaisa, extraBonusCount, bonusEarned]
    );

    res.status(201).json(mapEntry(result.rows[0]));
  } catch (error) {
    console.error("createStitchData error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDailyStitchData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { companyId, date } = req.query as { companyId: string; date?: string };

    if (!companyId) {
      res.status(400).json({ message: "companyId is required" });
      return;
    }

    // Verify company ownership
    const companyCheck = await query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
      [companyId, userId]
    );
    if (companyCheck.rows.length === 0) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Default to yesterday
    const targetDate = date || new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const result = await query(
      `SELECT sd.*, e.name AS employee_name, e.image_data AS employee_image
       FROM stitch_data sd
       JOIN employees e ON sd.employee_id = e.id
       WHERE sd.company_id = $1 AND sd.date = $2
       ORDER BY sd.created_at DESC`,
      [companyId, targetDate]
    );

    res.json(result.rows.map(mapEntry));
  } catch (error) {
    console.error("getDailyStitchData error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateStitchData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { employeeId, date, shift, machineNo, bonusRange, stitchCount, stitchPerPaisa } = req.body;

    if (!employeeId || !date || !shift || !machineNo || !bonusRange || !stitchCount || !stitchPerPaisa) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Verify ownership via company
    const ownerCheck = await query(
      `SELECT sd.id FROM stitch_data sd
       JOIN companies c ON sd.company_id = c.id
       WHERE sd.id = $1 AND c.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const extraBonusCount = Math.max(0, Number(stitchCount) - Number(bonusRange));
    const bonusEarned = extraBonusCount * Number(stitchPerPaisa);

    const result = await query(
      `UPDATE stitch_data SET
         employee_id = $1, date = $2, shift = $3, machine_no = $4,
         bonus_range = $5, stitch_count = $6, stitch_per_paisa = $7,
         extra_bonus_count = $8, bonus_earned = $9
       WHERE id = $10
       RETURNING *`,
      [employeeId, date, shift, machineNo, bonusRange, stitchCount, stitchPerPaisa, extraBonusCount, bonusEarned, id]
    );

    const row = result.rows[0];
    const empRow = await query("SELECT name FROM employees WHERE id = $1", [row.employee_id]);
    res.json(mapEntry({ ...row, employee_name: empRow.rows[0]?.name ?? null }));
  } catch (error) {
    console.error("updateStitchData error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteStitchData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const ownerCheck = await query(
      `SELECT sd.id FROM stitch_data sd
       JOIN companies c ON sd.company_id = c.id
       WHERE sd.id = $1 AND c.user_id = $2`,
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    await query("DELETE FROM stitch_data WHERE id = $1", [id]);
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("deleteStitchData error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMonthlyStitchData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { companyId, year, month } = req.query as { companyId: string; year: string; month: string };

    if (!companyId || !year || !month) {
      res.status(400).json({ message: "companyId, year, and month are required" });
      return;
    }

    const companyCheck = await query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
      [companyId, userId]
    );
    if (companyCheck.rows.length === 0) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const result = await query(
      `SELECT sd.*, e.name AS employee_name
       FROM stitch_data sd
       JOIN employees e ON sd.employee_id = e.id
       WHERE sd.company_id = $1
         AND EXTRACT(YEAR FROM sd.date) = $2
         AND EXTRACT(MONTH FROM sd.date) = $3
       ORDER BY sd.date ASC, e.name ASC`,
      [companyId, year, month]
    );

    res.json(result.rows.map(mapEntry));
  } catch (error) {
    console.error("getMonthlyStitchData error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
