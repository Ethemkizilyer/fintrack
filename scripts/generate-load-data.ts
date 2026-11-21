import { createHash, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@/generated/prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const TOTAL_TRANSACTIONS = 100_000;
const BATCH_SIZE = 1_000;
const BENCHMARK_EMAIL = 'history-benchmark@fintrack.local';
const START_TIME = Date.UTC(2025, 0, 1);

function assertTestDatabase(): void {
  const databaseName = new URL(env.DATABASE_URL).pathname.slice(1);

  if (databaseName !== 'fintrack_test') {
    throw new Error('Load-data generation is allowed only for fintrack_test');
  }
}

function generateAccountNumber(): string {
  const part = () => String(randomInt(10_000_000, 100_000_000));
  return part() + part();
}

function generateNationalId(): string {
  const firstNine = String(randomInt(100_000_000, 1_000_000_000));
  const digits = Array.from(firstNine, Number);
  const oddSum = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const evenSum = digits[1]! + digits[3]! + digits[5]! + digits[7]!;

  const tenthDigit = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const firstTen = `${firstNine}${tenthDigit}`;
  const eleventhDigit = Array.from(firstTen, Number).reduce((sum, digit) => sum + digit, 0) % 10;

  return `${firstTen}${eleventhDigit}`;
}

async function createBenchmarkAccount(): Promise<{
  accountId: string;
  userId: string;
}> {
  const existing = await prisma.user.findUnique({
    where: { email: BENCHMARK_EMAIL },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      'Benchmark data already exists. Run the API tests to reset fintrack_test before retrying.',
    );
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: BENCHMARK_EMAIL,
        passwordHash,
        role: 'CUSTOMER',
      },
    });

    const customer = await tx.customer.create({
      data: {
        userId: user.id,
        firstName: 'History',
        lastName: 'Benchmark',
        nationalId: generateNationalId(),
        phone: '+905000000000',
      },
    });

    const account = await tx.account.create({
      data: {
        customerId: customer.id,
        accountNumber: generateAccountNumber(),
        currency: 'TRY',
      },
    });

    return { accountId: account.id, userId: user.id };
  });
}

async function generateBatch(
  accountId: string,
  userId: string,
  firstSequence: number,
): Promise<void> {
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const ledgerEntries: Prisma.LedgerEntryCreateManyInput[] = [];
  const oneLira = new Prisma.Decimal('1.00');
  const zero = new Prisma.Decimal('0.00');

  for (let offset = 0; offset < BATCH_SIZE; offset += 1) {
    const sequence = firstSequence + offset;
    const isCredit = sequence % 2 === 0;
    const transactionId = randomUUID();
    const createdAt = new Date(START_TIME + sequence * 1_000);

    transactions.push({
      id: transactionId,
      type: isCredit ? 'DEPOSIT' : 'WITHDRAWAL',
      status: 'COMPLETED',
      amount: oneLira,
      currency: 'TRY',
      sourceAccountId: isCredit ? null : accountId,
      targetAccountId: isCredit ? accountId : null,
      idempotencyKey: randomUUID(),
      requestHash: createHash('sha256').update(`benchmark:${sequence}`).digest('hex'),
      initiatedById: userId,
      createdAt,
      completedAt: createdAt,
    });

    ledgerEntries.push({
      id: randomUUID(),
      transactionId,
      accountId,
      direction: isCredit ? 'CREDIT' : 'DEBIT',
      amount: oneLira,
      balanceAfter: isCredit ? oneLira : zero,
      createdAt,
    });
  }

  await prisma.$transaction([
    prisma.transaction.createMany({ data: transactions }),
    prisma.ledgerEntry.createMany({ data: ledgerEntries }),
  ]);
}

async function main(): Promise<void> {
  assertTestDatabase();

  const { accountId, userId } = await createBenchmarkAccount();
  const totalBatches = TOTAL_TRANSACTIONS / BATCH_SIZE;

  logger.info(
    { accountId, totalTransactions: TOTAL_TRANSACTIONS, batchSize: BATCH_SIZE },
    'Generating benchmark data',
  );

  for (let batch = 0; batch < totalBatches; batch += 1) {
    await generateBatch(accountId, userId, batch * BATCH_SIZE);

    if ((batch + 1) % 10 === 0) {
      logger.info({ completedBatches: batch + 1, totalBatches }, 'Benchmark progress');
    }
  }

  logger.info(
    {
      accountId,
      transactions: TOTAL_TRANSACTIONS,
      ledgerEntries: TOTAL_TRANSACTIONS,
      finalAccountBalance: '0.00',
    },
    'Benchmark data generation completed',
  );
}

try {
  await main();
} catch (error: unknown) {
  logger.error({ err: error }, 'Benchmark data generation failed');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
