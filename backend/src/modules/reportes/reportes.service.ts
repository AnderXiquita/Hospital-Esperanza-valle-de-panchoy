import prisma from '../../config/prisma';
import {
  ResumenReporte, ReporteKpis, CitaPorEstado,
  IngresoPorMetodo, MedicoActivo, EvolucionDia,
  CitaDetalle, IngresoDetalle, MedicoDetalleReporte, PacienteDetalle,
} from './reportes.types';

const ESTADO_LABELS: Record<string, string> = {
  agendada:      'Agendada',
  confirmada:    'Confirmada',
  atendida:      'Atendida',
  reprogramada:  'Reprogramada',
  cancelada:     'Cancelada',
  no_presentado: 'No presentó',
};

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
};

function parseFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function addDay(fecha: string): Date {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Resumen (métricas generales) ──────────────────────────────────────────────

export async function obtenerResumen(desde: string, hasta: string): Promise<ResumenReporte> {
  const fechaDesde = parseFecha(desde);
  const fechaHasta = addDay(hasta);

  const [todasCitas, pagosData, pacientesNuevos, medicosData] = await Promise.all([
    prisma.citas.findMany({
      where: { fecha: { gte: fechaDesde, lt: fechaHasta } },
      include: {
        medico: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        servicio: { select: { nombre: true, duracion: true } },
        pago: { select: { monto: true, estado: true, metodo_pago: true } },
      },
      orderBy: { fecha: 'asc' },
    }),
    prisma.pagos.findMany({
      where: { estado: 'pagado', created_at: { gte: fechaDesde, lt: fechaHasta } },
      select: { monto: true, metodo_pago: true },
    }),
    prisma.pacientes.count({ where: { created_at: { gte: fechaDesde, lt: fechaHasta } } }),
    prisma.medicos.findMany({
      where: { activo: true },
      include: { usuario: { select: { nombre: true, apellido: true } } },
    }),
  ]);

  const totalCitas = todasCitas.length;
  const citasAtendidas = todasCitas.filter(c => c.estado === 'atendida').length;
  const porcentajeAsistencia = totalCitas > 0 ? Math.round((citasAtendidas / totalCitas) * 100) : 0;
  const ingresosTotal = pagosData.reduce((s, p) => s + (p.monto ? Number(p.monto) : 0), 0);
  const ticketPromedio = pagosData.length > 0 ? Math.round((ingresosTotal / pagosData.length) * 100) / 100 : 0;

  const kpis: ReporteKpis = {
    total_citas: totalCitas,
    citas_atendidas: citasAtendidas,
    porcentaje_asistencia: porcentajeAsistencia,
    ingresos_total: ingresosTotal,
    pacientes_nuevos: pacientesNuevos,
    ticket_promedio: ticketPromedio,
  };

  const estadoMap: Record<string, number> = {};
  todasCitas.forEach(c => { estadoMap[c.estado] = (estadoMap[c.estado] ?? 0) + 1; });
  const citasPorEstado: CitaPorEstado[] = Object.entries(estadoMap)
    .map(([estado, conteo]) => ({
      estado: ESTADO_LABELS[estado] ?? estado,
      conteo,
      porcentaje: totalCitas > 0 ? Math.round((conteo / totalCitas) * 100) : 0,
    }))
    .sort((a, b) => b.conteo - a.conteo);

  const metodoMap: Record<string, { monto: number; conteo: number }> = {};
  pagosData.forEach(p => {
    const key = p.metodo_pago ?? 'otro';
    if (!metodoMap[key]) metodoMap[key] = { monto: 0, conteo: 0 };
    metodoMap[key].monto += p.monto ? Number(p.monto) : 0;
    metodoMap[key].conteo += 1;
  });
  const ingresosPorMetodo: IngresoPorMetodo[] = Object.entries(metodoMap)
    .map(([metodo, data]) => ({
      metodo: METODO_LABELS[metodo] ?? metodo,
      monto: data.monto,
      conteo: data.conteo,
      porcentaje: ingresosTotal > 0 ? Math.round((data.monto / ingresosTotal) * 100) : 0,
    }))
    .sort((a, b) => b.monto - a.monto);

  const medicoIdMap: Record<number, { total: number; atendidas: number; ingresos: number }> = {};
  todasCitas.forEach(c => {
    if (!medicoIdMap[c.medico_id]) medicoIdMap[c.medico_id] = { total: 0, atendidas: 0, ingresos: 0 };
    medicoIdMap[c.medico_id].total += 1;
    if (c.estado === 'atendida') medicoIdMap[c.medico_id].atendidas += 1;
    if (c.pago?.estado === 'pagado' && c.pago.monto) medicoIdMap[c.medico_id].ingresos += Number(c.pago.monto);
  });
  const medicosActivos: MedicoActivo[] = medicosData
    .filter(m => medicoIdMap[m.id])
    .map(m => {
      const s = medicoIdMap[m.id];
      return {
        id: m.id,
        nombre: m.usuario.nombre,
        apellido: m.usuario.apellido,
        especialidad: m.especialidad,
        total_citas: s.total,
        citas_atendidas: s.atendidas,
        porcentaje_asistencia: s.total > 0 ? Math.round((s.atendidas / s.total) * 100) : 0,
        ingresos: s.ingresos,
      };
    })
    .sort((a, b) => b.total_citas - a.total_citas)
    .slice(0, 10);

  const diaMap: Record<string, number> = {};
  todasCitas.forEach(c => {
    const fecha = dateToISO(c.fecha);
    diaMap[fecha] = (diaMap[fecha] ?? 0) + 1;
  });
  const evolucion: EvolucionDia[] = Object.entries(diaMap)
    .map(([fecha, conteo]) => ({ fecha, conteo }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { kpis, citas_por_estado: citasPorEstado, ingresos_por_metodo: ingresosPorMetodo, medicos_activos: medicosActivos, evolucion, periodo: { desde, hasta } };
}

// ── Reporte de Citas (detalle para PDF) ───────────────────────────────────────

export async function reporteCitas(desde: string, hasta: string): Promise<CitaDetalle[]> {
  const fechaDesde = parseFecha(desde);
  const fechaHasta = addDay(hasta);

  const citas = await prisma.citas.findMany({
    where: { fecha: { gte: fechaDesde, lt: fechaHasta } },
    include: {
      paciente: { select: { nombre: true, apellido: true } },
      medico: {
        select: {
          especialidad: true,
          usuario: { select: { nombre: true, apellido: true } },
        },
      },
      servicio: { select: { nombre: true, duracion: true } },
    },
    orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
  });

  return citas.map(c => ({
    fecha: dateToISO(c.fecha),
    hora_inicio: c.hora_inicio,
    hora_fin: c.hora_fin,
    paciente: `${c.paciente.nombre} ${c.paciente.apellido}`,
    medico: `${c.medico.usuario.nombre} ${c.medico.usuario.apellido}`,
    especialidad: c.medico.especialidad,
    servicio: c.servicio.nombre,
    duracion: c.servicio.duracion,
    estado: ESTADO_LABELS[c.estado] ?? c.estado,
  }));
}

// ── Reporte de Ingresos (detalle para PDF) ────────────────────────────────────

export async function reporteIngresos(desde: string, hasta: string): Promise<IngresoDetalle[]> {
  const fechaDesde = parseFecha(desde);
  const fechaHasta = addDay(hasta);

  const pagos = await prisma.pagos.findMany({
    where: { created_at: { gte: fechaDesde, lt: fechaHasta } },
    include: {
      cita: {
        include: {
          paciente: { select: { nombre: true, apellido: true } },
          servicio: { select: { nombre: true } },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  return pagos.map(p => ({
    referencia: p.referencia ?? '—',
    fecha_pago: dateToISO(p.created_at),
    paciente: `${p.cita.paciente.nombre} ${p.cita.paciente.apellido}`,
    servicio: p.cita.servicio.nombre,
    metodo: METODO_LABELS[p.metodo_pago ?? ''] ?? (p.metodo_pago ?? '—'),
    monto: p.monto ? Number(p.monto) : 0,
  }));
}

// ── Reporte de Médicos (detalle para PDF) ─────────────────────────────────────

export async function reporteMedicos(desde: string, hasta: string): Promise<MedicoDetalleReporte[]> {
  const fechaDesde = parseFecha(desde);
  const fechaHasta = addDay(hasta);

  const [citas, medicos] = await Promise.all([
    prisma.citas.findMany({
      where: { fecha: { gte: fechaDesde, lt: fechaHasta } },
      select: {
        medico_id: true,
        estado: true,
        pago: { select: { monto: true, estado: true } },
      },
    }),
    prisma.medicos.findMany({
      where: { activo: true },
      select: {
        id: true,
        especialidad: true,
        usuario: { select: { nombre: true, apellido: true } },
      },
    }),
  ]);

  const map: Record<number, { total: number; atendidas: number; ingresos: number }> = {};
  citas.forEach(c => {
    if (!map[c.medico_id]) map[c.medico_id] = { total: 0, atendidas: 0, ingresos: 0 };
    map[c.medico_id].total += 1;
    if (c.estado === 'atendida') map[c.medico_id].atendidas += 1;
    if (c.pago?.estado === 'pagado' && c.pago.monto) map[c.medico_id].ingresos += Number(c.pago.monto);
  });

  return medicos
    .filter(m => map[m.id])
    .map(m => {
      const s = map[m.id];
      return {
        nombre: m.usuario.nombre,
        apellido: m.usuario.apellido,
        especialidad: m.especialidad,
        total_citas: s.total,
        citas_atendidas: s.atendidas,
        porcentaje_asistencia: s.total > 0 ? Math.round((s.atendidas / s.total) * 100) : 0,
        ingresos: s.ingresos,
      };
    })
    .sort((a, b) => b.total_citas - a.total_citas);
}

// ── Reporte de Pacientes nuevos (detalle para PDF) ────────────────────────────

export async function reportePacientes(desde: string, hasta: string): Promise<PacienteDetalle[]> {
  const fechaDesde = parseFecha(desde);
  const fechaHasta = addDay(hasta);

  const pacientes = await prisma.pacientes.findMany({
    where: { created_at: { gte: fechaDesde, lt: fechaHasta } },
    orderBy: { created_at: 'asc' },
  });

  return pacientes.map(p => ({
    nombre: p.nombre,
    apellido: p.apellido,
    dpi: p.dpi ?? '—',
    fecha_nacimiento: p.fecha_nacimiento ? dateToISO(p.fecha_nacimiento) : '—',
    genero: p.genero ?? '—',
    tipo_sangre: p.tipo_sangre ?? '—',
    telefono: p.telefono ?? '—',
    fecha_registro: dateToISO(p.created_at),
  }));
}
