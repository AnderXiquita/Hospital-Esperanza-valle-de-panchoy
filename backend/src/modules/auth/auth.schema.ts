import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email requerido').email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
});

export const updateProfileSchema = z.object({
  nombre:   z.string().min(1).max(80).trim(),
  apellido: z.string().min(1).max(80).trim(),
  email:    z.string().email().trim().toLowerCase(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contrasena actual requerida'),
  newPassword: z
    .string()
    .min(8, 'La nueva contrasena debe tener al menos 8 caracteres')
    .max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
