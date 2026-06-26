import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { crearCitaSchema, cambiarEstadoSchema, reprogramarCitaSchema } from './citas.schema';
import * as citasController from './citas.controller';

const router: IRouter = Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  citasController.listar
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  validate(crearCitaSchema),
  citasController.crear
);

router.get(
  '/slots',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  citasController.getSlots
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  citasController.obtener
);

router.patch(
  '/:id/estado',
  authenticate,
  authorize('admin', 'recepcionista', 'medico'),
  validate(cambiarEstadoSchema),
  citasController.cambiarEstado
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'recepcionista'),
  validate(reprogramarCitaSchema),
  citasController.reprogramar
);

export default router;
