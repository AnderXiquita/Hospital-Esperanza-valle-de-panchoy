import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { crearPacienteSchema, actualizarPacienteSchema } from './pacientes.schema';
import * as pacientesController from './pacientes.controller';

const router: IRouter = Router();

const verRoles = authorize('admin', 'recepcionista', 'medico');
const editRoles = authorize('admin', 'recepcionista');

router.get('/', authenticate, verRoles, pacientesController.listar);
router.get('/stats', authenticate, verRoles, pacientesController.stats);
router.get('/:id', authenticate, verRoles, pacientesController.obtener);

router.post(
  '/',
  authenticate,
  editRoles,
  validate(crearPacienteSchema),
  pacientesController.crear
);

router.put(
  '/:id',
  authenticate,
  editRoles,
  validate(actualizarPacienteSchema),
  pacientesController.actualizar
);

router.patch('/:id/toggle', authenticate, editRoles, pacientesController.toggle);

export default router;
