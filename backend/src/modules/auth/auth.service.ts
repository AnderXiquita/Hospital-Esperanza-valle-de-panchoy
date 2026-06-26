import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { LoginInput, ChangePasswordInput, UpdateProfileInput } from './auth.schema';
import { LoginResponse } from './auth.types';

const REFRESH_EXPIRY_DAYS = 7;

function generateAccessToken(userId: number, rol: string): string {
  const expiry = process.env['JWT_ACCESS_EXPIRY'] ?? '15m';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId, rol }, process.env['JWT_SECRET']!, { expiresIn: expiry } as any);
}

async function saveRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  await prisma.refresh_tokens.create({
    data: { usuario_id: userId, token_hash: hash, expires_at: expiresAt },
  });

  return raw;
}

export async function login(
  input: LoginInput,
  ip: string
): Promise<{ response: LoginResponse; refreshToken: string }> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.usuarios.findUnique({ where: { email } });

  if (!user || !user.activo) {
    logger.info({ event: 'LOGIN_FAILED', email, ip });
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    logger.info({ event: 'LOGIN_FAILED', email, ip });
    throw new Error('INVALID_CREDENTIALS');
  }

  await prisma.usuarios.update({
    where: { id: user.id },
    data: { ultimo_login: new Date() },
  });

  const accessToken = generateAccessToken(user.id, user.rol);
  const refreshToken = await saveRefreshToken(user.id);

  logger.info({ event: 'LOGIN_SUCCESS', userId: user.id, rol: user.rol, ip });

  return {
    response: {
      accessToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
      },
    },
    refreshToken,
  };
}

export async function refresh(
  rawToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = await prisma.refresh_tokens.findUnique({ where: { token_hash: hash } });

  if (!record || record.usado || record.expires_at < new Date()) {
    // Posible reutilización de token robado — invalidar todos los del usuario
    if (record?.usado) {
      await prisma.refresh_tokens.deleteMany({ where: { usuario_id: record.usuario_id } });
      logger.warn({ event: 'REFRESH_TOKEN_REUSE', userId: record.usuario_id });
    }
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  await prisma.refresh_tokens.update({ where: { id: record.id }, data: { usado: true } });

  const user = await prisma.usuarios.findUnique({ where: { id: record.usuario_id } });
  if (!user || !user.activo) throw new Error('INVALID_REFRESH_TOKEN');

  const accessToken = generateAccessToken(user.id, user.rol);
  const newRefreshToken = await saveRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function updateProfile(
  userId: number,
  input: UpdateProfileInput
): Promise<{ nombre: string; apellido: string; email: string }> {
  const existing = await prisma.usuarios.findFirst({
    where: { email: input.email, NOT: { id: userId } },
  });
  if (existing) throw new Error('EMAIL_TAKEN');

  const updated = await prisma.usuarios.update({
    where: { id: userId },
    data: { nombre: input.nombre, apellido: input.apellido, email: input.email },
    select: { nombre: true, apellido: true, email: true },
  });

  logger.info({ event: 'PROFILE_UPDATED', userId });
  return updated;
}

export async function changePassword(
  userId: number,
  input: ChangePasswordInput
): Promise<void> {
  const user = await prisma.usuarios.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const valid = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!valid) throw new Error('WRONG_PASSWORD');

  if (input.currentPassword === input.newPassword) throw new Error('SAME_PASSWORD');

  const hash = await bcrypt.hash(input.newPassword, 12);
  await prisma.usuarios.update({ where: { id: userId }, data: { password_hash: hash } });

  // Invalidar todos los refresh tokens del usuario para forzar nuevo login
  await prisma.refresh_tokens.deleteMany({ where: { usuario_id: userId } });

  logger.info({ event: 'PASSWORD_CHANGED', userId });
}

export async function logout(rawToken: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await prisma.refresh_tokens.updateMany({
    where: { token_hash: hash },
    data: { usado: true },
  });
}
