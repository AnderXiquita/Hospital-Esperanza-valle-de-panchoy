import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  crearMedicoSchema,
  actualizarMedicoSchema,
  actualizarHorariosSchema,
} from './medicos.schema';
import * as medicosController from './medicos.controller';

const router: IRouter = Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'recepcionista'),
  medicosController.listar
);

router.get(
  '/stats',
  authenticate,
  authorize('admin', 'recepcionista'),
  medicosController.stats
);

router.get(
  '/me',
  authenticate,
  authorize('medico'),
  medicosController.me
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  medicosController.obtener
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(crearMedicoSchema),
  medicosController.crear
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(actualizarMedicoSchema),
  medicosController.actualizar
);

router.patch(
  '/:id/toggle',
  authenticate,
  authorize('admin'),
  medicosController.toggle
);

router.put(
  '/:id/horarios',
  authenticate,
  authorize('admin'),
  validate(actualizarHorariosSchema),
  medicosController.actualizarHorarios
);

export default router;
