export type EstadoPago = 'pendiente' | 'pagado' | 'anulado';

export interface PagoPublico {
  id: number;
  cita_id: number;
  monto: string;
  estado: EstadoPago;
  metodo_pago: string | null;
  referencia: string | null;
  created_at: Date;
  paciente_nombre: string;
  paciente_apellido: string;
  servicio_nombre: string;
  fecha: string; // fecha de la cita (YYYY-MM-DD)
}

export interface ListaPagosResponse {
  pagos: PagoPublico[];
  total: number;
  pagina: number;
  limite: number;
}

export interface PagoStats {
  total_recaudado: number;
  recaudado_mes: number;
  num_pagados: number;
  ticket_promedio: number;
}
