import { z } from 'zod';

const horaRegex = /^\d{2}:\d{2}$/;
const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

const generoEnum = z.enum(['masculino', 'femenino', 'otro']);

export const horarioSchema = z
  .object({
    dia_semana: z.number().int().min(0).max(6),
    hora_inicio: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
    hora_fin: z.string().regex(horaRegex, 'Formato HH:MM requerido'),
  })
  .refine((h) => h.hora_inicio < h.hora_fin, {
    message: 'hora_inicio debe ser anterior a hora_fin',
    path: ['hora_fin'],
  });

// Campos opcionales del expediente, reutilizados en crear y actualizar
const expedienteFields = {
  subespecialidad: z.string().trim().max(150).optional(),
  dpi: z.string().trim().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos').optional(),
  fecha_nacimiento: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD requerido').optional(),
  genero: generoEnum.optional(),
  telefono: z.string().trim().max(20).optional(),
  telefono_emergencia: z.string().trim().max(20).optional(),
  direccion: z.string().trim().max(500).optional(),
  fecha_ingreso: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD requerido').optional(),
  consultorio: z.string().trim().max(50).optional(),
  tarifa_consulta: z.number().nonnegative().max(99999999).optional(),
  biografia: z.string().trim().max(1000).optional(),
  foto_url: z.string().trim().max(500000).optional(),
};

export const crearMedicoSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  apellido: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(1),
  especialidad: z.string().trim().min(2).max(150),
  numero_colegiado: z.string().trim().min(2).max(50),
  ...expedienteFields,
  horarios: z.array(horarioSchema).optional(),
});

export const actualizarMedicoSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    apellido: z.string().trim().min(2).max(100).optional(),
    especialidad: z.string().trim().min(2).max(150).optional(),
    numero_colegiado: z.string().trim().min(2).max(50).optional(),
    // Campos del expediente; nullable para poder limpiarlos
    subespecialidad: z.string().trim().max(150).nullable().optional(),
    dpi: z.string().trim().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos').nullable().optional(),
    fecha_nacimiento: z.string().regex(fechaRegex).nullable().optional(),
    genero: generoEnum.nullable().optional(),
    telefono: z.string().trim().max(20).nullable().optional(),
    telefono_emergencia: z.string().trim().max(20).nullable().optional(),
    direccion: z.string().trim().max(500).nullable().optional(),
    fecha_ingreso: z.string().regex(fechaRegex).nullable().optional(),
    consultorio: z.string().trim().max(50).nullable().optional(),
    tarifa_consulta: z.number().nonnegative().max(99999999).nullable().optional(),
    biografia: z.string().trim().max(1000).nullable().optional(),
    foto_url: z.string().trim().max(500000).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export const actualizarHorariosSchema = z.object({
  horarios: z.array(horarioSchema),
});

export type CrearMedicoInput = z.infer<typeof crearMedicoSchema>;
export type ActualizarMedicoInput = z.infer<typeof actualizarMedicoSchema>;
export type ActualizarHorariosInput = z.infer<typeof actualizarHorariosSchema>;
