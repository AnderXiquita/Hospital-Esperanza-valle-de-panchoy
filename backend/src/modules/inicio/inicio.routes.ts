import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as inicioController from './inicio.controller';

const router: IRouter = Router();

// Read-only landing content for every role; exposes only public profile fields (no DPI, phones or fees)
router.get('/', authenticate, authorize('admin', 'recepcionista', 'medico'), inicioController.obtener);

export default router;
