import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import { query } from "../db/connection";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import { LoginRequest, RegisterRequest } from "../types";
import { config } from "../config/env";

if (config.SENDGRID_API_KEY) {
  sgMail.setApiKey(config.SENDGRID_API_KEY);
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, confirmPassword, name } =
      req.body as RegisterRequest;

    // Validation
    if (!email || !password || !name) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    // Check if user exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [email, name, hashedPassword]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );
    await query(
      "INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    // Only refreshToken goes in an HttpOnly cookie — accessToken is managed by js-cookie on the client
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validation
    if (!email || !password) {
      res.status(400).json({ message: "Email and password required" });
      return;
    }

    // Find user
    const result = await query(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );
    await query(
      "INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    // Only refreshToken goes in an HttpOnly cookie — accessToken is managed by js-cookie on the client
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    // Web (proxy): token arrives via httpOnly cookie
    // Mobile (Capacitor): token sent in request body (cookie can't cross origins)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token not found" });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    // Check if session exists and is not expired
    const sessionResult = await query(
      "SELECT id FROM sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()",
      [decoded.userId, refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      res.status(401).json({ message: "Session expired" });
      return;
    }

    // Get user info
    const userResult = await query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    // Always return the same response — never reveal whether the email exists
    const successMsg = { message: "If an account with that email exists, password reset instructions have been sent." };

    const userResult = await query("SELECT id, name FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      res.json(successMsg);
      return;
    }

    const user = userResult.rows[0];

    // Delete any existing reset tokens for this user
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

    const sgConfigured =
      config.SENDGRID_API_KEY.startsWith("SG.") &&
      config.SENDGRID_FROM_EMAIL.includes("@");
    if (!sgConfigured) {
      console.warn("SendGrid not configured — reset URL:", resetUrl);
      res.json(successMsg);
      return;
    }

    await sgMail.send({
      to: email,
      from: { email: config.SENDGRID_FROM_EMAIL, name: "StitchDesk" },
      subject: "Reset your StitchDesk password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a5f;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#555;margin-bottom:4px;">Hi ${user.name},</p>
          <p style="color:#555;margin-bottom:24px;">
            We received a request to reset your StitchDesk password.
            Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;padding:12px 28px;background:#1e3a8a;color:#fff;
                   text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
          <p style="color:#bbb;font-size:11px;margin-top:8px;">© StitchDesk</p>
        </div>
      `,
    });

    res.json(successMsg);
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ message: "Token and new password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const tokenResult = await query(
      "SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    if (tokenResult.rows.length === 0) {
      res.status(400).json({ message: "This reset link is invalid or has expired." });
      return;
    }

    const userId = tokenResult.rows[0].user_id;
    const hash = await bcrypt.hash(password, 10);

    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, userId]);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Delete session from database
      await query("DELETE FROM sessions WHERE refresh_token = $1", [
        refreshToken,
      ]);
    }

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
