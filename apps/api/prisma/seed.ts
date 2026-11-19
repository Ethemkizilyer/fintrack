import bcrypt from 'bcryptjs';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const SEED_CUSTOMERS = [
  {
    user: { email: 'ayse.yilmaz@example.com' },
    customer: {
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      nationalId: '12345678950',
      phone: '+905321112233',
    },
    accounts: [
      { accountNumber: '1000000000000001', currency: 'TRY' },
      { accountNumber: '1000000000000002', currency: 'USD' },
    ],
  },
  {
    user: { email: 'mehmet.demir@example.com' },
    customer: {
      firstName: 'Mehmet',
      lastName: 'Demir',
      nationalId: '98765432150',
      phone: '+905332223344',
    },
    accounts: [{ accountNumber: '1000000000000003', currency: 'TRY' }],
  },
  {
    user: { email: 'zeynep.kaya@example.com' },
    customer: {
      firstName: 'Zeynep',
      lastName: 'Kaya',
      nationalId: '11111111110',
      phone: '+905343334455',
    },
    accounts: [{ accountNumber: '1000000000000004', currency: 'TRY' }],
  },
] as const;

async function main() {
  if (!env.SEED_ADMIN_PASSWORD || !env.SEED_CUSTOMER_PASSWORD) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD must be set in apps/api/.env');
  }

  const [adminHash, customerHash] = await Promise.all([
    bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10),
    bcrypt.hash(env.SEED_CUSTOMER_PASSWORD, 10),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@fintrack.dev' },
    update: {},
    create: { email: 'admin@fintrack.dev', passwordHash: adminHash, role: 'ADMIN' },
  });

  for (const seed of SEED_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: seed.user.email },
      update: {},
      create: { ...seed.user, passwordHash: customerHash, role: 'CUSTOMER' },
    });

    const customer = await prisma.customer.upsert({
      where: { nationalId: seed.customer.nationalId },
      update: {},
      create: { ...seed.customer, userId: user.id },
    });

    for (const account of seed.accounts) {
      await prisma.account.upsert({
        where: { accountNumber: account.accountNumber },
        update: {},
        create: { ...account, customerId: customer.id },
      });
    }
  }

  logger.info('Seed completed');
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
