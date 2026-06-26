import prisma from '../../config/prisma';
import { NotaClinica, Medicamento, PacienteDelHistorial } from './notas.types';
import { CrearNotaInput, ActualizarNotaInput } from './notas.schema';

const withJoins = {
  include: {
    cita: {
      select: {
        fecha: true,
        hora_inicio: true,
        servicio: { select: { nombre: true } },
      },
    },
    medico: {
      select: {
        especialidad: true,
        usuario: { select: { nombre: true, apellido: true } },
      },
    },
    paciente: {
      select: { nombre: true, apellido: true },
    },
  },
} as const;

async function getMedicoId(usuarioId: number): Promise<number> {
  const medico = await prisma.medicos.findFirst({
    where: { usuario_id: usuarioId },
    select: { id: true },
  });
  if (!medico) throw Object.assign(new Error('Perfil de médico no encontrado'), { code: 'NO_MEDICO_PROFILE' });
  return medico.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNota(r: any): NotaClinica {
  return {
    id:          r.id,
    cita_id:     r.cita_id,
    medico_id:   r.medico_id,
    paciente_id: r.paciente_id,

    sv_presion_sistolica:   r.sv_presion_sistolica,
    sv_presion_diastolica:  r.sv_presion_diastolica,
    sv_frecuencia_cardiaca: r.sv_frecuencia_cardiaca,
    sv_frecuencia_resp:     r.sv_frecuencia_resp,
    sv_temperatura:    r.sv_temperatura  !== null ? Number(r.sv_temperatura)  : null,
    sv_saturacion_o2:  r.sv_saturacion_o2,
    sv_peso:           r.sv_peso  !== null ? Number(r.sv_peso)  : null,
    sv_talla:          r.sv_talla !== null ? Number(r.sv_talla) : null,

    motivo_consulta:          r.motivo_consulta,
    anamnesis:                r.anamnesis,
    examen_fisico:            r.examen_fisico,
    diagnostico_principal:    r.diagnostico_principal,
    diagnosticos_secundarios: r.diagnosticos_secundarios ?? [],
    medicamentos:             (r.medicamentos as Medicamento[]) ?? [],
    indicaciones:             r.indicaciones,
    proxima_consulta:         r.proxima_consulta,
    notas_adicionales:        r.notas_adicionales,

    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),

    medico_nombre:       r.medico?.usuario?.nombre,
    medico_apellido:     r.medico?.usuario?.apellido,
    medico_especialidad: r.medico?.especialidad,
    paciente_nombre:     r.paciente?.nombre,
    paciente_apellido:   r.paciente?.apellido,
    cita_fecha:          r.cita?.fecha ? (r.cita.fecha as Date).toISOString().slice(0, 10) : undefined,
    cita_hora_inicio:    r.cita?.hora_inicio,
    servicio_nombre:     r.cita?.servicio?.nombre,
  };
}

export async function obtenerPorCita(citaId: number): Promise<NotaClinica | null> {
  const r = await prisma.notas_clinicas.findUnique({
    where: { cita_id: citaId },
    ...withJoins,
  });
  return r ? mapNota(r) : null;
}

export async function obtenerPorId(id: number): Promise<NotaClinica | null> {
  const r = await prisma.notas_clinicas.findUnique({
    where: { id },
    ...withJoins,
  });
  return r ? mapNota(r) : null;
}

export async function obtenerPorPaciente(pacienteId: number): Promise<NotaClinica[]> {
  const rows = await prisma.notas_clinicas.findMany({
    where: { paciente_id: pacienteId },
    orderBy: { created_at: 'desc' },
    ...withJoins,
  });
  return rows.map(mapNota);
}

export async function misPacientes(usuarioId: number): Promise<PacienteDelHistorial[]> {
  const medicoId = await getMedicoId(usuarioId);

  const rows = await prisma.$queryRaw<{
    id: number; nombre: string; apellido: string;
    fecha_nacimiento: Date | null; tipo_sangre: string | null; genero: string | null;
    activo: boolean; total_notas: bigint; ultima_consulta: Date | null;
  }[]>`
    SELECT
      p.id, p.nombre, p.apellido, p.fecha_nacimiento, p.tipo_sangre, p.genero, p.activo,
      COUNT(n.id)       AS total_notas,
      MAX(n.created_at) AS ultima_consulta
    FROM pacientes p
    INNER JOIN notas_clinicas n ON n.paciente_id = p.id AND n.medico_id = ${medicoId}
    GROUP BY p.id, p.nombre, p.apellido, p.fecha_nacimiento, p.tipo_sangre, p.genero, p.activo
    HAVING COUNT(n.id) > 0
    ORDER BY ultima_consulta DESC NULLS LAST, p.apellido ASC
  `;

  return rows.map((r) => ({
    id:               r.id,
    nombre:           r.nombre,
    apellido:         r.apellido,
    fecha_nacimiento: r.fecha_nacimiento ? r.fecha_nacimiento.toISOString().slice(0, 10) : null,
    tipo_sangre:      r.tipo_sangre,
    genero:           r.genero,
    activo:           r.activo,
    total_notas:      Number(r.total_notas),
    ultima_consulta:  r.ultima_consulta ? r.ultima_consulta.toISOString().slice(0, 10) : null,
  }));
}

