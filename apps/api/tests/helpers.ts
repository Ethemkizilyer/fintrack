import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '@/app';
import type { Currency, CustomerStatus, Role } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { isValidNationalId } from '@/utils/national-id';

export const TEST_PASSWORD = 'test-password-123';

function nextNationalId(): string {
  nationalIdSeq += 1;
  while (!isValidNationalId(String(10_000_000_000 + nationalIdSeq))) {
    nationalIdSeq += 1;
  }
  return String(10_000_000_000 + nationalIdSeq);
}

let nationalIdSeq = 0;
let accountSeq = 0;

export async function createUser(data: { email?: string; password?: string; role?: Role } = {}) {
  const passwordHash = await bcrypt.hash(data.password ?? TEST_PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: data.email ?? `user-${randomUUID()}@test.dev`,
      passwordHash,
      role: data.role ?? 'CUSTOMER',
    },
  });
}

export async function createCustomer(
  data: { email?: string; password?: string; status?: CustomerStatus } = {},
) {
  const user = await createUser({ email: data.email, password: data.password });
  const customer = await prisma.customer.create({
    data: {
      userId: user.id,
      firstName: 'Test',
      lastName: 'Customer',
      nationalId: nextNationalId(),
      phone: '+905000000000',
      status: data.status ?? 'ACTIVE',
    },
  });
  return { user, customer };
}

export async function createAccount(customerId: string, currency: Currency = 'TRY') {
  return prisma.account.create({
    data: {
      customerId,
      accountNumber: String(1_000_000_000_000_000 + ++accountSeq),
      currency,
    },
  });
}

export async function loginWithCookie(role: Role = 'CUSTOMER') {
  const created =
    role === 'ADMIN'
      ? { user: await createUser({ role: 'ADMIN' }), customer: null }
      : await createCustomer();

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: created.user.email, password: TEST_PASSWORD });

  const body = res.body as { data: { accessToken: string } };
  const headers = res.headers as Record<string, string | string[] | undefined>;
  const setCookie = headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const refreshToken =
    typeof cookieHeader === 'string' ? /refreshToken=([^;]+)/.exec(cookieHeader)?.[1] : undefined;

  if (!refreshToken) {
    throw new Error('refreshToken cookie missing in login response');
  }

  return { accessToken: body.data.accessToken, refreshToken, ...created };
}

export async function loginAs(role: Role = 'CUSTOMER'): Promise<string> {
  const { accessToken } = await loginWithCookie(role);
  return accessToken;
}

export async function loginUser(email: string, password: string = TEST_PASSWORD): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  const body = res.body as { data: { accessToken: string } };
  return body.data.accessToken;
}
