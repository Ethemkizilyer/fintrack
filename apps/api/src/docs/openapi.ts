import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z, type ZodType } from 'zod';
import { loginSchema } from '@/modules/auth/auth.schema';
import {
  createCustomerSchema,
  customerIdParamsSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from '@/modules/customers/customers.schema';
import {
  accountIdParamsSchema,
  accountTransactionsQuerySchema,
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountStatusSchema,
} from '@/modules/accounts/accounts.schema';
import {
  createDepositSchema,
  createTransferSchema,
  createWithdrawalSchema,
  transactionIdParamsSchema,
} from '@/modules/transactions/transactions.schema';
import { idempotencyKeySchema } from '@/modules/transactions/idempotency';
import {
  reportPeriodicQuerySchema,
  reportStatementParamsSchema,
  reportStatementQuerySchema,
  reportSummaryQuerySchema,
  reportTransactionStatsQuerySchema,
} from '@/modules/reports/reports.schema';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const refreshCookieAuth = registry.registerComponent('securitySchemes', 'RefreshTokenCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'refreshToken',
});

const bearerSecurity = [{ [bearerAuth.name]: [] }];
const cookieSecurity = [{ [refreshCookieAuth.name]: [] }];

const IdSchema = z.uuid();
const DateTimeSchema = z.iso.datetime();
const MoneySchema = z.string().regex(/^\d+\.\d{2}$/);
const CurrencySchema = z.enum(['TRY', 'USD', 'EUR']);
const RoleSchema = z.enum(['ADMIN', 'CUSTOMER']);
const CustomerStatusSchema = z.enum(['ACTIVE', 'PASSIVE']);
const AccountStatusSchema = z.enum(['ACTIVE', 'PASSIVE']);
const TransactionTypeSchema = z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']);
const TransactionStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED']);
const EntryDirectionSchema = z.enum(['DEBIT', 'CREDIT']);

const PublicUserSchema = z
  .object({
    id: IdSchema,
    email: z.email(),
    role: RoleSchema,
    customer: z
      .object({
        id: IdSchema,
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
        status: CustomerStatusSchema,
      })
      .nullable(),
    createdAt: DateTimeSchema,
  })
  .openapi('PublicUser');

const AuthDataSchema = z
  .object({
    accessToken: z.string(),
    user: PublicUserSchema,
  })
  .openapi('AuthData');

