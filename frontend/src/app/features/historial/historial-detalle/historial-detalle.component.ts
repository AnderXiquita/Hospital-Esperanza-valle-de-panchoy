import { Component, inject, signal, computed, OnInit, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideArrowLeft, LucideActivity, LucideClipboardList, LucidePill,
  LucideStethoscope, LucideCalendar, LucideChevronDown,
  LucideDownload, LucideCalendarPlus,
} from '@lucide/angular';
import { NotasService, NotaClinica, Medicamento } from '../../notas/notas.service';
import { PacientesService } from '../../pacientes/pacientes.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface NotaExpandida extends NotaClinica { expanded: boolean; }

@Component({
  selector: 'app-historial-detalle',
  standalone: true,
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideArrowLeft, LucideActivity, LucideClipboardList, LucidePill,
    LucideStethoscope, LucideCalendar, LucideChevronDown,
    LucideDownload, LucideCalendarPlus,
  ],
  templateUrl: './historial-detalle.component.html',
  styleUrl: './historial-detalle.component.scss',
})
export class HistorialDetalleComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private notasSvc     = inject(NotasService);
  private pacientesSvc = inject(PacientesService);

  readonly icons: Record<string, Icon> = {
    back: LucideArrowLeft, vitals: LucideActivity, consulta: LucideClipboardList,
    meds: LucidePill, dx: LucideStethoscope, cal: LucideCalendar,
    chevron: LucideChevronDown, download: LucideDownload, calendar: LucideCalendarPlus,
  };
  readonly iconMd = { size: 18, strokeWidth: 1.5 };
  readonly iconSm = { size: 15, strokeWidth: 1.5 };
  readonly iconXs = { size: 13, strokeWidth: 1.5 };

  cargando        = signal(true);
  notas           = signal<NotaExpandida[]>([]);
  pacienteNom     = signal('');
  pacienteMeta    = signal('');
  pacienteId      = signal(0);
  exportandoPdfId = signal<number | null>(null);

  readonly allExpanded = computed(() =>
    this.notas().length > 0 && this.notas().every((n) => n.expanded)
  );

  async ngOnInit(): Promise<void> {
    const pid = Number(this.route.snapshot.paramMap.get('pacienteId'));
    if (!pid) { this.volver(); return; }
    this.pacienteId.set(pid);

    try {
      const [{ notas }, paciente] = await Promise.all([
        this.notasSvc.obtenerPorPaciente(pid),
        this.pacientesSvc.obtener(pid),
      ]);
      // All entries start collapsed — user chooses what to expand
      this.notas.set(notas.map((n) => ({ ...n, expanded: false })));
      this.pacienteNom.set(`${paciente.nombre} ${paciente.apellido}`);
      const edad = this.calcEdad(paciente.fecha_nacimiento);
      const partes: string[] = [];
      if (edad !== null) partes.push(`${edad} años`);
      if (paciente.tipo_sangre) partes.push(paciente.tipo_sangre);
      if (paciente.genero) partes.push(paciente.genero);
      this.pacienteMeta.set(partes.join(' · '));
    } finally {
      this.cargando.set(false);
    }
  }

  toggle(i: number): void {
    this.notas.update((arr) => {
      const copy = [...arr];
      copy[i] = { ...copy[i], expanded: !copy[i].expanded };
      return copy;
    });
  }

  expandAll(): void {
    this.notas.update((arr) => arr.map((n) => ({ ...n, expanded: true })));
  }

  collapseAll(): void {
    this.notas.update((arr) => arr.map((n) => ({ ...n, expanded: false })));
  }

  toggleAll(): void {
    if (this.allExpanded()) this.collapseAll();
    else this.expandAll();
  }

  volver(): void {
    void this.router.navigate(['/historial']);
  }

  irAgendar(): void {
    void this.router.navigate(['/citas'], {
      queryParams: { nueva: 1, pacienteId: this.pacienteId() },
    });
  }

  async exportarPdf(nota: NotaExpandida): Promise<void> {
    this.exportandoPdfId.set(nota.id);
    try {
      const { jsPDF } = await import('jspdf');
      const doc  = new jsPDF();
      const W    = doc.internal.pageSize.getWidth();
      const M    = 16;
      let y      = 18;

      const addLine = (text: string, size = 10, bold = false, color = 30) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(color);
        doc.text(text, M, y);
        y += size * 0.45 + 2;
      };

      const rule = (gap = 4) => {
        y += gap;
        doc.setDrawColor(210);
        doc.line(M, y, W - M, y);
        y += gap + 2;
      };

      const section = (label: string) => {
        y += 2;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(130);
        doc.text(label.toUpperCase(), M, y);
        y += 5;
        doc.setTextColor(30);
      };

      // ── Header ──────────────────────────────────────────────────────────────
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 76, 86);
      doc.text('Hospital Esperanza Valle de Panchoy', W / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('NOTA CLÍNICA', W / 2, y, { align: 'center' });
      rule(4);

      // ── Paciente ────────────────────────────────────────────────────────────
      addLine(this.pacienteNom(), 12, true);
      if (this.pacienteMeta()) addLine(this.pacienteMeta(), 9, false, 100);
      y += 2;

      if (nota.cita_fecha) {
        const fecha = this.formatFecha(nota.cita_fecha);
        addLine(`Fecha: ${fecha}${nota.cita_hora_inicio ? ' · ' + nota.cita_hora_inicio : ''}`, 9, false, 80);
      }
      if (nota.medico_nombre) {
        const dr = `Dr. ${nota.medico_nombre} ${nota.medico_apellido ?? ''}`;
        addLine(`${dr}${nota.medico_especialidad ? ' — ' + nota.medico_especialidad : ''}`, 9, false, 80);
      }
      if (nota.servicio_nombre) addLine(`Servicio: ${nota.servicio_nombre}`, 9, false, 80);
      rule();

      // ── Signos vitales ──────────────────────────────────────────────────────
      if (this.tieneSignos(nota)) {
        section('Signos Vitales');
        const vitales: string[] = [];
        if (nota.sv_presion_sistolica) vitales.push(`P.A. ${this.presionLabel(nota)}`);
        if (nota.sv_frecuencia_cardiaca) vitales.push(`F.C. ${nota.sv_frecuencia_cardiaca} lpm`);
        if (nota.sv_temperatura) vitales.push(`Temp. ${nota.sv_temperatura} °C`);
        if (nota.sv_saturacion_o2) vitales.push(`Sat. O₂ ${nota.sv_saturacion_o2}%`);
        if (nota.sv_peso) vitales.push(`Peso ${nota.sv_peso} kg`);
        if (nota.sv_talla) vitales.push(`Talla ${nota.sv_talla} cm`);
        addLine(vitales.join('   '), 9);
        y += 2;
      }

      // ── SOAP ────────────────────────────────────────────────────────────────
      const campos: Array<[string, string | null]> = [
        ['Motivo de Consulta', nota.motivo_consulta],
        ['Anamnesis / Historia Actual', nota.anamnesis],
        ['Examen Físico', nota.examen_fisico],
      ];
      for (const [label, val] of campos) {
        if (!val) continue;
        section(label);
        const lines = doc.splitTextToSize(val, W - M * 2) as string[];
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30);
        doc.text(lines, M, y);
        y += lines.length * 5 + 4;
      }

      // ── Diagnóstico ─────────────────────────────────────────────────────────
      if (nota.diagnostico_principal || nota.diagnosticos_secundarios.length) {
        section('Diagnóstico');
        if (nota.diagnostico_principal) addLine(nota.diagnostico_principal, 10, true);
        for (const dx of nota.diagnosticos_secundarios) addLine(`— ${dx}`, 9);
        y += 2;
      }

      // ── Medicamentos ────────────────────────────────────────────────────────
      if (nota.medicamentos.length) {
        section('Medicamentos Recetados');
        for (const m of nota.medicamentos) addLine(this.medLabel(m), 9);
        y += 2;
      }

      // ── Indicaciones y seguimiento ──────────────────────────────────────────
      if (nota.indicaciones) {
        section('Indicaciones Generales');
        const lines = doc.splitTextToSize(nota.indicaciones, W - M * 2) as string[];
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, M, y);
        y += lines.length * 5 + 4;
      }
      if (nota.proxima_consulta) {
        section('Próxima Consulta');
        addLine(nota.proxima_consulta, 10);
      }
      if (nota.notas_adicionales) {
        section('Notas Adicionales');
        addLine(nota.notas_adicionales, 9, false, 100);
      }

      // ── Footer ──────────────────────────────────────────────────────────────
      const total = doc.internal.pages.length - 1;
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(`Hospital Esperanza Valle de Panchoy  ·  Página ${p} de ${total}`, W / 2,
          doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }

      const nombre = this.pacienteNom().replace(/\s+/g, '-');
      const fecha  = nota.cita_fecha ?? 'consulta';
      const blob   = doc.output('blob');
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href = url; a.download = `nota-${nombre}-${fecha}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      this.exportandoPdfId.set(null);
    }
  }

  calcEdad(fechaNac: string | null): number | null {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let age = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) age--;
    return age;
  }

  formatFecha(iso: string | undefined): string {
    if (!iso) return '';
    return new Date(`${iso}T12:00:00`).toLocaleDateString('es-GT', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  tieneSignos(n: NotaClinica): boolean {
    return !!(n.sv_presion_sistolica || n.sv_frecuencia_cardiaca ||
              n.sv_temperatura || n.sv_saturacion_o2 || n.sv_peso || n.sv_talla);
  }

  presionLabel(n: NotaClinica): string {
    if (n.sv_presion_sistolica && n.sv_presion_diastolica) {
      return `${n.sv_presion_sistolica}/${n.sv_presion_diastolica} mmHg`;
    }
    return `${n.sv_presion_sistolica} mmHg`;
  }

  medLabel(m: Medicamento): string {
    const partes = [m.nombre, m.dosis, m.frecuencia, m.duracion].filter(Boolean);
    return partes.join(' · ');
  }
}
