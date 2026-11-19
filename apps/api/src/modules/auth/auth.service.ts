import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { Prisma } from '@/generated/prisma/client';
import type { Role } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import type { LoginInput } from './auth.schema';

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DUMMY_PASSWORD_HASH = '$2b$10$JBINOF2qRVBctvT/97JZneH3gfhejf/cmBcv8qED8SWZTZAERDHxi';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

type UserWithCustomer = Prisma.UserGetPayload<{ include: { customer: true } }>;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(user: UserWithCustomer) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    customer: user.customer
      ? {
          id: user.customer.id,
          firstName: user.customer.firstName,
          lastName: user.customer.lastName,
          phone: user.customer.phone,
          status: user.customer.status,
        }
      : null,
    createdAt: user.createdAt,
  };
}

function signAccessToken(user: { id: string; role: Role }): string {
  const payload: AccessTokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return token;
}

function assertLoginable(
  user: UserWithCustomer | null,
  isValidPassword: boolean,
): UserWithCustomer {
  if (!user || !isValidPassword) {
    throw AppError.unauthorized('Invalid email or password');
  }
  if (user.customer && user.customer.status !== 'ACTIVE') {
    throw AppError.forbidden('Account is inactive');
  }
  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { customer: true },
  });

  const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const isValidPassword = await bcrypt.compare(input.password, hashToCompare);
  const validUser = assertLoginable(user, isValidPassword);

  const accessToken = signAccessToken(validUser);
  const refreshToken = await createRefreshToken(validUser.id);

  return { accessToken, refreshToken, user: toPublicUser(validUser) };
}

export async function refresh(rawToken: string | undefined) {
  if (!rawToken) {
    throw AppError.unauthorized('Missing refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { include: { customer: true } } },
  });

  if (!storedToken || storedToken.revokedAt !== null || storedToken.expiresAt <= new Date()) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
  if (storedToken.user.customer && storedToken.user.customer.status !== 'ACTIVE') {
    throw AppError.forbidden('Account is inactive');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = signAccessToken(storedToken.user);
  const refreshToken = await createRefreshToken(storedToken.userId);

  return { accessToken, refreshToken, user: toPublicUser(storedToken.user) };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true },
  });
  if (!user) throw AppError.notFound('User not found');
  return toPublicUser(user);
}
