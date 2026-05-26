import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/connection";

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      "SELECT id, email, name, created_at FROM users WHERE id = $1",
      [req.user?.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const u = result.rows[0];
    res.json({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ message: "Name is required" });
      return;
    }
    const result = await query(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name",
      [name.trim(), req.user?.userId]
    );
    const u = result.rows[0];
    res.json({ id: u.id, email: u.email, name: u.name });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current and new password are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ message: "New password must be at least 8 characters" });
      return;
    }

    const result = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user?.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hash, req.user?.userId]
    );
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
