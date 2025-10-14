import { Router } from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// Crear
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { name, email, password, role, status = 'ACTIVE' } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, status`,
      [name, email, hash, role, status]
    );
    await logAudit({ userId: req.user.sub, action: 'CREATE', entity: 'USER', entityId: rows[0].id, operation: 'Usuario creado', result: 'EXITO', req });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      await logAudit({ userId: req.user.sub, action: 'CREATE', entity: 'USER', operation: 'Usuario creado', result: 'FALLO', req, details: 'Correo duplicado' });
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw e;
  }
});

// Listar
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
  await logAudit({ userId: req.user.sub, action: 'VIEW', entity: 'USER', operation: 'Listado usuarios', result: 'EXITO', req });
  res.json(rows);
});

// Editar (rol/estado)
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body || {};
  const { rows } = await pool.query(
    'UPDATE users SET role = COALESCE($1, role), status = COALESCE($2, status) WHERE id=$3 RETURNING id, name, email, role, status',
    [role, status, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  await logAudit({ userId: req.user.sub, action: 'UPDATE', entity: 'USER', entityId: id, operation: 'Usuario actualizado', result: 'EXITO', req });
  res.json(rows[0]);
});

// Eliminar
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const r = await pool.query('DELETE FROM users WHERE id=$1', [id]);
  if (!r.rowCount) return res.status(404).json({ error: 'User not found' });
  await logAudit({ userId: req.user.sub, action: 'UPDATE', entity: 'USER', entityId: id, operation: 'Usuario eliminado', result: 'EXITO', req });
  res.json({ ok: true });
});

export default router;
