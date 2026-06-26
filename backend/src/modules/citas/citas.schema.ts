import { z } from 'zod';

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
const horaRegex = /^\d{2}:\d{2}$/;

export const crearCitaSchema = z.object({
  paciente_id: z.number().int().positive(),
  medico_id: z.number().int().positive(),
  servicio_id: z.number().int().positive(),
  fecha: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD requerido'),
  hora_inicio: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
  motivo_consulta: z.string().trim().max(500).optional(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['agendada', 'confirmada', 'atendida', 'reprogramada', 'cancelada', 'no_presentado']),
});

export const reprogramarCitaSchema = z.object({
  fecha: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD requerido'),
  hora_inicio: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
  medico_id: z.number().int().positive().optional(),
  servicio_id: z.number().int().positive().optional(),
  motivo_consulta: z.string().trim().max(500).optional(),
});

export type CrearCitaInput = z.infer<typeof crearCitaSchema>;
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;
export type ReprogramarCitaInput = z.infer<typeof reprogramarCitaSchema>;
