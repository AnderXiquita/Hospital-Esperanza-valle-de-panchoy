import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideSiren, LucideMapPin, LucideHeartHandshake, LucideAward,
  LucideShieldCheck, LucideUsers, LucideSprout, LucideStethoscope, LucideBone, LucideBaby,
  LucideHeartPulse, LucideScan, LucideFlaskConical, LucideActivity, LucideBrain, LucideSyringe,
  LucideScissors, LucideSmile, LucideApple, LucideWind, LucideDroplet, LucideSparkles,
  LucideFlower2,
} from '@lucide/angular';
import { InicioService, InicioResponse, InicioServicio, InicioMedico } from './inicio.service';
import { LocaleService } from '../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const FOUNDED_YEAR = 1998;

// Services come from the database as free text, so the icon is picked by keyword
const SERVICE_ICONS: { keywords: string[]; icon: Icon }[] = [
  { keywords: ['cardio'],                      icon: LucideHeartPulse },
  { keywords: ['pediatr'],                     icon: LucideBaby },
  { keywords: ['prenatal', 'ginec', 'obstet'], icon: LucideFlower2 },
  { keywords: ['trauma', 'ortoped'],           icon: LucideBone },
  { keywords: ['rayos', 'imagen'],             icon: LucideScan },
  { keywords: ['laboratorio'],                 icon: LucideFlaskConical },
  { keywords: ['fisioterapia', 'rehabilit'],   icon: LucideActivity },
  { keywords: ['neuro', 'psico', 'psiqu'],     icon: LucideBrain },
  { keywords: ['emergencia'],                  icon: LucideSiren },
  { keywords: ['cirugia'],                     icon: LucideScissors },
  { keywords: ['vacuna'],                      icon: LucideSyringe },
  { keywords: ['odonto', 'dental'],            icon: LucideSmile },
  { keywords: ['nutricion', 'diet'],           icon: LucideApple },
  { keywords: ['respirator'],                  icon: LucideWind },
  { keywords: ['urolog'],                      icon: LucideDroplet },
  { keywords: ['dermato'],                     icon: LucideSparkles },
];

type CategoriaKey = 'especialidades' | 'diagnostico' | 'terapias' | 'prevencion';

// Same keyword approach for grouping; anything unmatched is treated as a medical specialty
const CATEGORY_KEYWORDS: { key: Exclude<CategoriaKey, 'especialidades'>; keywords: string[] }[] = [
  { key: 'diagnostico', keywords: ['rayos', 'laboratorio', 'imagen'] },
  { key: 'terapias',    keywords: ['fisioterapia', 'rehabilit', 'psicolog', 'odonto', 'nutricion', 'respirator'] },
  { key: 'prevencion',  keywords: ['vacuna', 'prenatal'] },
];

const EMERGENCY_KEYWORD = 'emergencia';

const TEAM_SIZE = 6;
// Monday-first, matching the week strip used in the doctors module
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

