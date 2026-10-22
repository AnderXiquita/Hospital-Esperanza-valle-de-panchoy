import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as inicioController from './inicio.controller';

const router: IRouter = Router();

// Every role can see this, so only public profile fields go out (no DPI, phones or fees).
router.get('/', authenticate, authorize('admin', 'recepcionista', 'medico'), inicioController.obtener);

export default router;
