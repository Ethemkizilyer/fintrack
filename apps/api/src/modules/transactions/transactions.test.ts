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
async function postDeposit(token: string, accountId: string, amount: string) {
  return request(app)
    .post('/api/v1/transactions/deposits')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send({ accountId, amount });
}
async function fundAccount(token: string, accountId: string): Promise<void> {
  const response = await request(app)
    .post('/api/v1/transactions/deposits')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send({ accountId, amount: '100.00' });

  expect(response.status).toBe(201);
}

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

  it('returns 409 when an idempotency key is reused with different content', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);
    const idempotencyKey = randomUUID();

    const first = await request(app)
      .post('/api/v1/transactions/deposits')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ accountId: account.id, amount: '25.00' });

    const second = await request(app)
      .post('/api/v1/transactions/deposits')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ accountId: account.id, amount: '50.00' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);

    const errorBody = second.body as { error: { code: string } };
    expect(errorBody.error.code).toBe('IDEMPOTENCY_KEY_REUSED');

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });

    expect(updatedAccount.balance.toFixed(2)).toBe('25.00');
  });

  it('processes concurrent requests with the same key only once', async () => {
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

    const responses = await Promise.all([sendDeposit(), sendDeposit()]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);

    const firstBody = responses[0]?.body as DepositResponse;
    const secondBody = responses[1]?.body as DepositResponse;
    expect(firstBody.data.id).toBe(secondBody.data.id);

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    const transactionCount = await prisma.transaction.count({
      where: { initiatedById: user.id, idempotencyKey },
    });

    expect(updatedAccount.balance.toFixed(2)).toBe('25.00');
    expect(transactionCount).toBe(1);
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

describe('POST /api/v1/transactions/transfers', () => {
  it('moves money between same-currency accounts and writes two ledger entries', async () => {
    const { user, customer } = await createCustomer();
    const source = await createAccount(customer.id, 'TRY');
    const target = await createAccount(customer.id, 'TRY');
    const token = await loginUser(user.email);

    await fundAccount(token, source.id);

    const response = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: source.id,
        targetAccountNumber: target.accountNumber,
        amount: '25.00',
      });

    expect(response.status).toBe(201);
    const body = response.body as { data: { id: string; status: string } };
    expect(body.data.status).toBe('COMPLETED');

    const updatedSource = await prisma.account.findUniqueOrThrow({
      where: { id: source.id },
    });
    const updatedTarget = await prisma.account.findUniqueOrThrow({
      where: { id: target.id },
    });
    const entries = await prisma.ledgerEntry.findMany({
      where: { transactionId: body.data.id },
    });

    expect(updatedSource.balance.toFixed(2)).toBe('75.00');
    expect(updatedTarget.balance.toFixed(2)).toBe('25.00');
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.accountId === source.id)?.direction).toBe('DEBIT');
    expect(entries.find((entry) => entry.accountId === source.id)?.balanceAfter.toFixed(2)).toBe(
      '75.00',
    );
    expect(entries.find((entry) => entry.accountId === target.id)?.direction).toBe('CREDIT');
    expect(entries.find((entry) => entry.accountId === target.id)?.balanceAfter.toFixed(2)).toBe(
      '25.00',
    );
  });

  it('records a currency mismatch as FAILED and changes neither balance', async () => {
    const { user, customer } = await createCustomer();
    const source = await createAccount(customer.id, 'TRY');
    const target = await createAccount(customer.id, 'USD');
    const token = await loginUser(user.email);

    await fundAccount(token, source.id);

    const response = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: source.id,
        targetAccountNumber: target.accountNumber,
        amount: '10.00',
      });

    expect(response.status).toBe(422);
    const body = response.body as {
      error: { code: string; details: { referenceNo: string } };
    };
    expect(body.error.code).toBe('CURRENCY_MISMATCH');

    const failed = await prisma.transaction.findUniqueOrThrow({
      where: { referenceNo: body.error.details.referenceNo },
    });
    const updatedSource = await prisma.account.findUniqueOrThrow({
      where: { id: source.id },
    });
    const updatedTarget = await prisma.account.findUniqueOrThrow({
      where: { id: target.id },
    });
    const ledgerCount = await prisma.ledgerEntry.count({
      where: { transactionId: failed.id },
    });

    expect(failed.status).toBe('FAILED');
    expect(updatedSource.balance.toFixed(2)).toBe('100.00');
    expect(updatedTarget.balance.toFixed(2)).toBe('0.00');
    expect(ledgerCount).toBe(0);
  });

  it('rejects a transfer to the same account before creating a transaction', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);

    const response = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: account.id,
        targetAccountNumber: account.accountNumber,
        amount: '1.00',
      });

    expect(response.status).toBe(400);
    expect(await prisma.transaction.count()).toBe(0);
  });
});

