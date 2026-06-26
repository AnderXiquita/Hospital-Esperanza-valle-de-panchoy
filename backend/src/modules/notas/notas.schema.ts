import { z } from 'zod';

const MedicamentoSchema = z.object({
  nombre:    z.string().min(1).max(200),
  dosis:     z.string().min(1).max(100),
  frecuencia: z.string().min(1).max(100),
  duracion:  z.string().min(1).max(100),
  notas:     z.string().max(300).optional(),
});

export const CrearNotaSchema = z.object({
  cita_id: z.number().int().positive(),

  sv_presion_sistolica:   z.number().int().min(0).max(300).nullable().optional(),
  sv_presion_diastolica:  z.number().int().min(0).max(200).nullable().optional(),
  sv_frecuencia_cardiaca: z.number().int().min(0).max(300).nullable().optional(),
  sv_frecuencia_resp:     z.number().int().min(0).max(60).nullable().optional(),
  sv_temperatura:         z.number().min(20).max(45).nullable().optional(),
  sv_saturacion_o2:       z.number().int().min(0).max(100).nullable().optional(),
  sv_peso:                z.number().min(0).max(500).nullable().optional(),
  sv_talla:               z.number().min(0).max(300).nullable().optional(),

  motivo_consulta: z.string().max(2000).nullable().optional(),
  anamnesis:       z.string().max(5000).nullable().optional(),
  examen_fisico:   z.string().max(5000).nullable().optional(),

  diagnostico_principal:    z.string().max(500).nullable().optional(),
  diagnosticos_secundarios: z.array(z.string().max(500)).optional().default([]),

  medicamentos:      z.array(MedicamentoSchema).optional().default([]),
  indicaciones:      z.string().max(5000).nullable().optional(),
  proxima_consulta:  z.string().max(200).nullable().optional(),
  notas_adicionales: z.string().max(3000).nullable().optional(),
});

export const ActualizarNotaSchema = CrearNotaSchema.omit({ cita_id: true });

export type CrearNotaInput    = z.infer<typeof CrearNotaSchema>;
export type ActualizarNotaInput = z.infer<typeof ActualizarNotaSchema>;
