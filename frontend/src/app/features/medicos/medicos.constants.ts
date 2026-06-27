// Orden de presentación de días: lunes a domingo (0=domingo .. 6=sábado)
export const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0];

const SYS_KEY = 'hospital_system_config';

// Genera los slots de 30 min basados en el horario configurado del hospital
export function generarHoras(): string[] {
  let startMin = 6 * 60;      // default 06:00
  let endMin   = 19 * 60 + 30; // default 19:30
  try {
    const raw = localStorage.getItem(SYS_KEY);
    if (raw) {
      const cfg = JSON.parse(raw) as { horarioApertura?: string; horarioCierre?: string };
      const [sh, sm] = (cfg.horarioApertura ?? '06:00').split(':').map(Number);
      const [eh, em] = (cfg.horarioCierre  ?? '19:30').split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) startMin = sh * 60 + sm;
      if (!isNaN(eh) && !isNaN(em)) endMin   = eh * 60 + em;
    }
  } catch { /* fallback a defaults */ }
  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += 30) {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

export function iniciales(nombre: string, apellido: string): string {
  const a = nombre?.trim()?.[0] ?? '';
  const b = apellido?.trim()?.[0] ?? '';
  return (a + b).toUpperCase() || '·';
}

export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
