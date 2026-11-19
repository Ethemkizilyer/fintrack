import bcrypt from 'bcryptjs';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import { getSkip } from '@/utils/pagination';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema';

const BCRYPT_ROUNDS = 10;

const CUSTOMER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  nationalId: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { email: true } },
} satisfies Prisma.CustomerSelect;

type CustomerWithEmail = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

function toPublicCustomer(customer: CustomerWithEmail) {
  const { user, ...rest } = customer;
  return { ...rest, email: user.email };
}

export async function createCustomer(input: CreateCustomerInput) {
  const { email, password, ...customerData } = input;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, role: 'CUSTOMER' },
      });
      return tx.customer.create({
        data: { ...customerData, userId: user.id },
        select: CUSTOMER_SELECT,
      });
    });
    return toPublicCustomer(customer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.[0];
      throw AppError.conflict(
        target === 'national_id'
          ? 'National ID is already registered'
          : 'Email is already registered',
      );
    }
    throw error;
  }
}

export async function listCustomers({
  page,
  limit,
  search,
  status,
  sort,
  order,
}: ListCustomersQuery) {
  let matchedIds: string[] | undefined;
  if (search) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM customers
    WHERE unaccent(lower(first_name || ' ' || last_name))
          ILIKE '%' || unaccent(lower(${search})) || '%'`;
    matchedIds = rows.map((row) => row.id);
  }
  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { id: { in: matchedIds } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: CUSTOMER_SELECT,
      skip: getSkip(page, limit),
      take: limit,
      orderBy: { [sort]: order },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items: items.map(toPublicCustomer), total };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      ...CUSTOMER_SELECT,
      _count: { select: { accounts: true } },
    },
  });
  if (!customer) throw AppError.notFound('Customer not found');

  const { _count, ...rest } = customer;
  return { ...toPublicCustomer(rest), accountCount: _count.accounts };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Customer not found');

  const customer = await prisma.customer.update({
    where: { id },
    data: input,
    select: CUSTOMER_SELECT,
  });
  return toPublicCustomer(customer);
}
