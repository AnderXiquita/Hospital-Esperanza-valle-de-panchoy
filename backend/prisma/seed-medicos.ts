import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const medicos = [
  {
    nombre: 'Carlos', apellido: 'Mendoza Ruiz',
    email: 'c.mendoza@hospital.com',
    especialidad: 'Cardiología', subespecialidad: 'Arritmias y electrofisiología',
    numero_colegiado: 'CM-10201', dpi: '2801456789012',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1975-03-14'),
    telefono: '5510-2201', consultorio: 'A-101',
    tarifa_consulta: 450.00,
    biografia: 'Cardiólogo con más de 20 años de experiencia en diagnóstico y tratamiento de arritmias cardíacas. Formado en el Instituto Nacional de Cardiología.',
    fecha_ingreso: new Date('2018-02-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 2, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 3, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 4, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 5, hora_inicio: '08:00', hora_fin: '12:00' },
    ],
  },
  {
    nombre: 'Ana Sofía', apellido: 'López Ramírez',
    email: 'a.lopez@hospital.com',
    especialidad: 'Neurología', subespecialidad: 'Neurología pediátrica',
    numero_colegiado: 'NR-30445', dpi: '2650234567890',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1982-07-22'),
    telefono: '5521-3302', consultorio: 'B-205',
    tarifa_consulta: 400.00,
    biografia: 'Neuróloga especializada en el diagnóstico y tratamiento de enfermedades neurológicas en población pediátrica. Miembro de la Sociedad Guatemalteca de Neurología.',
    fecha_ingreso: new Date('2019-05-15'),
    horarios: [
      { dia_semana: 1, hora_inicio: '09:00', hora_fin: '14:00' },
      { dia_semana: 3, hora_inicio: '09:00', hora_fin: '14:00' },
      { dia_semana: 5, hora_inicio: '09:00', hora_fin: '13:00' },
    ],
  },
  {
    nombre: 'Roberto', apellido: 'Fuentes Estrada',
    email: 'r.fuentes@hospital.com',
    especialidad: 'Pediatría', subespecialidad: 'Neonatología',
    numero_colegiado: 'PD-15672', dpi: '1720345678901',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1979-11-05'),
    telefono: '5534-4403', consultorio: 'C-108',
    tarifa_consulta: 350.00,
    biografia: 'Pediatra con subespecialidad en neonatología. Amplia experiencia en el manejo de recién nacidos prematuros y de alto riesgo en unidades de cuidados intensivos neonatales.',
    fecha_ingreso: new Date('2017-08-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '07:00', hora_fin: '12:00' },
      { dia_semana: 2, hora_inicio: '07:00', hora_fin: '12:00' },
      { dia_semana: 4, hora_inicio: '07:00', hora_fin: '12:00' },
      { dia_semana: 5, hora_inicio: '07:00', hora_fin: '11:00' },
    ],
  },
  {
    nombre: 'María Elena', apellido: 'Castillo Velásquez',
    email: 'm.castillo@hospital.com',
    especialidad: 'Ginecología y Obstetricia', subespecialidad: 'Oncología ginecológica',
    numero_colegiado: 'GO-22891', dpi: '2080567890123',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1978-04-30'),
    telefono: '5545-5504', consultorio: 'D-302',
    tarifa_consulta: 480.00,
    biografia: 'Ginecóloga oncóloga con formación en diagnóstico temprano y tratamiento quirúrgico de cánceres ginecológicos. Certificada por el Consejo Nacional de Ginecología.',
    fecha_ingreso: new Date('2016-03-01'),
    horarios: [
      { dia_semana: 2, hora_inicio: '10:00', hora_fin: '15:00' },
      { dia_semana: 3, hora_inicio: '10:00', hora_fin: '15:00' },
      { dia_semana: 4, hora_inicio: '10:00', hora_fin: '15:00' },
      { dia_semana: 6, hora_inicio: '09:00', hora_fin: '12:00' },
    ],
  },
  {
    nombre: 'Jorge Antonio', apellido: 'Pérez Ochoa',
    email: 'j.perez@hospital.com',
    especialidad: 'Ortopedia y Traumatología', subespecialidad: 'Cirugía de columna vertebral',
    numero_colegiado: 'OT-44123', dpi: '1930678901234',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1973-09-18'),
    telefono: '5556-6605', consultorio: 'E-115',
    tarifa_consulta: 500.00,
    biografia: 'Ortopedista con más de 25 años de trayectoria en cirugía correctiva de columna, incluyendo procedimientos mínimamente invasivos y cirugía de escoliosis.',
    fecha_ingreso: new Date('2015-01-10'),
    horarios: [
      { dia_semana: 1, hora_inicio: '13:00', hora_fin: '18:00' },
      { dia_semana: 2, hora_inicio: '13:00', hora_fin: '18:00' },
      { dia_semana: 3, hora_inicio: '13:00', hora_fin: '18:00' },
      { dia_semana: 5, hora_inicio: '13:00', hora_fin: '17:00' },
    ],
  },
  {
    nombre: 'Lucía', apellido: 'Hernández Solís',
    email: 'l.hernandez@hospital.com',
    especialidad: 'Dermatología', subespecialidad: 'Dermatología cosmética y láser',
    numero_colegiado: 'DM-67834', dpi: '2230789012345',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1985-01-25'),
    telefono: '5567-7706', consultorio: 'A-203',
    tarifa_consulta: 380.00,
    biografia: 'Dermatóloga con especialización en procedimientos estéticos avanzados, tratamiento de acné severo, vitíligo y dermatitis atópica. Certificada en técnicas de rejuvenecimiento con láser.',
    fecha_ingreso: new Date('2020-09-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '08:00', hora_fin: '14:00' },
      { dia_semana: 3, hora_inicio: '08:00', hora_fin: '14:00' },
      { dia_semana: 5, hora_inicio: '08:00', hora_fin: '14:00' },
      { dia_semana: 6, hora_inicio: '09:00', hora_fin: '13:00' },
    ],
  },
  {
    nombre: 'Alejandro', apellido: 'Morales Cifuentes',
    email: 'a.morales@hospital.com',
    especialidad: 'Oftalmología', subespecialidad: 'Retina y vítreo',
    numero_colegiado: 'OF-55290', dpi: '1870890123456',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1977-06-12'),
    telefono: '5578-8807', consultorio: 'B-110',
    tarifa_consulta: 430.00,
    biografia: 'Oftalmólogo con subespecialidad en enfermedades de retina y vítreo. Experto en cirugía de cataratas y tratamiento de degeneración macular con inyecciones intravítreas.',
    fecha_ingreso: new Date('2018-11-01'),
    horarios: [
      { dia_semana: 2, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 4, hora_inicio: '08:00', hora_fin: '13:00' },
      { dia_semana: 6, hora_inicio: '08:00', hora_fin: '12:00' },
    ],
  },
  {
    nombre: 'Patricia', apellido: 'Gómez Barrera',
    email: 'p.gomez@hospital.com',
    especialidad: 'Gastroenterología', subespecialidad: 'Hepatología',
    numero_colegiado: 'GE-78456', dpi: '2150901234567',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1981-12-03'),
    telefono: '5589-9908', consultorio: 'C-220',
    tarifa_consulta: 420.00,
    biografia: 'Gastroenteróloga con enfoque en enfermedades hepáticas, incluyendo cirrosis, hepatitis virales y enfermedad del hígado graso no alcohólico. Experiencia en endoscopia diagnóstica y terapéutica.',
    fecha_ingreso: new Date('2019-02-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '10:00', hora_fin: '15:00' },
      { dia_semana: 2, hora_inicio: '10:00', hora_fin: '15:00' },
      { dia_semana: 4, hora_inicio: '10:00', hora_fin: '15:00' },
    ],
  },
  {
    nombre: 'Eduardo', apellido: 'Ramírez Soto',
    email: 'e.ramirez@hospital.com',
    especialidad: 'Endocrinología', subespecialidad: 'Diabetes y metabolismo',
    numero_colegiado: 'EN-33671', dpi: '1990012345678',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1980-08-07'),
    telefono: '5590-0109', consultorio: 'D-115',
    tarifa_consulta: 390.00,
    biografia: 'Endocrinólogo especializado en el manejo integral de diabetes mellitus tipos 1 y 2, hipotiroidismo, obesidad y síndrome metabólico. Promotor de programas de educación diabetológica.',
    fecha_ingreso: new Date('2021-01-15'),
    horarios: [
      { dia_semana: 1, hora_inicio: '14:00', hora_fin: '19:00' },
      { dia_semana: 3, hora_inicio: '14:00', hora_fin: '19:00' },
      { dia_semana: 5, hora_inicio: '14:00', hora_fin: '18:00' },
    ],
  },
  {
    nombre: 'Carmen', apellido: 'Villanueva Paz',
    email: 'c.villanueva@hospital.com',
    especialidad: 'Psiquiatría', subespecialidad: 'Trastornos del estado de ánimo',
    numero_colegiado: 'PS-91245', dpi: '2390123456789',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1983-05-19'),
    telefono: '5501-1210', consultorio: 'E-230',
    tarifa_consulta: 410.00,
    biografia: 'Psiquiatra con amplia experiencia en el diagnóstico y tratamiento de trastornos depresivos, trastorno bipolar y ansiedad. Formación complementaria en terapia cognitivo-conductual.',
    fecha_ingreso: new Date('2020-03-01'),
    horarios: [
      { dia_semana: 2, hora_inicio: '09:00', hora_fin: '14:00' },
      { dia_semana: 3, hora_inicio: '09:00', hora_fin: '14:00' },
      { dia_semana: 4, hora_inicio: '09:00', hora_fin: '14:00' },
      { dia_semana: 6, hora_inicio: '10:00', hora_fin: '13:00' },
    ],
  },
  {
    nombre: 'Miguel Ángel', apellido: 'Torres Fuentes',
    email: 'm.torres@hospital.com',
    especialidad: 'Oncología', subespecialidad: 'Oncología médica y quimioterapia',
    numero_colegiado: 'ON-48903', dpi: '1750234567891',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1976-02-28'),
    telefono: '5512-2311', consultorio: 'F-101',
    tarifa_consulta: 550.00,
    biografia: 'Oncólogo médico con especialización en tratamientos sistémicos para cáncer de mama, pulmón y colon. Participante activo en ensayos clínicos internacionales y protocolos de inmunoterapia.',
    fecha_ingreso: new Date('2016-07-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '07:00', hora_fin: '13:00' },
      { dia_semana: 2, hora_inicio: '07:00', hora_fin: '13:00' },
      { dia_semana: 3, hora_inicio: '07:00', hora_fin: '13:00' },
      { dia_semana: 4, hora_inicio: '07:00', hora_fin: '13:00' },
    ],
  },
  {
    nombre: 'Francisco', apellido: 'Jiménez Contreras',
    email: 'f.jimenez@hospital.com',
    especialidad: 'Urología', subespecialidad: 'Urología laparoscópica y robótica',
    numero_colegiado: 'UR-62387', dpi: '1640345678902',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1974-10-15'),
    telefono: '5523-3412', consultorio: 'A-305',
    tarifa_consulta: 470.00,
    biografia: 'Urólogo con subespecialidad en cirugía mínimamente invasiva, incluyendo laparoscopia y asistencia robótica para prostatectomía, nefrectomía y cistectomía.',
    fecha_ingreso: new Date('2017-04-01'),
    horarios: [
      { dia_semana: 2, hora_inicio: '13:00', hora_fin: '18:00' },
      { dia_semana: 4, hora_inicio: '13:00', hora_fin: '18:00' },
      { dia_semana: 6, hora_inicio: '09:00', hora_fin: '13:00' },
    ],
  },
  {
    nombre: 'Isabel', apellido: 'Aguilar Montenegro',
    email: 'i.aguilar@hospital.com',
    especialidad: 'Reumatología', subespecialidad: 'Enfermedades autoinmunes sistémicas',
    numero_colegiado: 'RM-29014', dpi: '2460456789013',
    genero: 'femenino' as const, fecha_nacimiento: new Date('1984-03-08'),
    telefono: '5534-4513', consultorio: 'B-315',
    tarifa_consulta: 400.00,
    biografia: 'Reumatóloga experta en lupus eritematoso sistémico, artritis reumatoide, esclerodermia y vasculitis. Manejo de terapias biológicas y de blanco molecular.',
    fecha_ingreso: new Date('2021-06-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '15:00', hora_fin: '19:00' },
      { dia_semana: 3, hora_inicio: '15:00', hora_fin: '19:00' },
      { dia_semana: 5, hora_inicio: '15:00', hora_fin: '19:00' },
    ],
  },
  {
    nombre: 'Gustavo', apellido: 'Sandoval Herrera',
    email: 'g.sandoval@hospital.com',
    especialidad: 'Medicina Interna', subespecialidad: 'Medicina de cuidados críticos',
    numero_colegiado: 'MI-71560', dpi: '1810567890124',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1972-07-30'),
    telefono: '5545-5614', consultorio: 'C-125',
    tarifa_consulta: 360.00,
    biografia: 'Internista con subespecialidad en cuidados intensivos. Vasta experiencia en el manejo de pacientes complejos con falla multiorgánica, sepsis y enfermedades crónicas descompensadas.',
    fecha_ingreso: new Date('2015-09-01'),
    horarios: [
      { dia_semana: 1, hora_inicio: '08:00', hora_fin: '12:00' },
      { dia_semana: 2, hora_inicio: '08:00', hora_fin: '12:00' },
      { dia_semana: 3, hora_inicio: '08:00', hora_fin: '12:00' },
      { dia_semana: 4, hora_inicio: '08:00', hora_fin: '12:00' },
      { dia_semana: 5, hora_inicio: '08:00', hora_fin: '12:00' },
    ],
  },
  {
    nombre: 'Raúl', apellido: 'Barrios Méndez',
    email: 'r.barrios@hospital.com',
    especialidad: 'Cirugía General', subespecialidad: 'Cirugía laparoscópica avanzada',
    numero_colegiado: 'CG-85729', dpi: '2010678901235',
    genero: 'masculino' as const, fecha_nacimiento: new Date('1971-12-22'),
    telefono: '5556-6715', consultorio: 'D-210',
    tarifa_consulta: 520.00,
    biografia: 'Cirujano general con más de 28 años de experiencia. Pionero en Guatemala en técnicas de cirugía laparoscópica avanzada para colecistectomía, apendicectomía, hernioplastia y cirugía bariátrica.',
    fecha_ingreso: new Date('2014-06-01'),
    horarios: [
      { dia_semana: 2, hora_inicio: '07:00', hora_fin: '11:00' },
      { dia_semana: 3, hora_inicio: '07:00', hora_fin: '11:00' },
      { dia_semana: 4, hora_inicio: '07:00', hora_fin: '11:00' },
      { dia_semana: 5, hora_inicio: '07:00', hora_fin: '11:00' },
    ],
  },
];

