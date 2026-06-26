// Orden de presentación de días: lunes a domingo (0=domingo .. 6=sábado)
export const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0];

// Bloques horarios disponibles (06:00 a 19:30 en pasos de 30 min)
export const HORAS: string[] = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

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
