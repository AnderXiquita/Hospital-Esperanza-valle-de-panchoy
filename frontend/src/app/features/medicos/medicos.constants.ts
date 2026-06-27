// Orden de presentación de días: lunes a domingo (0=domingo .. 6=sábado)
export const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0];

// Genera los slots de 30 min entre horarioApertura y horarioCierre
export function generarHoras(horarioApertura = '07:00', horarioCierre = '19:30'): string[] {
  const [sh, sm] = horarioApertura.split(':').map(Number);
  const [eh, em] = horarioCierre.split(':').map(Number);
  const startMin = (isNaN(sh) || isNaN(sm)) ? 7 * 60 : sh * 60 + sm;
  const endMin   = (isNaN(eh) || isNaN(em)) ? 19 * 60 + 30 : eh * 60 + em;
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
