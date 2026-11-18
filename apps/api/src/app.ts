import express from 'express';
import { router } from '@/routes';

export const app = express();

app.use(express.json({ limit: '100kb' }));
app.use('/api/v1', router);
