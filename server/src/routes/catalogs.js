// server/src/routes/catalogs.js
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /catalogs/importers
 * Params:
 *   status: 'ACTIVO' | 'INACTIVO' (default: ACTIVO)
 *   q: filtro por id/nombre (opcional)
 *   limit: máx resultados (default 100)
 * Access: cualquier usuario autenticado (Transportista/Agente/Admin)
 */
router.get("/importers", requireAuth, async (req, res) => {
  const status = (req.query.status || "ACTIVO").toUpperCase();
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
  const q = (req.query.q || "").trim();

  const params = [status, limit];
  let sql = `
    SELECT id, nombre
    FROM importers
    WHERE estado = $1
  `;
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (id ILIKE $${params.length} OR nombre ILIKE $${params.length})`;
  }
  sql += ` ORDER BY nombre ASC LIMIT $2`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});


router.get("/exporters", requireAuth, async (req, res) => {
  const status = (req.query.status || "ACTIVO").toUpperCase();
  const limit = Math.min(parseInt(req.query.limit || "100", 10), 500);
  const q = (req.query.q || "").trim();

  const params = [status, limit];
  let sql = `SELECT id, nombre FROM exporters WHERE estado = $1`;
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (id ILIKE $${params.length} OR nombre ILIKE $${params.length})`;
  }
  sql += ` ORDER BY nombre ASC LIMIT $2`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

export default router;