export async function crear(data: CrearNotaInput, usuarioId: number): Promise<NotaClinica> {
  const medicoId = await getMedicoId(usuarioId);

  const cita = await prisma.citas.findUnique({
    where: { id: data.cita_id },
    select: { medico_id: true, paciente_id: true, estado: true },
  });
  if (!cita) throw Object.assign(new Error('Cita no encontrada'), { code: 'NOT_FOUND' });
  if (cita.medico_id !== medicoId) throw Object.assign(new Error('No autorizado'), { code: 'FORBIDDEN' });
  if (cita.estado !== 'confirmada' && cita.estado !== 'atendida') {
    throw Object.assign(new Error('La cita debe estar confirmada o atendida'), { code: 'INVALID_STATE' });
  }

  const existing = await prisma.notas_clinicas.findUnique({ where: { cita_id: data.cita_id } });
  if (existing) throw Object.assign(new Error('Ya existe una nota para esta cita'), { code: 'ALREADY_EXISTS' });

  const r = await prisma.notas_clinicas.create({
    data: {
      cita_id:     data.cita_id,
      medico_id:   medicoId,
      paciente_id: cita.paciente_id,

      sv_presion_sistolica:   data.sv_presion_sistolica   ?? null,
      sv_presion_diastolica:  data.sv_presion_diastolica  ?? null,
      sv_frecuencia_cardiaca: data.sv_frecuencia_cardiaca ?? null,
      sv_frecuencia_resp:     data.sv_frecuencia_resp     ?? null,
      sv_temperatura:         data.sv_temperatura         ?? null,
      sv_saturacion_o2:       data.sv_saturacion_o2       ?? null,
      sv_peso:                data.sv_peso                ?? null,
      sv_talla:               data.sv_talla               ?? null,

      motivo_consulta:          data.motivo_consulta          ?? null,
      anamnesis:                data.anamnesis                ?? null,
      examen_fisico:            data.examen_fisico            ?? null,
      diagnostico_principal:    data.diagnostico_principal    ?? null,
      diagnosticos_secundarios: data.diagnosticos_secundarios ?? [],
      medicamentos:             data.medicamentos             ?? [],
      indicaciones:             data.indicaciones             ?? null,
      proxima_consulta:         data.proxima_consulta         ?? null,
      notas_adicionales:        data.notas_adicionales        ?? null,
    },
    ...withJoins,
  });
  return mapNota(r);
}

export async function actualizar(id: number, data: ActualizarNotaInput, usuarioId: number): Promise<NotaClinica> {
  const medicoId = await getMedicoId(usuarioId);

  const nota = await prisma.notas_clinicas.findUnique({ where: { id } });
  if (!nota) throw Object.assign(new Error('Nota no encontrada'), { code: 'NOT_FOUND' });
  if (nota.medico_id !== medicoId) throw Object.assign(new Error('No autorizado'), { code: 'FORBIDDEN' });

  const r = await prisma.notas_clinicas.update({
    where: { id },
    data: {
      sv_presion_sistolica:   data.sv_presion_sistolica   ?? null,
      sv_presion_diastolica:  data.sv_presion_diastolica  ?? null,
      sv_frecuencia_cardiaca: data.sv_frecuencia_cardiaca ?? null,
      sv_frecuencia_resp:     data.sv_frecuencia_resp     ?? null,
      sv_temperatura:         data.sv_temperatura         ?? null,
      sv_saturacion_o2:       data.sv_saturacion_o2       ?? null,
      sv_peso:                data.sv_peso                ?? null,
      sv_talla:               data.sv_talla               ?? null,

      motivo_consulta:          data.motivo_consulta          ?? null,
      anamnesis:                data.anamnesis                ?? null,
      examen_fisico:            data.examen_fisico            ?? null,
      diagnostico_principal:    data.diagnostico_principal    ?? null,
      diagnosticos_secundarios: data.diagnosticos_secundarios ?? [],
      medicamentos:             data.medicamentos             ?? [],
      indicaciones:             data.indicaciones             ?? null,
      proxima_consulta:         data.proxima_consulta         ?? null,
      notas_adicionales:        data.notas_adicionales        ?? null,
    },
    ...withJoins,
  });
  return mapNota(r);
}
