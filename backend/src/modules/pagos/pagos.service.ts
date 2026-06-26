import { randomBytes } from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { notificarPorRol } from '../notificaciones/notificaciones.helper';
import { ListaPagosResponse, PagoPublico, PagoStats, EstadoPago } from './pagos.types';
import { CrearPagoInput } from './pagos.schema';

export interface CitaPendiente {
  cita_id: number;
  fecha: string;
  hora_inicio: string;
  paciente_nombre: string;
  paciente_apellido: string;
  servicio_nombre: string;
  servicio_precio: string;
  medico_nombre: string;
  medico_apellido: string;
}

const includeRelations = {
  cita: {
    include: {
      paciente: { select: { nombre: true, apellido: true } },
      servicio: { select: { nombre: true } },
    },
  },
} as const;

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPago(p: any): PagoPublico {
  return {
    id: p.id,
    cita_id: p.cita_id,
    monto: p.monto != null ? p.monto.toString() : '0',
    estado: p.estado as EstadoPago,
    metodo_pago: p.metodo_pago,
    referencia: p.referencia,
    created_at: p.created_at,
    paciente_nombre: p.cita.paciente.nombre,
    paciente_apellido: p.cita.paciente.apellido,
    servicio_nombre: p.cita.servicio.nombre,
    fecha: dateToISO(p.cita.fecha),
  };
}

export async function listarPagos(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string,
  estado?: EstadoPago
): Promise<ListaPagosResponse> {
  const skip = (pagina - 1) * limite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (estado) where.estado = estado;
  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT p.id FROM pagos p
      JOIN citas c ON c.id = p.cita_id
      JOIN pacientes pac ON pac.id = c.paciente_id
      WHERE unaccent(pac.nombre) ILIKE unaccent(${pat})
      OR unaccent(pac.apellido) ILIKE unaccent(${pat})
      OR p.referencia ILIKE ${pat}
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { pagos: [], total: 0, pagina, limite };
    where.id = { in: ids };
  }

  const [rows, total] = await Promise.all([
    prisma.pagos.findMany({
      where,
      skip,
      take: limite,
      orderBy: { created_at: 'desc' },
      include: includeRelations,
    }),
    prisma.pagos.count({ where }),
  ]);

  return { pagos: rows.map(mapPago), total, pagina, limite };
}

export async function citasPendientes(busqueda?: string): Promise<CitaPendiente[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    pago: null,
    estado: { notIn: ['cancelada', 'no_presentado'] },
  };
  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM pacientes
      WHERE unaccent(nombre) ILIKE unaccent(${pat})
      OR unaccent(apellido) ILIKE unaccent(${pat})
      OR dpi ILIKE ${pat}
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return [];
    where.paciente_id = { in: ids };
  }

  const rows = await prisma.citas.findMany({
    where,
    orderBy: { fecha: 'desc' },
    take: 50,
    include: {
      paciente: { select: { nombre: true, apellido: true } },
      servicio: { select: { nombre: true, precio: true } },
      medico: { include: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  });

  return rows.map((c) => ({
    cita_id: c.id,
    fecha: dateToISO(c.fecha),
    hora_inicio: c.hora_inicio,
    paciente_nombre: c.paciente.nombre,
    paciente_apellido: c.paciente.apellido,
    servicio_nombre: c.servicio.nombre,
    servicio_precio: c.servicio.precio != null ? c.servicio.precio.toString() : '0',
    medico_nombre: c.medico.usuario.nombre,
    medico_apellido: c.medico.usuario.apellido,
  }));
}

function generarReferencia(): string {
  return `SIM-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function crearPago(input: CrearPagoInput, requestingUserId?: number): Promise<PagoPublico> {
  const cita = await prisma.citas.findUnique({
    where: { id: input.cita_id },
    include: { pago: true },
  });
  if (!cita) throw new Error('CITA_NOT_FOUND');
  if (cita.pago) throw new Error('ALREADY_PAID');

  const pago = await prisma.pagos.create({
    data: {
      cita_id: input.cita_id,
      monto: input.monto,
      estado: 'pagado',
      metodo_pago: input.metodo_pago,
      referencia: generarReferencia(),
    },
    include: includeRelations,
  });

  const p = mapPago(pago);
  void notificarPorRol(
    'admin', 'pago_registrado', 'Pago registrado',
    `Q ${Number(p.monto).toFixed(2)} — ${p.paciente_nombre} ${p.paciente_apellido}`,
    '/pagos', requestingUserId
  );
  return p;
}

export async function obtenerPago(id: number): Promise<PagoPublico | null> {
  const pago = await prisma.pagos.findUnique({ where: { id }, include: includeRelations });
  return pago ? mapPago(pago) : null;
}

export async function anularPago(id: number, requestingUserId?: number): Promise<PagoPublico | null> {
  const existe = await prisma.pagos.findUnique({ where: { id } });
  if (!existe) return null;
  const pago = await prisma.pagos.update({
    where: { id },
    data: { estado: 'anulado' },
    include: includeRelations,
  });
  const p = mapPago(pago);
  void notificarPorRol(
    'admin', 'pago_anulado', 'Pago anulado',
    `Q ${Number(p.monto).toFixed(2)} de ${p.paciente_nombre} ${p.paciente_apellido} fue anulado`,
    '/pagos', requestingUserId
  );
  return p;
}

export async function estadisticas(): Promise<PagoStats> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [aggTotal, aggMes, numPagados] = await Promise.all([
    prisma.pagos.aggregate({ where: { estado: 'pagado' }, _sum: { monto: true } }),
    prisma.pagos.aggregate({
      where: { estado: 'pagado', created_at: { gte: inicioMes } },
      _sum: { monto: true },
    }),
    prisma.pagos.count({ where: { estado: 'pagado' } }),
  ]);

  const total_recaudado = aggTotal._sum.monto != null ? Number(aggTotal._sum.monto) : 0;
  const recaudado_mes = aggMes._sum.monto != null ? Number(aggMes._sum.monto) : 0;
  const ticket_promedio = numPagados > 0 ? Math.round((total_recaudado / numPagados) * 100) / 100 : 0;

  return { total_recaudado, recaudado_mes, num_pagados: numPagados, ticket_promedio };
}
