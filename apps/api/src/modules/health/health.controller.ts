import type { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

export async function check(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok' } });
  } catch {
    res.status(503).json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' },
    });
  }
}
