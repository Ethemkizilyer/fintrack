import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { createAccount, createCustomer, loginUser } from '../../../tests/helpers';

type DepositResponse = {
  data: { id: string };
};

type InsufficientFundsResponse = {
  error: {
    code: string;
    details: { referenceNo: string };
  };
};

describe('POST /api/v1/transactions/deposits', () => {
  it('deposits money once and replays the same idempotency key', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);
    const idempotencyKey = randomUUID();

    const sendDeposit = () =>
      request(app)
        .post('/api/v1/transactions/deposits')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ accountId: account.id, amount: '25.00' });

    const first = await sendDeposit();
    const replay = await sendDeposit();

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    const firstBody = first.body as DepositResponse;
    const replayBody = replay.body as DepositResponse;

    expect(replayBody.data.id).toBe(firstBody.data.id);

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    const transactionCount = await prisma.transaction.count({
      where: { initiatedById: user.id, idempotencyKey },
    });

    expect(updatedAccount.balance.toFixed(2)).toBe('25.00');
    expect(transactionCount).toBe(1);
  });

  it('returns 400 when Idempotency-Key is missing', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);

    const response = await request(app)
      .post('/api/v1/transactions/deposits')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account.id, amount: '25.00' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/v1/transactions/withdrawals', () => {
  it('records insufficient funds as FAILED without changing balance', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);

    const response = await request(app)
      .post('/api/v1/transactions/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ accountId: account.id, amount: '10.00' });

    expect(response.status).toBe(422);
    const errorBody = response.body as InsufficientFundsResponse;

    expect(errorBody.error.code).toBe('INSUFFICIENT_FUNDS');

    const referenceNo = errorBody.error.details.referenceNo;
    const failed = await prisma.transaction.findUniqueOrThrow({
      where: { referenceNo },
    });
    const unchangedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    const ledgerCount = await prisma.ledgerEntry.count({
      where: { transactionId: failed.id },
    });

    expect(failed.status).toBe('FAILED');
    expect(failed.failureReason).toBe('INSUFFICIENT_FUNDS');
    expect(unchangedAccount.balance.toFixed(2)).toBe('0.00');
    expect(ledgerCount).toBe(0);
  });

  it('returns 404 when a customer uses another customer account', async () => {
    const { user } = await createCustomer();
    const { customer: anotherCustomer } = await createCustomer();
    const anotherAccount = await createAccount(anotherCustomer.id);
    const token = await loginUser(user.email);

    const response = await request(app)
      .post('/api/v1/transactions/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ accountId: anotherAccount.id, amount: '1.00' });

    expect(response.status).toBe(404);
    expect(await prisma.transaction.count()).toBe(0);
  });
});
