/**
 * InvoiceForge — Worker queues.
 *
 * Centralises the Redis connection and the four queues described in the
 * blueprint (email, pdf, reminder, recurring). The Next.js app enqueues jobs;
 * this worker process consumes them.
 */
import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const connection: ConnectionOptions = new IORedis(url, {
  maxRetriesPerRequest: null,
});

export const QUEUES = {
  email: 'email',
  pdf: 'pdf',
  reminder: 'reminder',
  recurring: 'recurring',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// Job payload contracts (kept tiny + serialisable).
export interface EmailJob {
  to: string;
  template: 'invoice' | 'receipt' | 'reminder' | 'estimate' | 'welcome';
  data: Record<string, unknown>;
}
export interface PdfJob {
  invoiceId: string;
  templateId?: string;
}
export interface ReminderJob {
  invoiceId: string;
  tone: 'friendly' | 'firm' | 'final';
}
export interface RecurringJob {
  invoiceId: string;
}

export const emailQueue = new Queue<EmailJob>(QUEUES.email, { connection });
export const pdfQueue = new Queue<PdfJob>(QUEUES.pdf, { connection });
export const reminderQueue = new Queue<ReminderJob>(QUEUES.reminder, { connection });
export const recurringQueue = new Queue<RecurringJob>(QUEUES.recurring, { connection });
