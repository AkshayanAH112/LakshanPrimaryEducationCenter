import { sendWhatsApp } from '@/lib/whatsapp';
import { sendSMS } from '@/lib/sms';

export type NotifyChannel = 'whatsapp' | 'sms' | 'failed';

/**
 * Sends one guardian message, WhatsApp first and SMS as the fallback — the
 * same order the outstanding-payments cron uses, and for the same reason:
 * WhatsApp via Blueticks is far cheaper per message, and falls back cleanly
 * when the key isn't configured or the send fails.
 *
 * Both senders no-op to a console log in non-production without credentials,
 * so this is safe to call freely in local dev.
 */
export async function notifyGuardian(to: string, message: string): Promise<NotifyChannel> {
  if (await sendWhatsApp(to, message)) return 'whatsapp';
  if (await sendSMS(to, message)) return 'sms';
  return 'failed';
}
