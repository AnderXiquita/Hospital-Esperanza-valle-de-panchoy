import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './notas.controller';

const router: ReturnType<typeof Router> = Router();

// Rutas estáticas ANTES de /:id
router.get('/mis-pacientes', authenticate, authorize('medico'), ctrl.misPacientes);
router.get('/paciente/:pacienteId', authenticate, authorize('admin', 'recepcionista', 'medico'), ctrl.porPaciente);
router.get('/', authenticate, authorize('admin', 'recepcionista', 'medico'), ctrl.porCita);

router.post('/', authenticate, authorize('medico'), ctrl.crear);
router.put('/:id', authenticate, authorize('medico'), ctrl.actualizar);
router.get('/:id', authenticate, authorize('admin', 'recepcionista', 'medico'), ctrl.porId);

export default router;
