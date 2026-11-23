import { z } from 'zod';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/v1' : undefined);

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().refine(
    (value) => {
      try {
        return new URL(value).pathname.replace(/\/$/, '') === '/api/v1';
      } catch {
        return false;
      }
    },
    {
      message: 'API URL /api/v1 ile bitmeli',
    },
  ),
});

const parsedEnv = webEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: apiUrl,
});

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid web environment variables: ${issues}`);
}

export const webEnv = parsedEnv.data;

export const apiDocsUrl = webEnv.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '/api/docs');
