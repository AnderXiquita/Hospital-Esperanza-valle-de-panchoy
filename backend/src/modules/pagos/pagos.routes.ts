import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { crearPagoSchema } from './pagos.schema';
import * as pagosController from './pagos.controller';

const router: IRouter = Router();

const roles = authorize('admin', 'recepcionista');

router.get('/', authenticate, roles, pagosController.listar);
router.get('/stats', authenticate, roles, pagosController.stats);
router.get('/citas-pendientes', authenticate, roles, pagosController.citasPendientes);
router.get('/:id', authenticate, roles, pagosController.obtener);

router.post('/', authenticate, roles, validate(crearPagoSchema), pagosController.crear);
router.patch('/:id/anular', authenticate, roles, pagosController.anular);

export default router;
