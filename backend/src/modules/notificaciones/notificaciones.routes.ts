import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl from './notificaciones.controller';

const router: IRouter = Router();

router.get('/',                authenticate, ctrl.listar);
router.get('/unread-count',    authenticate, ctrl.unreadCount);
router.patch('/leer-todas',    authenticate, ctrl.marcarTodasLeidas);
router.delete('/todas',        authenticate, ctrl.eliminarTodas);
router.post('/config-changed', authenticate, authorize('admin'), ctrl.configCambiada);
router.patch('/:id/leer',      authenticate, ctrl.marcarLeida);
router.delete('/:id',          authenticate, ctrl.eliminar);

export default router;
