// server/src/routes/importers.js
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const q = (req.query.q || "").trim();
  const params = [];
  let sql = `SELECT id, nombre, estado, created_at FROM importers`;
  if (q) { sql += ` WHERE id ILIKE $1 OR nombre ILIKE $1`; params.push(`%${q}%`); }
  sql += ` ORDER BY created_at DESC LIMIT 200`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { nombre, estado = "ACTIVO" } = req.body || {};
  if (!id || !nombre) return res.status(400).json({ error: "id y nombre son requeridos" });
  if (!["ACTIVO","INACTIVO"].includes(estado)) return res.status(400).json({ error: "estado inválido" });
  await pool.query(
    `INSERT INTO importers (id, nombre, estado)
     VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, estado=EXCLUDED.estado`,
    [id, nombre, estado]
  );
  res.json({ ok: true });
});

router.patch("/:id/estado", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body || {};
  if (!["ACTIVO","INACTIVO"].includes(estado)) return res.status(400).json({ error: "estado inválido" });
  const r = await pool.query(`UPDATE importers SET estado=$1 WHERE id=$2`, [estado, id]);
  if (!r.rowCount) return res.status(404).json({ error: "No existe el importador" });
  res.json({ ok: true });
});

export default router;
