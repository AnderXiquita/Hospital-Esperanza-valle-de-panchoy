import { Router, IRouter } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { loginSchema, changePasswordSchema, updateProfileSchema } from './auth.schema';
import * as authController from './auth.controller';

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env['NODE_ENV'] === 'production' ? 10 : 100,
  message: { message: 'Demasiados intentos, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile
);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
