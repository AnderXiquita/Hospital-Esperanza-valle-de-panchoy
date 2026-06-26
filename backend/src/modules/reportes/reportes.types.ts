// ── Resumen (dashboard de métricas) ──────────────────────────────────────────

export interface ReporteKpis {
  total_citas: number;
  citas_atendidas: number;
  porcentaje_asistencia: number;
  ingresos_total: number;
  pacientes_nuevos: number;
  ticket_promedio: number;
}

export interface CitaPorEstado {
  estado: string;
  conteo: number;
  porcentaje: number;
}

export interface IngresoPorMetodo {
  metodo: string;
  monto: number;
  conteo: number;
  porcentaje: number;
}

export interface MedicoActivo {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
  total_citas: number;
  citas_atendidas: number;
  porcentaje_asistencia: number;
  ingresos: number;
}

export interface EvolucionDia {
  fecha: string;
  conteo: number;
}

export interface ResumenReporte {
  kpis: ReporteKpis;
  citas_por_estado: CitaPorEstado[];
  ingresos_por_metodo: IngresoPorMetodo[];
  medicos_activos: MedicoActivo[];
  evolucion: EvolucionDia[];
  periodo: { desde: string; hasta: string };
}

// ── Reportes descargables (datos de detalle) ─────────────────────────────────

export interface CitaDetalle {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  paciente: string;
  medico: string;
  especialidad: string;
  servicio: string;
  duracion: number;
  estado: string;
}

export interface IngresoDetalle {
  referencia: string;
  fecha_pago: string;
  paciente: string;
  servicio: string;
  metodo: string;
  monto: number;
}

export interface MedicoDetalleReporte {
  nombre: string;
  apellido: string;
  especialidad: string;
  total_citas: number;
  citas_atendidas: number;
  porcentaje_asistencia: number;
  ingresos: number;
}

export interface PacienteDetalle {
  nombre: string;
  apellido: string;
  dpi: string;
  fecha_nacimiento: string;
  genero: string;
  tipo_sangre: string;
  telefono: string;
  fecha_registro: string;
}
