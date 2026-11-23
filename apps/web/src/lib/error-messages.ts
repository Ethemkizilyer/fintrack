import axios from 'axios';
import { z } from 'zod';

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
  }),
});

const apiErrorMessages: Record<string, string> = {
  UNAUTHORIZED: 'E-posta veya şifre hatalı.',
  FORBIDDEN: 'Bu işlem için yetkiniz bulunmuyor.',
  VALIDATION_ERROR: 'Bilgileri kontrol edip tekrar deneyin.',
  CUSTOMER_INACTIVE: 'Müşteri hesabı aktif olmadığı için işlem yapılamadı.',
  CONFLICT: 'Bu kayıt mevcut bilgilerle zaten kullanılıyor.',
  INSUFFICIENT_FUNDS: 'Bakiye yetersiz.',
  ACCOUNT_INACTIVE: 'Hesap pasif durumda.',
  CURRENCY_MISMATCH: 'Hesapların para birimi farklı.',
  LOCK_TIMEOUT: 'Sistem yoğun. Biraz bekleyip aynı işlemi tekrar deneyin.',
  IDEMPOTENCY_KEY_REUSED: 'Bu istek anahtarı farklı bir işlemde kullanılmış.',
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.';

  const parsed = apiErrorSchema.safeParse(error.response.data);
  if (!parsed.success) return fallback;

  return apiErrorMessages[parsed.data.error.code] ?? fallback;
}