describe('GET /api/v1/transactions/:id', () => {
  it('shows the owner their account number and masks the counterparty', async () => {
    const sourceOwner = await createCustomer();
    const targetOwner = await createCustomer();
    const source = await createAccount(sourceOwner.customer.id, 'TRY');
    const target = await createAccount(targetOwner.customer.id, 'TRY');
    const sourceToken = await loginUser(sourceOwner.user.email);
    const targetToken = await loginUser(targetOwner.user.email);

    expect((await postDeposit(sourceToken, source.id, '100.00')).status).toBe(201);

    const transfer = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${sourceToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: source.id,
        targetAccountNumber: target.accountNumber,
        amount: '25.00',
      });

    expect(transfer.status).toBe(201);
    const transferBody = transfer.body as { data: { id: string } };

    const sourceView = await request(app)
      .get(`/api/v1/transactions/${transferBody.data.id}`)
      .set('Authorization', `Bearer ${sourceToken}`);

    expect(sourceView.status).toBe(200);
    const sourceBody = sourceView.body as {
      data: {
        sourceAccount: { accountNumber: string };
        targetAccount: { accountNumber: string };
        ledgerEntries: {
          accountNumber: string;
          balanceAfter: string | null;
        }[];
      };
    };

    expect(sourceBody.data.sourceAccount.accountNumber).toBe(source.accountNumber);
    expect(sourceBody.data.targetAccount.accountNumber).toBe(
      `**** **** **** ${target.accountNumber.slice(-4)}`,
    );
    expect(
      sourceBody.data.ledgerEntries.find((entry) => entry.accountNumber === source.accountNumber)
        ?.balanceAfter,
    ).toBe('75.00');
    expect(
      sourceBody.data.ledgerEntries.find((entry) => entry.accountNumber.startsWith('****'))
        ?.balanceAfter,
    ).toBeNull();

    const targetView = await request(app)
      .get(`/api/v1/transactions/${transferBody.data.id}`)
      .set('Authorization', `Bearer ${targetToken}`);

    const targetBody = targetView.body as {
      data: {
        sourceAccount: { accountNumber: string };
        targetAccount: { accountNumber: string };
      };
    };

    expect(targetView.status).toBe(200);
    expect(targetBody.data.sourceAccount.accountNumber).toBe(
      `**** **** **** ${source.accountNumber.slice(-4)}`,
    );
    expect(targetBody.data.targetAccount.accountNumber).toBe(target.accountNumber);
  });

  it('returns 404 for a customer who owns neither related account', async () => {
    const sourceOwner = await createCustomer();
    const targetOwner = await createCustomer();
    const unrelatedCustomer = await createCustomer();

    const source = await createAccount(sourceOwner.customer.id, 'TRY');
    const target = await createAccount(targetOwner.customer.id, 'TRY');
    const unrelatedToken = await loginUser(unrelatedCustomer.user.email);
    const sourceToken = await loginUser(sourceOwner.user.email);

    await postDeposit(sourceToken, source.id, '100.00');

    const transfer = await request(app)
      .post('/api/v1/transactions/transfers')
      .set('Authorization', `Bearer ${sourceToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        sourceAccountId: source.id,
        targetAccountNumber: target.accountNumber,
        amount: '10.00',
      });

    const transferBody = transfer.body as { data: { id: string } };

    const response = await request(app)
      .get(`/api/v1/transactions/${transferBody.data.id}`)
      .set('Authorization', `Bearer ${unrelatedToken}`);

    expect(response.status).toBe(404);
  });

  it('returns 404 for an unknown transaction id', async () => {
    const customer = await createCustomer();
    const token = await loginUser(customer.user.email);

    const response = await request(app)
      .get(`/api/v1/transactions/${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
