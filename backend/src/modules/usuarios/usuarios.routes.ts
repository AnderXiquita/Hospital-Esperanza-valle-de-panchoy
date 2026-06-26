import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  crearUsuarioSchema, actualizarUsuarioSchema, resetPasswordSchema,
} from './usuarios.schema';
import * as usuariosController from './usuarios.controller';

const router: IRouter = Router();

router.get('/', authenticate, authorize('admin'), usuariosController.listar);
router.get('/stats', authenticate, authorize('admin'), usuariosController.stats);
router.get('/:id', authenticate, authorize('admin'), usuariosController.obtener);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(crearUsuarioSchema),
  usuariosController.crear
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(actualizarUsuarioSchema),
  usuariosController.actualizar
);

router.patch(
  '/:id/toggle',
  authenticate,
  authorize('admin'),
  usuariosController.toggle
);

router.post(
  '/:id/reset-password',
  authenticate,
  authorize('admin'),
  validate(resetPasswordSchema),
  usuariosController.resetPassword
);

export default router;
