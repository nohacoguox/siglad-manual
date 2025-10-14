import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const config = process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
  user: process.env.PGUSER || 'siglad',
  password: process.env.PGPASSWORD || 'siglad',
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'siglad_db',
  ssl: false
};
console.log('PG CONFIG ->', config);
export const pool = new Pool(config);
pool.on('error', (err)=>console.error('Unexpected PG error', err));