const CustomerSchema = z
  .object({
    id: IdSchema,
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    nationalId: z.string(),
    phone: z.string(),
    status: CustomerStatusSchema,
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('Customer');

const CustomerDetailSchema = CustomerSchema.extend({
  accountCount: z.number().int(),
}).openapi('CustomerDetail');

const AccountSchema = z
  .object({
    id: IdSchema,
    customerId: IdSchema,
    accountNumber: z.string().regex(/^\d{16}$/),
    currency: CurrencySchema,
    balance: MoneySchema,
    status: AccountStatusSchema,
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('Account');

const TransactionSchema = z
  .object({
    id: IdSchema,
    referenceNo: z.string(),
    type: TransactionTypeSchema,
    status: TransactionStatusSchema,
    amount: MoneySchema,
    currency: CurrencySchema,
    sourceAccountId: IdSchema.nullable(),
    targetAccountId: IdSchema.nullable(),
    description: z.string().nullable(),
    failureReason: z.string().nullable(),
    createdAt: DateTimeSchema,
    completedAt: DateTimeSchema.nullable(),
  })
  .openapi('Transaction');

const TransactionDetailSchema = z
  .object({
    id: IdSchema,
    referenceNo: z.string(),
    type: TransactionTypeSchema,
    status: TransactionStatusSchema,
    amount: MoneySchema,
    currency: CurrencySchema,
    sourceAccount: z.object({ accountNumber: z.string() }).nullable(),
    targetAccount: z.object({ accountNumber: z.string() }).nullable(),
    ledgerEntries: z.array(
      z.object({
        accountNumber: z.string(),
        direction: EntryDirectionSchema,
        amount: MoneySchema,
        balanceAfter: MoneySchema.nullable(),
        createdAt: DateTimeSchema,
      }),
    ),
    description: z.string().nullable(),
    failureReason: z.string().nullable(),
    createdAt: DateTimeSchema,
    completedAt: DateTimeSchema.nullable(),
  })
  .openapi('TransactionDetail');

const AccountTransactionSchema = z
  .object({
    id: IdSchema,
    referenceNo: z.string(),
    type: TransactionTypeSchema,
    status: TransactionStatusSchema,
    amount: MoneySchema,
    currency: CurrencySchema,
    direction: EntryDirectionSchema.nullable(),
    balanceAfter: MoneySchema.nullable(),
    description: z.string().nullable(),
    failureReason: z.string().nullable(),
    createdAt: DateTimeSchema,
    completedAt: DateTimeSchema.nullable(),
  })
  .openapi('AccountTransaction');

const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const SummaryRowSchema = z.object({
  currency: CurrencySchema,
  totalCredits: MoneySchema,
  totalDebits: MoneySchema,
  net: MoneySchema,
});

const PeriodicRowSchema = z.object({
  periodStart: DateTimeSchema,
  currency: CurrencySchema,
  totalCredits: MoneySchema,
  totalDebits: MoneySchema,
  transactionCount: z.number().int(),
});

const StatementSchema = z.object({
  accountId: IdSchema,
  currency: CurrencySchema,
  from: DateTimeSchema,
  to: DateTimeSchema,
  openingBalance: MoneySchema,
  movements: z.array(
    z.object({
      id: IdSchema,
      transactionId: IdSchema,
      referenceNo: z.string(),
      type: TransactionTypeSchema,
      status: TransactionStatusSchema,
      direction: EntryDirectionSchema,
      amount: MoneySchema,
      balanceAfter: MoneySchema,
      description: z.string().nullable(),
      createdAt: DateTimeSchema,
    }),
  ),
  closingBalance: MoneySchema,
});

const TransactionStatsSchema = z.object({
  from: DateTimeSchema,
  to: DateTimeSchema,
  totalTransactions: z.number().int(),
  completedTransactions: z.number().int(),
  failedTransactions: z.number().int(),
  pendingTransactions: z.number().int(),
  successRate: z.number(),
  byTypeAndStatus: z.array(
    z.object({
      type: TransactionTypeSchema,
      status: TransactionStatusSchema,
      count: z.number().int(),
      totalAmount: MoneySchema,
    }),
  ),
  failuresByReason: z.array(
    z.object({
      reason: z.string(),
      count: z.number().int(),
    }),
  ),
});

const ExchangeRatesSchema = z
  .object({
    source: z.literal('TCMB'),
    bulletinDate: z.iso.date(),
    fetchedAt: DateTimeSchema,
    isStale: z.boolean(),
    rates: z.array(
      z.object({
        currency: z.enum(['USD', 'EUR']),
        unit: z.string(),
        forexBuying: z.string(),
        forexSelling: z.string(),
      }),
    ),
  })
  .openapi('ExchangeRates');

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

function successResponse(dataSchema: ZodType, description: string, withMeta = false) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          data: dataSchema,
          ...(withMeta ? { meta: PaginationMetaSchema } : {}),
        }),
      },
    },
  };
}

function errorResponse(description: string, code: string, message: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: ErrorEnvelopeSchema,
        example: { error: { code, message } },
      },
    },
  };
}

const commonErrors = {
  400: errorResponse('Input validation failed', 'VALIDATION_ERROR', 'Validation error'),
  401: errorResponse('Authentication required', 'UNAUTHORIZED', 'Authentication required'),
  403: errorResponse('Insufficient permissions', 'FORBIDDEN', 'Insufficient permissions'),
  404: errorResponse('Resource not found', 'NOT_FOUND', 'Resource not found'),
  409: errorResponse('Request conflicts with existing data', 'CONFLICT', 'Conflict'),
  422: errorResponse(
    'Business rule rejected the operation',
    'BUSINESS_RULE',
    'Business rule failed',
  ),
  429: errorResponse(
    'Rate limit exceeded',
    'RATE_LIMITED',
    'Too many requests, please try again later',
  ),
  500: errorResponse('Unexpected server error', 'INTERNAL_SERVER_ERROR', 'Internal server error'),
};

const idempotencyHeadersSchema = z.object({
  'Idempotency-Key': idempotencyKeySchema.describe(
    'A unique UUID for this money operation. Reuse it only for retries of the same request.',
  ),
});

