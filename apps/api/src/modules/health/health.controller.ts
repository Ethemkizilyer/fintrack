import type { Request, Response } from 'express';

export function check(_req: Request, res: Response) {
  res.json({ data: { status: 'ok' } });
}
