import { Component, inject, signal, computed, OnInit, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideArrowLeft, LucideSave, LucideActivity, LucideClipboardList,
  LucidePill, LucideStethoscope, LucidePlus, LucideX,
} from '@lucide/angular';
import { CitasService, Cita } from '../../citas/citas.service';
import { NotasService, NotaClinica, Medicamento } from '../notas.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

function pad(n: number): string { return String(n).padStart(2, '0'); }

@Component({
  selector: 'app-nota-form',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    LucideArrowLeft, LucideSave, LucideActivity, LucideClipboardList,
    LucidePill, LucideStethoscope, LucidePlus, LucideX,
  ],
  templateUrl: './nota-form.component.html',
  styleUrl: './nota-form.component.scss',
})
export class NotaFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private citasSvc = inject(CitasService);
  private notasSvc = inject(NotasService);
  private translate = inject(TranslateService);

  readonly icons: Record<string, Icon> = {
    back: LucideArrowLeft, save: LucideSave, vitals: LucideActivity,
    consulta: LucideClipboardList, meds: LucidePill, dx: LucideStethoscope,
    plus: LucidePlus, x: LucideX,
  };
  readonly iconMd  = { size: 18, strokeWidth: 1.5 };
  readonly iconSm  = { size: 15, strokeWidth: 1.5 };
  readonly iconXs  = { size: 14, strokeWidth: 1.5 };

  cita           = signal<Cita | null>(null);
  notaId         = signal<number | null>(null);
  cargando       = signal(true);
  guardando      = signal(false);
  errorMsg       = signal('');
  saved          = signal(false);
  draftSaved     = signal(false);
  draftRestored  = signal(false);

  private citaId    = 0;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Signos vitales ────────────────────────────────────────────────────────
  svSistolica   = signal<number | null>(null);
  svDiastolica  = signal<number | null>(null);
  svFC          = signal<number | null>(null);
  svFR          = signal<number | null>(null);
  svTemp        = signal<number | null>(null);
  svSatO2       = signal<number | null>(null);
  svPeso        = signal<number | null>(null);
  svTalla       = signal<number | null>(null);

  readonly imc = computed(() => {
    const p = this.svPeso();
    const t = this.svTalla();
    if (!p || !t || t === 0) return null;
    const tM = t / 100;
    return Math.round((p / (tM * tM)) * 10) / 10;
  });

  imcCategoria = computed(() => {
    const v = this.imc();
    if (v === null) return '';
    if (v < 18.5) return this.translate.instant('notas.imc_bajo');
    if (v < 25)   return this.translate.instant('notas.imc_normal');
    if (v < 30)   return this.translate.instant('notas.imc_sobrepeso');
    return this.translate.instant('notas.imc_obesidad');
  });

  // ── Consulta ──────────────────────────────────────────────────────────────
  motivoConsulta = signal('');
  anamnesis      = signal('');
  examenFisico   = signal('');

  // ── Diagnóstico ───────────────────────────────────────────────────────────
  diagnosticoPrincipal    = signal('');
  diagnosticosSecundarios = signal<string[]>([]);
  nuevoDx                 = signal('');

  // ── Plan ──────────────────────────────────────────────────────────────────
  medicamentos     = signal<Medicamento[]>([]);
  indicaciones     = signal('');
  proximaConsulta  = signal('');
  notasAdicionales = signal('');

  async ngOnInit(): Promise<void> {
    const citaId = Number(this.route.snapshot.paramMap.get('citaId'));
    if (!citaId) { this.volver(); return; }
    this.citaId = citaId;

    try {
      const [citaData, notaData] = await Promise.all([
        this.citasSvc.obtener(citaId),
        this.notasSvc.obtenerPorCita(citaId),
      ]);
      this.cita.set(citaData);
      if (notaData) {
        this.cargarNota(notaData);
      } else {
        this.cargarDraft();
      }
    } catch {
      this.errorMsg.set(this.translate.instant('notas.load_error'));
    } finally {
      this.cargando.set(false);
    }
  }

  private cargarNota(n: NotaClinica): void {
    this.notaId.set(n.id);
    this.svSistolica.set(n.sv_presion_sistolica);
    this.svDiastolica.set(n.sv_presion_diastolica);
    this.svFC.set(n.sv_frecuencia_cardiaca);
    this.svFR.set(n.sv_frecuencia_resp);
    this.svTemp.set(n.sv_temperatura);
    this.svSatO2.set(n.sv_saturacion_o2);
    this.svPeso.set(n.sv_peso);
    this.svTalla.set(n.sv_talla);
    this.motivoConsulta.set(n.motivo_consulta ?? '');
    this.anamnesis.set(n.anamnesis ?? '');
    this.examenFisico.set(n.examen_fisico ?? '');
    this.diagnosticoPrincipal.set(n.diagnostico_principal ?? '');
    this.diagnosticosSecundarios.set([...n.diagnosticos_secundarios]);
    this.medicamentos.set(n.medicamentos.map((m) => ({ ...m })));
    this.indicaciones.set(n.indicaciones ?? '');
    this.proximaConsulta.set(n.proxima_consulta ?? '');
    this.notasAdicionales.set(n.notas_adicionales ?? '');
  }

  agregarDx(): void {
    const v = this.nuevoDx().trim();
    if (!v) return;
    this.diagnosticosSecundarios.update((arr) => [...arr, v]);
    this.nuevoDx.set('');
    this.programarDraft();
  }

  quitarDx(i: number): void {
    this.diagnosticosSecundarios.update((arr) => arr.filter((_, idx) => idx !== i));
    this.programarDraft();
  }

  agregarMed(): void {
    this.medicamentos.update((arr) => [
      ...arr,
      { nombre: '', dosis: '', frecuencia: '', duracion: '', notas: '' },
    ]);
    this.programarDraft();
  }

  quitarMed(i: number): void {
    this.medicamentos.update((arr) => arr.filter((_, idx) => idx !== i));
    this.programarDraft();
  }

  updateMed(i: number, field: keyof Medicamento, value: string): void {
    this.medicamentos.update((arr) => {
      const copy = [...arr];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
    this.programarDraft();
  }

  // ── Borrador automático ───────────────────────────────────────────────────
  programarDraft(): void {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.guardarDraft(), 4000);
  }

  private guardarDraft(): void {
    if (!this.citaId) return;
    const snap = {
      svSistolica: this.svSistolica(), svDiastolica: this.svDiastolica(),
      svFC: this.svFC(), svFR: this.svFR(), svTemp: this.svTemp(),
      svSatO2: this.svSatO2(), svPeso: this.svPeso(), svTalla: this.svTalla(),
      motivoConsulta: this.motivoConsulta(), anamnesis: this.anamnesis(),
      examenFisico: this.examenFisico(), diagnosticoPrincipal: this.diagnosticoPrincipal(),
      diagnosticosSecundarios: this.diagnosticosSecundarios(),
      medicamentos: this.medicamentos(), indicaciones: this.indicaciones(),
      proximaConsulta: this.proximaConsulta(), notasAdicionales: this.notasAdicionales(),
    };
    localStorage.setItem(`nota-draft-${this.citaId}`, JSON.stringify(snap));
    this.draftSaved.set(true);
    setTimeout(() => this.draftSaved.set(false), 2500);
  }

  private cargarDraft(): void {
    const raw = localStorage.getItem(`nota-draft-${this.citaId}`);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      this.svSistolica.set(s.svSistolica ?? null);
      this.svDiastolica.set(s.svDiastolica ?? null);
      this.svFC.set(s.svFC ?? null);
      this.svFR.set(s.svFR ?? null);
      this.svTemp.set(s.svTemp ?? null);
      this.svSatO2.set(s.svSatO2 ?? null);
      this.svPeso.set(s.svPeso ?? null);
      this.svTalla.set(s.svTalla ?? null);
      this.motivoConsulta.set(s.motivoConsulta ?? '');
      this.anamnesis.set(s.anamnesis ?? '');
      this.examenFisico.set(s.examenFisico ?? '');
      this.diagnosticoPrincipal.set(s.diagnosticoPrincipal ?? '');
      this.diagnosticosSecundarios.set(s.diagnosticosSecundarios ?? []);
      this.medicamentos.set(s.medicamentos ?? []);
      this.indicaciones.set(s.indicaciones ?? '');
      this.proximaConsulta.set(s.proximaConsulta ?? '');
      this.notasAdicionales.set(s.notasAdicionales ?? '');
      this.draftRestored.set(true);
      setTimeout(() => this.draftRestored.set(false), 5000);
    } catch { /* borrador corrupto — ignorar */ }
  }

  private limpiarDraft(): void {
    if (this.draftTimer) { clearTimeout(this.draftTimer); this.draftTimer = null; }
    localStorage.removeItem(`nota-draft-${this.citaId}`);
  }

  formatFecha(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('es-GT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  calcEdad(fechaNac: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let age = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) age--;
    return age;
  }

  private hayContenido(): boolean {
    return !!(
      this.motivoConsulta().trim() ||
      this.diagnosticoPrincipal().trim() ||
      this.anamnesis().trim() ||
      this.svSistolica() ||
      this.svFC() ||
      this.medicamentos().some((m) => m.nombre.trim())
    );
  }

  async guardar(): Promise<void> {
    const cita = this.cita();
    if (!cita) return;

    if (!this.hayContenido()) {
      this.errorMsg.set(this.translate.instant('notas.error_vacia'));
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    const payload = {
      cita_id: cita.id,
      sv_presion_sistolica:   this.svSistolica()   ?? null,
      sv_presion_diastolica:  this.svDiastolica()  ?? null,
      sv_frecuencia_cardiaca: this.svFC()          ?? null,
      sv_frecuencia_resp:     this.svFR()          ?? null,
      sv_temperatura:         this.svTemp()        ?? null,
      sv_saturacion_o2:       this.svSatO2()       ?? null,
      sv_peso:                this.svPeso()        ?? null,
      sv_talla:               this.svTalla()       ?? null,
      motivo_consulta:          this.motivoConsulta()   || null,
      anamnesis:                this.anamnesis()        || null,
      examen_fisico:            this.examenFisico()     || null,
      diagnostico_principal:    this.diagnosticoPrincipal()    || null,
      diagnosticos_secundarios: this.diagnosticosSecundarios(),
      medicamentos:             this.medicamentos().filter((m) => m.nombre.trim()),
      indicaciones:             this.indicaciones()    || null,
      proxima_consulta:         this.proximaConsulta() || null,
      notas_adicionales:        this.notasAdicionales() || null,
    };

    try {
      const id = this.notaId();
      if (id) {
        const { cita_id: _, ...rest } = payload;
        await this.notasSvc.actualizar(id, rest);
      } else {
        const saved = await this.notasSvc.crear(payload);
        this.notaId.set(saved.id);
      }
      this.limpiarDraft();
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } catch {
      this.errorMsg.set(this.translate.instant('notas.save_error'));
    } finally {
      this.guardando.set(false);
    }
  }

  volver(): void {
    void this.router.navigate(['/citas']);
  }

  get pacienteNombre(): string {
    const c = this.cita();
    if (!c) return '';
    return `${c.paciente_nombre} ${c.paciente_apellido}`;
  }

  get medicoNombre(): string {
    const c = this.cita();
    if (!c) return '';
    return `${c.medico_nombre} ${c.medico_apellido}`;
  }

  get fechaHora(): string {
    const c = this.cita();
    if (!c) return '';
    return `${this.formatFecha(c.fecha)} · ${c.hora_inicio}`;
  }

  trackByIdx = (i: number): number => i;

  pad = pad;
}
