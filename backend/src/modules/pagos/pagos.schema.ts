import { z } from 'zod';

export const crearPagoSchema = z.object({
  cita_id: z.number().int().positive(),
  monto: z.number().nonnegative().max(99999999),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia']),
});

export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
