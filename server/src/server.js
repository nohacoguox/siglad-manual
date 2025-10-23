// server/src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import declarationRoutes from './routes/declarations.js';
import validationRoutes from './routes/validation.js';
import statusRoutes from './routes/status.js';
import importerRoutes from './routes/importers.js';
import exporterRoutes from './routes/exporters.js';
import catalogRoutes from './routes/catalogs.js';

import { pool } from './db.js';

const app = express();

// Si usas cookies/sesión, necesario detrás de Render/Cloudflare
app.set('trust proxy', 1);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ db: true });
  } catch (e) {
    console.error('[health/db]', e);
    res.status(500).json({ db: false, error: e.message });
  }
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/declarations', declarationRoutes);
app.use('/validation', validationRoutes);
app.use('/status', statusRoutes);
app.use('/admin/importers', importerRoutes);
app.use('/admin/exporters', exporterRoutes);
app.use('/catalogs', catalogRoutes);

// Manejador de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
