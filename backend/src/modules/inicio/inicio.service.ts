import prisma from '../../config/prisma';
import { InicioMedico, InicioResponse, InicioServicio } from './inicio.types';

// Specialty names were typed by hand ("Cardiologia" / "Cardiología"), so compare without accents or case
function normalizeEspecialidad(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export async function obtenerInicio(): Promise<InicioResponse> {
  const [medicosRaw, serviciosRaw] = await Promise.all([
    prisma.medicos.findMany({
      where: { activo: true, usuario: { activo: true } },
      select: {
        id: true,
        genero: true,
        especialidad: true,
        subespecialidad: true,
        biografia: true,
        foto_url: true,
        usuario: { select: { nombre: true, apellido: true } },
        horarios: { where: { activo: true }, select: { dia_semana: true } },
      },
      orderBy: [{ especialidad: 'asc' }, { usuario: { apellido: 'asc' } }],
    }),
    prisma.servicios.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: 'asc' },
    }),
  ]);

  const medicos: InicioMedico[] = medicosRaw.map(m => ({
    id: m.id,
    nombre: m.usuario.nombre,
    apellido: m.usuario.apellido,
    genero: m.genero,
    especialidad: m.especialidad,
    subespecialidad: m.subespecialidad,
    biografia: m.biografia,
    foto_url: m.foto_url,
    dias_atencion: [...new Set(m.horarios.map(h => h.dia_semana))].sort((a, b) => a - b),
  }));

  const servicios: InicioServicio[] = serviciosRaw;

  return {
    medicos,
    servicios,
    stats: {
      medicos: medicos.length,
      especialidades: new Set(medicos.map(m => normalizeEspecialidad(m.especialidad))).size,
      servicios: servicios.length,
    },
  };
}
