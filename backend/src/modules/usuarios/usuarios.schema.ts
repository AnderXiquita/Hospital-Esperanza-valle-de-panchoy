import { z } from 'zod';

// Roles que Usuarios puede asignar (los médicos se crean en su módulo)
const rolAsignable = z.enum(['admin', 'recepcionista']);

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  apellido: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(1),
  rol: rolAsignable,
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    apellido: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email().max(150).optional(),
    rol: rolAsignable.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export const resetPasswordSchema = z.object({
  password: z.string().min(1),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
