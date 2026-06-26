import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  getResumen,
  getReporteCitas,
  getReporteIngresos,
  getReporteMedicos,
  getReportePacientes,
} from './reportes.controller';

const router: Router = Router();

// Todos los endpoints solo accesibles por admin
router.get('/resumen',   authenticate, authorize('admin'), getResumen);
router.get('/citas',     authenticate, authorize('admin'), getReporteCitas);
router.get('/ingresos',  authenticate, authorize('admin'), getReporteIngresos);
router.get('/medicos',   authenticate, authorize('admin'), getReporteMedicos);
router.get('/pacientes', authenticate, authorize('admin'), getReportePacientes);

export default router;
