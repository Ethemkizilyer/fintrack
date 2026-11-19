import type { Request, Response } from 'express';
import { buildPaginationMeta } from '@/utils/pagination';
import * as customersService from './customers.service';
import {
  createCustomerSchema,
  customerIdParamsSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customers.schema';

export async function create(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  res.status(201).json({ data: await customersService.createCustomer(input) });
}

export async function list(req: Request, res: Response) {
  const query = listCustomersQuerySchema.parse(req.query);
  const { items, total } = await customersService.listCustomers(query);
  res.json({ data: items, meta: buildPaginationMeta(query.page, query.limit, total) });
}

export async function getById(req: Request, res: Response) {
  const { id } = customerIdParamsSchema.parse(req.params);
  res.json({ data: await customersService.getCustomerById(id) });
}

export async function update(req: Request, res: Response) {
  const { id } = customerIdParamsSchema.parse(req.params);
  const input = updateCustomerSchema.parse(req.body);
  res.json({ data: await customersService.updateCustomer(id, input) });
}
