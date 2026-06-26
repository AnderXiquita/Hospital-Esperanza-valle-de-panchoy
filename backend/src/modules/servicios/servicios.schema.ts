import { z } from 'zod';

export const crearServicioSchema = z.object({
  nombre: z.string().trim().min(2).max(150),
  descripcion: z.string().trim().max(1000).optional(),
  precio: z.number().nonnegative().max(99999999),
  duracion: z.number().int().min(5).max(600),
});

export const actualizarServicioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(150).optional(),
    descripcion: z.string().trim().max(1000).nullable().optional(),
    precio: z.number().nonnegative().max(99999999).optional(),
    duracion: z.number().int().min(5).max(600).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type CrearServicioInput = z.infer<typeof crearServicioSchema>;
export type ActualizarServicioInput = z.infer<typeof actualizarServicioSchema>;