interface Categoria {
  key: CategoriaKey;
  servicios: InicioServicio[];
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface Valor {
  key: string;
  icon: Icon;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideSiren, LucideMapPin, LucideHeartHandshake, LucideAward,
    LucideShieldCheck, LucideUsers, LucideSprout, LucideStethoscope, LucideBone, LucideBaby,
    LucideHeartPulse, LucideScan, LucideFlaskConical, LucideActivity, LucideBrain, LucideSyringe,
    LucideScissors, LucideSmile, LucideApple, LucideWind, LucideDroplet, LucideSparkles,
    LucideFlower2,
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  private inicioSvc = inject(InicioService);
  readonly localeSvc = inject(LocaleService);

  readonly data    = signal<InicioResponse | null>(null);
  readonly loading = signal(true);
  readonly error   = signal(false);

  readonly foundedYear = FOUNDED_YEAR;
  readonly yearsOfService = new Date().getFullYear() - FOUNDED_YEAR;

  readonly servicios = computed(() => this.data()?.servicios ?? []);
  readonly stats     = computed(() => this.data()?.stats ?? null);

  readonly emergencia = computed(() =>
    this.servicios().find(s => normalize(s.nombre).includes(EMERGENCY_KEYWORD)) ?? null
  );

  readonly especialidades = computed(() => this.agrupados().find(c => c.key === 'especialidades')?.servicios ?? []);
  readonly otrasCategorias = computed(() => this.agrupados().filter(c => c.key !== 'especialidades'));

  // Featured profiles: the most complete biographies, one per specialty so the team looks varied
  readonly equipo = computed((): InicioMedico[] => {
    const seen = new Set<string>();
    return [...(this.data()?.medicos ?? [])]
      .sort((a, b) => (b.biografia?.length ?? 0) - (a.biografia?.length ?? 0))
      .filter(m => {
        const key = normalize(m.especialidad);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, TEAM_SIZE);
  });


  private readonly selectedId = signal<number | null>(null);

  // Spotlight: the doctor picked in the roster, or the first one by default
  readonly destacado = computed((): InicioMedico | null => {
    const team = this.equipo();
    return team.find(m => m.id === this.selectedId()) ?? team[0] ?? null;
  });

  private readonly agrupados = computed((): Categoria[] => {
    const groups: Record<CategoriaKey, InicioServicio[]> = {
      especialidades: [], diagnostico: [], terapias: [], prevencion: [],
    };
    for (const s of this.servicios()) {
      const name = normalize(s.nombre);
      if (name.includes(EMERGENCY_KEYWORD)) continue;
      const match = CATEGORY_KEYWORDS.find(c => c.keywords.some(k => name.includes(k)));
      groups[match?.key ?? 'especialidades'].push(s);
    }
    return (Object.keys(groups) as CategoriaKey[])
      .map(key => ({ key, servicios: groups[key] }))
      .filter(c => c.servicios.length > 0);
  });

  readonly icons = {
    siren: LucideSiren,
    mapPin: LucideMapPin,
  };

  readonly pad2 = (n: number): string => String(n).padStart(2, '0');

  readonly valores: Valor[] = [
    { key: 'calidez',         icon: LucideHeartHandshake },
    { key: 'excelencia',      icon: LucideAward },
    { key: 'confidencialidad', icon: LucideShieldCheck },
    { key: 'respeto',         icon: LucideUsers },
    { key: 'comunidad',       icon: LucideSprout },
  ];

  readonly iconInputs   = { size: 20, strokeWidth: 1.25 };
  readonly iconInputsSm = { size: 16, strokeWidth: 1.5 };
  readonly skeletonRows = Array.from({ length: 6 });

  async ngOnInit(): Promise<void> {
    try {
      this.data.set(await this.inicioSvc.obtener());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  seleccionar(m: InicioMedico): void {
    this.selectedId.set(m.id);
  }

  // "los lunes, martes y jueves" / "Monday, Tuesday and Thursday", in the active language
  diasTexto(m: InicioMedico, conjunction: string): string {
    const isEs = this.localeSvc.locale().startsWith('es');
    const names = WEEK_DAYS
      .filter(d => m.dias_atencion.includes(d))
      .map(d => {
        const name = this.localeSvc.weekdayLong(d);
        if (!isEs) return name;
        const lower = name.toLowerCase();
        // Spanish plural only changes for sábado/domingo; lunes–viernes are invariable
        return lower.endsWith('o') ? lower + 's' : lower;
      });
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
  }

  initials(m: InicioMedico): string {
    return (m.nombre.charAt(0) + m.apellido.charAt(0)).toUpperCase();
  }

  // Shows only the first given name and first surname: "Raúl Barrios" instead of the full legal name
  shortName(m: InicioMedico): string {
    return `${m.nombre.split(' ')[0]} ${m.apellido.split(' ')[0]}`;
  }

  titleKey(m: InicioMedico): string {
    return m.genero === 'femenino' ? 'inicio.dra' : 'inicio.dr';
  }

  servicioIcon(servicio: InicioServicio): Icon {
    const name = normalize(servicio.nombre);
    return SERVICE_ICONS.find(entry => entry.keywords.some(k => name.includes(k)))?.icon ?? LucideStethoscope;
  }
}