function jsonBody(schema: ZodType) {
  return { content: { 'application/json': { schema } } };
}

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Check API and database health',
  responses: {
    200: successResponse(z.object({ status: z.literal('ok') }), 'Service is healthy'),
    429: commonErrors[429],
    503: errorResponse('Database unavailable', 'SERVICE_UNAVAILABLE', 'Database unavailable'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Log in and receive access token',
  request: { body: jsonBody(loginSchema) },
  responses: {
    200: {
      ...successResponse(AuthDataSchema, 'Login successful'),
      headers: {
        'Set-Cookie': {
          description: 'HttpOnly refresh token cookie.',
          schema: { type: 'string' },
        },
      },
    },
    400: commonErrors[400],
    401: errorResponse('Invalid credentials', 'UNAUTHORIZED', 'Invalid email or password'),
    429: commonErrors[429],
    500: commonErrors[500],
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Auth'],
  summary: 'Refresh access token using refresh cookie',
  security: cookieSecurity,
  responses: {
    200: {
      ...successResponse(AuthDataSchema, 'Token refreshed'),
      headers: {
        'Set-Cookie': {
          description: 'Rotated HttpOnly refresh token cookie.',
          schema: { type: 'string' },
        },
      },
    },
    401: commonErrors[401],
    429: commonErrors[429],
    500: commonErrors[500],
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Revoke refresh token and clear cookie',
  security: cookieSecurity,
  responses: {
    204: { description: 'Logged out; refresh token cookie cleared' },
    429: commonErrors[429],
    500: commonErrors[500],
  },
});

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Get current user',
  security: bearerSecurity,
  responses: {
    200: successResponse(PublicUserSchema, 'Current user'),
    401: commonErrors[401],
    429: commonErrors[429],
    500: commonErrors[500],
  },
});

