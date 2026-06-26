import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const admins = [
  { nombre: 'Roberto', apellido: 'Salguero Paz',    email: 'r.salguero@hospital.com' },
  { nombre: 'Claudia', apellido: 'Moreno Vásquez',  email: 'c.moreno@hospital.com'  },
  { nombre: 'Ernesto', apellido: 'Fuentes Barillas', email: 'e.fuentes@hospital.com' },
];

const recepcionistas = [
  { nombre: 'Daniela',  apellido: 'Ramos Ortiz',      email: 'd.ramos@hospital.com'    },
  { nombre: 'Alejandra',apellido: 'Pineda Solís',     email: 'a.pineda@hospital.com'   },
  { nombre: 'Karen',    apellido: 'Leiva Monterroso',  email: 'k.leiva@hospital.com'    },
  { nombre: 'Paola',    apellido: 'Cifuentes Sazo',   email: 'p.cifuentes@hospital.com'},
  { nombre: 'Wendy',    apellido: 'Mazariegos López',  email: 'w.mazariegos@hospital.com'},
  { nombre: 'Bryam',    apellido: 'Castañeda Ruiz',   email: 'b.castaneda@hospital.com'},
  { nombre: 'Héctor',   apellido: 'Alarcón Medina',   email: 'h.alarcon@hospital.com'  },
  { nombre: 'Luisa',    apellido: 'Tello Aguilar',    email: 'l.tello@hospital.com'    },
  { nombre: 'Sofía',    apellido: 'Girón Escobar',    email: 's.giron@hospital.com'    },
  { nombre: 'Marcos',   apellido: 'Velázquez Díaz',   email: 'm.velazquez@hospital.com'},
];

async function main() {
  const hashAdmin = await bcrypt.hash('admin', 12);
  const hashRecep = await bcrypt.hash('recep', 12);
  let creados = 0;

  for (const u of admins) {
    const existing = await prisma.usuarios.findUnique({ where: { email: u.email } });
    if (existing) { console.log(`Ya existe: ${u.email} — omitido`); continue; }
    await prisma.usuarios.create({ data: { ...u, password_hash: hashAdmin, rol: 'admin' } });
    console.log(`Admin creado: ${u.nombre} ${u.apellido}`);
    creados++;
  }

  for (const u of recepcionistas) {
    const existing = await prisma.usuarios.findUnique({ where: { email: u.email } });
    if (existing) { console.log(`Ya existe: ${u.email} — omitido`); continue; }
    await prisma.usuarios.create({ data: { ...u, password_hash: hashRecep, rol: 'recepcionista' } });
    console.log(`Recepcionista creada: ${u.nombre} ${u.apellido}`);
    creados++;
  }

  console.log(`\nListo: ${creados} usuarios registrados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
