import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { getConfigHandler, updateConfigHandler } from './config.controller';

const router: Router = Router();

router.get('/', getConfigHandler);
router.put('/', authenticate, authorize('admin'), updateConfigHandler);

export default router;
