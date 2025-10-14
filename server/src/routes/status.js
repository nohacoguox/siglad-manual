import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

router.get('/mine', requireAuth, async (req, res) => {
  const { role, sub } = req.user || {};
  if (role !== 'TRANSPORTISTA') return res.status(403).json({ error: 'Only TRANSPORTISTA can view own declarations' });
  const { rows } = await pool.query(
    `SELECT id, numero_documento, estado, estado_documento, created_at, validated_at 
     FROM declarations WHERE owner_user_id=$1 ORDER BY created_at DESC`,
    [sub]
  );
  await logAudit({ userId: sub, action: 'VIEW', entity: 'DECLARATION', operation: 'Consulta Declaracion', result: 'EXITO', req });
  res.json(rows);
});

export default router;
