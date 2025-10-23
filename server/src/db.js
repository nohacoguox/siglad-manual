import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { require: true, rejectUnauthorized: false },
    }
  : {
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST || 'db.snrcvzdztdnlcgolxkop.supabase.co',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'postgres',
      ssl: { require: true, rejectUnauthorized: false },
    };

export const pool = new Pool(config);
pool.on('error', (err) => console.error('Unexpected PG error', err));
