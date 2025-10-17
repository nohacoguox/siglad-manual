import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const config = process.env.DATABASE_URL ? { 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
} : {
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST || 'db.snrcvzdztdnlcgolxkop.supabase.co',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false } // Required for Supabase
};
console.log('PG CONFIG ->', config);
export const pool = new Pool(config);
pool.on('error', (err)=>console.error('Unexpected PG error', err));
