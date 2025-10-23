// server/src/db.js
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const { DATABASE_URL, PGPOOL_MAX } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(PGPOOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  // Supabase en Render requiere SSL pero sin verificar CA pública
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[pg] Unexpected error on idle client', err);
});

export const query = (text, params) => pool.query(text, params);
