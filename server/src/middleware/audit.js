import { pool } from '../db.js';
export async function logAudit({ userId=null, action, entity, entityId=null, operation=null, result=null, numDeclaracion=null, req=null, details=null }) {
  try {
    const ipClient = req?.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || null;
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, operation, result, ip, num_declaracion, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, action, entity, entityId, operation, result, ipClient, numDeclaracion, details]
    );
  } catch (e) {
    console.error('AUDIT LOG ERROR', e);
  }
}