registry.registerPath({
  method: 'post',
  path: '/customers',
  tags: ['Customers'],
  summary: 'Create a customer',
  description: 'Requires ADMIN role.',
  security: bearerSecurity,
  request: { body: jsonBody(createCustomerSchema) },
  responses: {
    201: successResponse(CustomerSchema, 'Customer created'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/customers',
  tags: ['Customers'],
  summary: 'List and search customers',
  description: 'Requires ADMIN role.',
  security: bearerSecurity,
  request: { query: listCustomersQuerySchema },
  responses: {
    200: successResponse(z.array(CustomerSchema), 'Customer page', true),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/customers/{id}',
  tags: ['Customers'],
  summary: 'Get a customer',
  description: 'Requires ADMIN role.',
  security: bearerSecurity,
  request: { params: customerIdParamsSchema },
  responses: {
    200: successResponse(CustomerDetailSchema, 'Customer details'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/customers/{id}',
  tags: ['Customers'],
  summary: 'Update a customer',
  description: 'Requires ADMIN role.',
  security: bearerSecurity,
  request: {
    params: customerIdParamsSchema,
    body: jsonBody(updateCustomerSchema),
  },
  responses: {
    200: successResponse(CustomerSchema, 'Customer updated'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/accounts',
  tags: ['Accounts'],
  summary: 'Create an account',
  description:
    'An admin may supply customerId; a customer creates an account for their own profile.',
  security: bearerSecurity,
  request: { body: jsonBody(createAccountSchema) },
  responses: {
    201: successResponse(AccountSchema, 'Account created'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/accounts',
  tags: ['Accounts'],
  summary: 'List accounts visible to the current user',
  security: bearerSecurity,
  request: { query: listAccountsQuerySchema },
  responses: {
    200: successResponse(z.array(AccountSchema), 'Accounts'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/accounts/{id}',
  tags: ['Accounts'],
  summary: 'Get an account',
  security: bearerSecurity,
  request: { params: accountIdParamsSchema },
  responses: {
    200: successResponse(AccountSchema, 'Account details'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/accounts/{id}/status',
  tags: ['Accounts'],
  summary: 'Update account status',
  description: 'Requires ADMIN role.',
  security: bearerSecurity,
  request: {
    params: accountIdParamsSchema,
    body: jsonBody(updateAccountStatusSchema),
  },
  responses: {
    200: successResponse(AccountSchema, 'Account status updated'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/accounts/{id}/transactions',
  tags: ['Accounts'],
  summary: 'List transactions for an account',
  security: bearerSecurity,
  request: {
    params: accountIdParamsSchema,
    query: accountTransactionsQuerySchema,
  },
  responses: {
    200: successResponse(z.array(AccountTransactionSchema), 'Account transactions', true),
    ...commonErrors,
  },
});

const moneyOperationErrors = {
  ...commonErrors,
  409: errorResponse(
    'Idempotency key was reused with a different request',
    'IDEMPOTENCY_KEY_REUSED',
    'Idempotency key was already used with a different request',
  ),
  422: errorResponse(
    'Insufficient funds or inactive account',
    'INSUFFICIENT_FUNDS',
    'Insufficient funds',
  ),
};

registry.registerPath({
  method: 'post',
  path: '/transactions/deposits',
  tags: ['Transactions'],
  summary: 'Deposit money',
  security: bearerSecurity,
  request: {
    headers: idempotencyHeadersSchema,
    body: jsonBody(createDepositSchema),
  },
  responses: {
    201: successResponse(TransactionSchema, 'Deposit created'),
    200: successResponse(TransactionSchema, 'Idempotent replay'),
    ...moneyOperationErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/transactions/withdrawals',
  tags: ['Transactions'],
  summary: 'Withdraw money',
  security: bearerSecurity,
  request: {
    headers: idempotencyHeadersSchema,
    body: jsonBody(createWithdrawalSchema),
  },
  responses: {
    201: successResponse(TransactionSchema, 'Withdrawal created'),
    200: successResponse(TransactionSchema, 'Idempotent replay'),
    ...moneyOperationErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/transactions/transfers',
  tags: ['Transactions'],
  summary: 'Transfer money between accounts',
  security: bearerSecurity,
  request: {
    headers: idempotencyHeadersSchema,
    body: jsonBody(createTransferSchema),
  },
  responses: {
    201: successResponse(TransactionSchema, 'Transfer created'),
    200: successResponse(TransactionSchema, 'Idempotent replay'),
    ...moneyOperationErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/transactions/{id}',
  tags: ['Transactions'],
  summary: 'Get transaction details',
  security: bearerSecurity,
  request: { params: transactionIdParamsSchema },
  responses: {
    200: successResponse(TransactionDetailSchema, 'Transaction details'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/exchange-rates',
  tags: ['Exchange Rates'],
  summary: 'Get TCMB USD and EUR indicative rates',
  description:
    'Rates are informational only and are not used to convert account balances or execute money transfers.',
  security: bearerSecurity,
  responses: {
    200: successResponse(ExchangeRatesSchema, 'Latest cached TCMB bulletin'),
    ...commonErrors,
    503: errorResponse(
      'Exchange rate source is unavailable',
      'EXCHANGE_RATE_UNAVAILABLE',
      'Exchange rates are temporarily unavailable',
    ),
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/summary',
  tags: ['Reports'],
  summary: 'Get money movement totals by currency',
  security: bearerSecurity,
  request: { query: reportSummaryQuerySchema },
  responses: {
    200: successResponse(z.array(SummaryRowSchema), 'Summary by currency'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/periodic',
  tags: ['Reports'],
  summary: 'Get day, week, or month totals',
  security: bearerSecurity,
  request: { query: reportPeriodicQuerySchema },
  responses: {
    200: successResponse(z.array(PeriodicRowSchema), 'Periodic totals'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/accounts/{id}/statement',
  tags: ['Reports'],
  summary: 'Get an account statement',
  security: bearerSecurity,
  request: {
    params: reportStatementParamsSchema,
    query: reportStatementQuerySchema,
  },
  responses: {
    200: successResponse(StatementSchema, 'Account statement'),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/reports/transaction-stats',
  tags: ['Reports'],
  summary: 'Get transaction outcome statistics',
  security: bearerSecurity,
  request: { query: reportTransactionStatsQuerySchema },
  responses: {
    200: successResponse(
      TransactionStatsSchema,
      'Counts, amounts, success rate, and failure reasons',
    ),
    ...commonErrors,
  },
});

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'FinTrack API',
    version: '1.0.0',
    description:
      'Financial transaction API. All money amounts are decimal strings. Date ranges use [from, to): from is inclusive and to is exclusive. Protected endpoints use Bearer JWT authentication.',
  },
  servers: [{ url: '/api/v1', description: 'FinTrack API v1' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Customers' },
    { name: 'Accounts' },
    { name: 'Transactions' },
    { name: 'Reports' },
    { name: 'Exchange Rates' },
  ],
});
