import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import { signToken } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  try {
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, role, status FROM users WHERE email=$1",
      [email]
    );
    const user = rows[0];
    if (!user) {
      await logAudit({ action: "LOGIN", entity: "AUTH", result: "FALLO", req, details: "Usuario no existe" });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.status !== "ACTIVE") {
      await logAudit({ userId: user.id, action: "LOGIN", entity: "AUTH", result: "FALLO", req, details: "Usuario inactivo" });
      return res.status(403).json({ error: "User disabled" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await logAudit({ userId: user.id, action: "LOGIN", entity: "AUTH", result: "FALLO", req, details: "Password incorrecto" });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    await logAudit({ userId: user.id, action: "LOGIN", entity: "AUTH", result: "EXITO", req });
    res.json({ token, role: user.role, userId: user.id });
  } catch (err) {
    console.error("LOGIN ERROR", err);
    await logAudit({ action: "LOGIN", entity: "AUTH", result: "FALLO", req, details: "DB error" });
    res.status(500).json({ error: "Database error during login" });
  }
});

export default router;
