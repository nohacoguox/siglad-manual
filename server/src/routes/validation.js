import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

router.get('/pending', requireAuth, requireRole('AGENTE'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, numero_documento, fecha_emision, importador_nombre, exportador_nombre, valor_aduana_total, moneda, estado
     FROM declarations 
     WHERE estado='PENDIENTE' 
     ORDER BY created_at ASC`
  );
  res.json(rows);
});

router.post('/:id/decision', requireAuth, requireRole('AGENTE'), async (req, res) => {
  const { id } = req.params;
  const { decision, comentario } = req.body || {};
  if (!['VALIDADA', 'RECHAZADA'].includes(decision)) return res.status(400).json({ error: 'decision must be VALIDADA or RECHAZADA' });

  const r = await pool.query(
    `UPDATE declarations
     SET estado=$1, agente_user_id=$2, comentario_agente=$3, validated_at=NOW()
     WHERE id=$4 AND estado='PENDIENTE'
     RETURNING id, numero_documento`,
    [decision, req.user.sub, comentario || null, id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Declaration not found or already processed' });

  const num = r.rows[0].numero_documento;
  await logAudit({ userId: req.user.sub, action: 'VALIDATE', entity: 'DECLARATION', entityId: id, operation: 'Validación DUCA', result: 'EXITO', num_declaracion: num, req, details: `Decision=${decision}` });
  res.json({ ok: true, id, estado: decision });
});

export default router;
