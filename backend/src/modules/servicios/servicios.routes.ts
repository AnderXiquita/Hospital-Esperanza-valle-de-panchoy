import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { crearServicioSchema, actualizarServicioSchema } from './servicios.schema';
import * as serviciosController from './servicios.controller';

const router: IRouter = Router();

router.get('/', authenticate, authorize('admin', 'recepcionista', 'medico'), serviciosController.listar);
router.get('/stats', authenticate, authorize('admin', 'recepcionista'), serviciosController.stats);
router.get('/:id', authenticate, authorize('admin', 'recepcionista', 'medico'), serviciosController.obtener);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(crearServicioSchema),
  serviciosController.crear
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(actualizarServicioSchema),
  serviciosController.actualizar
);

router.patch(
  '/:id/toggle',
  authenticate,
  authorize('admin'),
  serviciosController.toggle
);

export default router;
