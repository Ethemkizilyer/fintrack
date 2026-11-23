import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { createAccount, createCustomer, loginUser } from './helpers';

async function fundAccount(token: string, accountId: string, amount: string): Promise<void> {
  const response = await request(app)
    .post('/api/v1/transactions/deposits')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send({ accountId, amount });

  expect(response.status).toBe(201);
}

describe('money operation concurrency', () => {
  it('allows exactly 10 of 50 concurrent 10.00 withdrawals from a 100.00 balance', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);

    await fundAccount(token, account.id, '100.00');

    const responses = await Promise.all(
      Array.from({ length: 50 }, () =>
        request(app)
          .post('/api/v1/transactions/withdrawals')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .send({ accountId: account.id, amount: '10.00' }),
      ),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(10);
    expect(responses.filter((response) => response.status === 422)).toHaveLength(40);
    expect(responses.every((response) => response.status === 201 || response.status === 422)).toBe(
      true,
    );

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });

    expect(updatedAccount.balance.toFixed(2)).toBe('0.00');
  });

  it('completes opposite transfers without changing the total balance', async () => {
    const { user, customer } = await createCustomer();
    const accountA = await createAccount(customer.id, 'TRY');
    const accountB = await createAccount(customer.id, 'TRY');
    const token = await loginUser(user.email);

    await fundAccount(token, accountA.id, '100.00');
    await fundAccount(token, accountB.id, '100.00');

    const transfer = (sourceAccountId: string, targetAccountNumber: string) =>
      request(app)
        .post('/api/v1/transactions/transfers')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({
          sourceAccountId,
          targetAccountNumber,
          amount: '1.00',
        });

    const requests = [
      ...Array.from({ length: 10 }, () => transfer(accountA.id, accountB.accountNumber)),
      ...Array.from({ length: 10 }, () => transfer(accountB.id, accountA.accountNumber)),
    ];

    const responses = await Promise.all(requests);

    expect(responses.filter((response) => response.status === 201)).toHaveLength(20);

    const updatedA = await prisma.account.findUniqueOrThrow({
      where: { id: accountA.id },
    });
    const updatedB = await prisma.account.findUniqueOrThrow({
      where: { id: accountB.id },
    });

    expect(updatedA.balance.plus(updatedB.balance).toFixed(2)).toBe('200.00');
  }, 15_000);

  it('keeps account balances equal to their ledger totals', async () => {
    const { user, customer } = await createCustomer();
    const source = await createAccount(customer.id, 'TRY');
    const target = await createAccount(customer.id, 'TRY');
    const token = await loginUser(user.email);

    await fundAccount(token, source.id, '100.00');

    const transfer = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: source.id,
        targetAccountNumber: target.accountNumber,
        amount: '25.00',
      });

    expect(transfer.status).toBe(201);

    const mismatches = await prisma.$queryRaw<{ accountId: string }[]>`
      SELECT a.id::text AS "accountId"
      FROM accounts AS a
      LEFT JOIN ledger_entries AS le ON le.account_id = a.id
      GROUP BY a.id, a.balance
      HAVING a.balance <> COALESCE(
        SUM(
          CASE
            WHEN le.direction = 'CREDIT' THEN le.amount
            WHEN le.direction = 'DEBIT' THEN -le.amount
          END
        ),
        0
      )
    `;

    expect(mismatches).toEqual([]);
  });
});
