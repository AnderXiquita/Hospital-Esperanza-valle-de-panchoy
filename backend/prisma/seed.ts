import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const hash = await bcrypt.hash('Admin@1234', 12);

  await prisma.usuarios.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@hospital.com',
      password_hash: hash,
      rol: 'admin',
    },
  });

  console.log('Seed completado: admin@hospital.com / Admin@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
