import { Injectable, inject } from '@angular/core';
import {
  ReportesService,
  CitaDetalle, IngresoDetalle, MedicoDetalleReporte, PacienteDetalle,
} from './reportes.service';

// ── Colores del hospital ───────────────────────────────────────────────────────
const INK    = [15,  17,  23]  as [number, number, number];
const TEAL   = [21,  76,  86]  as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const GRAY50 = [248, 249, 250] as [number, number, number];
const GRAY4  = [156, 163, 175] as [number, number, number];
const GRAY6  = [107, 114, 128] as [number, number, number];

// ── Utilidades ─────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  if (!iso || iso === '—') return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${meses[m - 1]} ${y}`;
}

function formatAhora(): string {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${formatFecha(now.toISOString().slice(0, 10))} a las ${h}:${min}`;
}

function formatQ(n: number): string {
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nombreArchivo(tipo: string, desde: string, hasta: string): string {
  return `reporte-${tipo}-${desde}-al-${hasta}.pdf`;
}

// ── Construcción del documento (doc tipado como any para evitar import estático) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function agregarEncabezado(doc: any, titulo: string, desde: string, hasta: string): number {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(...INK);
  doc.rect(0, 0, w, 30, 'F');

  doc.setFillColor(...TEAL);
  doc.rect(0, 30, w, 2.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('HOSPITAL ESPERANZA VALLE DE PANCHOY', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Antigua Guatemala, Guatemala  ·  Sistema de Gestión Médica', 14, 21);

  doc.setFontSize(7);
  doc.text('Confidencial — Solo para uso interno', w - 14, 13, { align: 'right' });

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(titulo, 14, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY6);
  doc.text(`Período: ${formatFecha(desde)} — ${formatFecha(hasta)}`, 14, 56);
  doc.text(`Generado el: ${formatAhora()}`, 14, 62);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, 66, w - 14, 66);

  return 72;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function agregarPiePagina(doc: any): void {
  const total = doc.getNumberOfPages();
  const w     = doc.internal.pageSize.getWidth();
  const h     = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    doc.setFillColor(...GRAY50);
    doc.rect(0, h - 11, w, 11, 'F');

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(0, h - 11, w, h - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY4);
    doc.text('Hospital Esperanza Valle de Panchoy', 14, h - 4.5);
    doc.text(`Página ${i} de ${total}`, w - 14, h - 4.5, { align: 'right' });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seccionResumen(doc: any, startY: number, items: { label: string; value: string }[]): void {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - 28) / items.length;

  doc.setFillColor(...GRAY50);
  doc.rect(14, startY, w - 28, 16, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(14, startY, w - 28, 16, 'S');

  items.forEach((item, idx) => {
    const x = 14 + idx * colW + colW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(item.value, x, startY + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY6);
    doc.text(item.label, x, startY + 13, { align: 'center' });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function opcionesTabla(startY: number, head: string[][], body: (string | number)[][]): any {
  return {
    startY,
    head,
    body,
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: INK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: GRAY50,
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.1,
  };
}

// ── Abrir en nueva pestaña + descargar ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function publicarPDF(doc: any, filename: string): void {
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);

  window.open(url, '_blank');

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Carga dinámica de dependencias PDF ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedDeps: { jsPDF: any; autoTable: any } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPdfDeps(): Promise<{ jsPDF: any; autoTable: any }> {
  if (cachedDeps) return cachedDeps;

  const [jspdfMod, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  // jspdf-autotable v5 puede tener default export o named export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = (autoTableMod as any).default ?? autoTableMod;

  cachedDeps = { jsPDF: jspdfMod.jsPDF, autoTable };
  return cachedDeps;
}

// ── Servicio ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReportesPdfService {
  private svc = inject(ReportesService);

  // ── Reporte de Citas ──────────────────────────────────────────────────

  async generarCitas(desde: string, hasta: string): Promise<void> {
    const { jsPDF, autoTable } = await getPdfDeps();
    const res = await this.svc.citas(desde, hasta);
    const { datos } = res;

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let   curY = agregarEncabezado(doc, 'REPORTE DE CITAS', desde, hasta);

    const atendidas     = datos.filter((c: CitaDetalle) => c.estado === 'Atendida').length;
    const canceladas    = datos.filter((c: CitaDetalle) => c.estado === 'Cancelada').length;
    const pctAsistencia = datos.length > 0 ? Math.round((atendidas / datos.length) * 100) : 0;

    seccionResumen(doc, curY, [
      { label: 'Total de citas',     value: String(datos.length) },
      { label: 'Atendidas',          value: String(atendidas)    },
      { label: 'Canceladas',         value: String(canceladas)   },
      { label: 'Tasa de asistencia', value: `${pctAsistencia}%` },
    ]);
    curY += 22;

    if (datos.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY6);
      doc.text('No se encontraron citas en el período seleccionado.', 14, curY + 8);
    } else {
      autoTable(doc, opcionesTabla(
        curY,
        [['Fecha', 'Hora', 'Paciente', 'Médico', 'Servicio', 'Estado', 'Duración']],
        datos.map((c: CitaDetalle) => [
          formatFecha(c.fecha),
          `${c.hora_inicio} – ${c.hora_fin}`,
          c.paciente,
          `Dr. ${c.medico}`,
          c.servicio,
          c.estado,
          `${c.duracion} min`,
        ]),
      ));
    }

    agregarPiePagina(doc);
    publicarPDF(doc, nombreArchivo('citas', desde, hasta));
  }

  // ── Reporte de Ingresos ───────────────────────────────────────────────

  async generarIngresos(desde: string, hasta: string): Promise<void> {
    const { jsPDF, autoTable } = await getPdfDeps();
    const res = await this.svc.ingresos(desde, hasta);
    const { datos, total_monto } = res;

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let   curY = agregarEncabezado(doc, 'REPORTE DE INGRESOS', desde, hasta);

    const porMetodo: Record<string, number> = {};
    datos.forEach((p: IngresoDetalle) => {
      porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + p.monto;
    });
    const metodosStr = Object.entries(porMetodo)
      .map(([m, v]) => `${m}: ${formatQ(v)}`)
      .join('   ·   ');

    seccionResumen(doc, curY, [
      { label: 'Total recaudado',   value: formatQ(total_monto)  },
      { label: 'Pagos registrados', value: String(datos.length)  },
      { label: 'Ticket promedio',   value: datos.length > 0 ? formatQ(total_monto / datos.length) : 'Q 0.00' },
    ]);
    curY += 22;

    if (metodosStr) {
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY6);
      doc.text(`Desglose por método  ·  ${metodosStr}`, 14, curY);
      curY += 8;
    }

    if (datos.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY6);
      doc.text('No se encontraron pagos en el período seleccionado.', 14, curY + 8);
    } else {
      autoTable(doc, opcionesTabla(
        curY,
        [['Referencia', 'Fecha', 'Paciente', 'Servicio', 'Método', 'Monto']],
        datos.map((p: IngresoDetalle) => [
          p.referencia,
          formatFecha(p.fecha_pago),
          p.paciente,
          p.servicio,
          p.metodo,
          formatQ(p.monto),
        ]),
      ));

      const finalY = doc.lastAutoTable?.finalY ?? curY + 10;
      const w = doc.internal.pageSize.getWidth();
      doc.setFillColor(...INK);
      doc.rect(14, finalY + 2, w - 28, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text('TOTAL', 18, finalY + 7.5);
      doc.text(formatQ(total_monto), w - 15, finalY + 7.5, { align: 'right' });
    }

    agregarPiePagina(doc);
    publicarPDF(doc, nombreArchivo('ingresos', desde, hasta));
  }

  // ── Reporte de Médicos ────────────────────────────────────────────────

  async generarMedicos(desde: string, hasta: string): Promise<void> {
    const { jsPDF, autoTable } = await getPdfDeps();
    const res = await this.svc.medicos(desde, hasta);
    const { datos } = res;

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let   curY = agregarEncabezado(doc, 'REPORTE DE ACTIVIDAD MÉDICA', desde, hasta);

    const totalCitas     = datos.reduce((s: number, m: MedicoDetalleReporte) => s + m.total_citas, 0);
    const totalAtendidas = datos.reduce((s: number, m: MedicoDetalleReporte) => s + m.citas_atendidas, 0);
    const totalIngresos  = datos.reduce((s: number, m: MedicoDetalleReporte) => s + m.ingresos, 0);

    seccionResumen(doc, curY, [
      { label: 'Médicos con actividad', value: String(datos.length)    },
      { label: 'Total de citas',        value: String(totalCitas)      },
      { label: 'Citas atendidas',       value: String(totalAtendidas)  },
      { label: 'Ingresos generados',    value: formatQ(totalIngresos)  },
    ]);
    curY += 22;

    if (datos.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY6);
      doc.text('No se encontró actividad médica en el período seleccionado.', 14, curY + 8);
    } else {
      autoTable(doc, opcionesTabla(
        curY,
        [['#', 'Médico', 'Especialidad', 'Total citas', 'Atendidas', 'Asistencia', 'Ingresos']],
        datos.map((m: MedicoDetalleReporte, i: number) => [
          String(i + 1),
          `${m.nombre} ${m.apellido}`,
          m.especialidad,
          String(m.total_citas),
          String(m.citas_atendidas),
          `${m.porcentaje_asistencia}%`,
          formatQ(m.ingresos),
        ]),
      ));
    }

    agregarPiePagina(doc);
    publicarPDF(doc, nombreArchivo('medicos', desde, hasta));
  }

  // ── Reporte de Pacientes ──────────────────────────────────────────────

  async generarPacientes(desde: string, hasta: string): Promise<void> {
    const { jsPDF, autoTable } = await getPdfDeps();
    const res = await this.svc.pacientes(desde, hasta);
    const { datos } = res;

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let   curY = agregarEncabezado(doc, 'REPORTE DE PACIENTES NUEVOS', desde, hasta);

    seccionResumen(doc, curY, [
      { label: 'Pacientes registrados', value: String(datos.length) },
    ]);
    curY += 22;

    if (datos.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY6);
      doc.text('No se registraron pacientes nuevos en el período seleccionado.', 14, curY + 8);
    } else {
      autoTable(doc, opcionesTabla(
        curY,
        [['Nombre', 'Apellido', 'DPI', 'Nacimiento', 'Género', 'Sangre', 'Teléfono', 'Registro']],
        datos.map((p: PacienteDetalle) => [
          p.nombre,
          p.apellido,
          p.dpi,
          formatFecha(p.fecha_nacimiento),
          p.genero,
          p.tipo_sangre,
          p.telefono,
          formatFecha(p.fecha_registro),
        ]),
      ));
    }

    agregarPiePagina(doc);
    publicarPDF(doc, nombreArchivo('pacientes', desde, hasta));
  }
}
