import { z } from 'zod';

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
const generoEnum = z.enum(['masculino', 'femenino', 'otro']);
const estadoCivilEnum = z.enum(['soltero', 'casado', 'union_libre', 'divorciado', 'viudo']);
const tipoSangreEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

// Campos opcionales del expediente, reutilizados en crear y actualizar
const expedienteFields = {
  genero: generoEnum.optional(),
  estado_civil: estadoCivilEnum.optional(),
  ocupacion: z.string().trim().max(100).optional(),
  telefono: z.string().trim().max(20).optional(),
  telefono_emergencia: z.string().trim().max(20).optional(),
  contacto_emergencia_nombre: z.string().trim().max(150).optional(),
  email: z.string().trim().toLowerCase().email().max(150).optional(),
  direccion: z.string().trim().max(500).optional(),
  tipo_sangre: tipoSangreEnum.optional(),
  alergias: z.string().trim().max(1000).optional(),
  antecedentes: z.string().trim().max(1000).optional(),
  medicamentos: z.string().trim().max(1000).optional(),
  seguro: z.string().trim().max(150).optional(),
  numero_afiliacion: z.string().trim().max(50).optional(),
  observaciones: z.string().trim().max(1000).optional(),
};

export const crearPacienteSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  apellido: z.string().trim().min(2).max(100),
  dpi: z.string().trim().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos'),
  fecha_nacimiento: z.string().regex(fechaRegex, 'Formato YYYY-MM-DD requerido'),
  ...expedienteFields,
});

export const actualizarPacienteSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    apellido: z.string().trim().min(2).max(100).optional(),
    dpi: z.string().trim().regex(/^\d{13}$/, 'El DPI debe tener 13 dígitos').optional(),
    fecha_nacimiento: z.string().regex(fechaRegex).optional(),
    genero: generoEnum.nullable().optional(),
    estado_civil: estadoCivilEnum.nullable().optional(),
    ocupacion: z.string().trim().max(100).nullable().optional(),
    telefono: z.string().trim().max(20).nullable().optional(),
    telefono_emergencia: z.string().trim().max(20).nullable().optional(),
    contacto_emergencia_nombre: z.string().trim().max(150).nullable().optional(),
    email: z.string().trim().toLowerCase().email().max(150).nullable().optional(),
    direccion: z.string().trim().max(500).nullable().optional(),
    tipo_sangre: tipoSangreEnum.nullable().optional(),
    alergias: z.string().trim().max(1000).nullable().optional(),
    antecedentes: z.string().trim().max(1000).nullable().optional(),
    medicamentos: z.string().trim().max(1000).nullable().optional(),
    seguro: z.string().trim().max(150).nullable().optional(),
    numero_afiliacion: z.string().trim().max(50).nullable().optional(),
    observaciones: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type CrearPacienteInput = z.infer<typeof crearPacienteSchema>;
export type ActualizarPacienteInput = z.infer<typeof actualizarPacienteSchema>;