async function main() {
  const hash = await bcrypt.hash('doc', 12);
  let creados = 0;

  for (const m of medicos) {
    const { horarios, nombre, apellido, email, especialidad, subespecialidad,
      numero_colegiado, dpi, genero, fecha_nacimiento, telefono, consultorio,
      tarifa_consulta, biografia, fecha_ingreso } = m;

    const existing = await prisma.usuarios.findUnique({ where: { email } });
    if (existing) {
      console.log(`Ya existe: ${email} — omitido`);
      continue;
    }

    const usuario = await prisma.usuarios.create({
      data: { nombre, apellido, email, password_hash: hash, rol: 'medico' },
    });

    const medico = await prisma.medicos.create({
      data: {
        usuario_id: usuario.id,
        especialidad,
        subespecialidad,
        numero_colegiado,
        dpi,
        genero,
        fecha_nacimiento,
        telefono,
        consultorio,
        tarifa_consulta,
        biografia,
        fecha_ingreso,
      },
    });

    await prisma.horarios_medico.createMany({
      data: horarios.map(h => ({ medico_id: medico.id, ...h })),
    });

    console.log(`Creado: Dr/a. ${nombre} ${apellido} (${especialidad})`);
    creados++;
  }

  console.log(`\nListo: ${creados} médicos registrados. Contraseña de todos: doc`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
