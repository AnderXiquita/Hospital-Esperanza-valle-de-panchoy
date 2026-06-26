import 'dotenv/config';

// Validate required env vars before anything else
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import medicosRoutes from './modules/medicos/medicos.routes';
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import serviciosRoutes from './modules/servicios/servicios.routes';
import pacientesRoutes from './modules/pacientes/pacientes.routes';
import citasRoutes from './modules/citas/citas.routes';
import pagosRoutes from './modules/pagos/pagos.routes';
import reportesRoutes from './modules/reportes/reportes.routes';
import notificacionesRoutes from './modules/notificaciones/notificaciones.routes';
import notasRoutes from './modules/notas/notas.routes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(cors({
  origin:         process.env['FRONTEND_URL'],
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/notas', notasRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
