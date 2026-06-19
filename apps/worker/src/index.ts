/**
 * InvoiceForge — Worker process.
 *
 * Runs the four BullMQ workers. Side-effecting integrations (Resend, Gotenberg)
 * are isolated behind small helpers so they can be swapped without touching the
 * job wiring. Until those env keys are set, processors log and no-op cleanly.
 */
import { Worker, type Job } from 'bullmq';
import {
  connection,
  QUEUES,
  type EmailJob,
  type PdfJob,
  type ReminderJob,
  type RecurringJob,
} from './queues.js';

const log = (q: string, msg: string) => console.log(`[worker:${q}] ${msg}`);

// ─── email ──────────────────────────────────────────────────────────────
const emailWorker = new Worker<EmailJob>(
  QUEUES.email,
  async (job: Job<EmailJob>) => {
    const { to, template } = job.data;
    if (!process.env.RESEND_API_KEY) {
      log('email', `(stub) would send "${template}" to ${to}`);
      return;
    }
    // >>> integrate Resend + @invoiceforge/email-templates here.
    log('email', `sending "${template}" to ${to}`);
  },
  { connection },
);

// ─── pdf ────────────────────────────────────────────────────────────────
const pdfWorker = new Worker<PdfJob>(
  QUEUES.pdf,
  async (job: Job<PdfJob>) => {
    const { invoiceId } = job.data;
    if (!process.env.GOTENBERG_URL) {
      log('pdf', `(stub) would render PDF for invoice ${invoiceId}`);
      return;
    }
    // >>> render React PDF template -> HTML -> Gotenberg -> R2 upload.
    log('pdf', `rendering invoice ${invoiceId}`);
  },
  { connection },
);

// ─── reminder ───────────────────────────────────────────────────────────
const reminderWorker = new Worker<ReminderJob>(
  QUEUES.reminder,
  async (job: Job<ReminderJob>) => {
    const { invoiceId, tone } = job.data;
    log('reminder', `drafting ${tone} reminder for invoice ${invoiceId}`);
    // >>> call ai-service /chat draft_reminder, then enqueue an email job.
  },
  { connection },
);

// ─── recurring ──────────────────────────────────────────────────────────
const recurringWorker = new Worker<RecurringJob>(
  QUEUES.recurring,
  async (job: Job<RecurringJob>) => {
    log('recurring', `cloning recurring invoice ${job.data.invoiceId}`);
    // >>> clone source invoice, bump dates, insert, enqueue email.
  },
  { connection },
);

for (const w of [emailWorker, pdfWorker, reminderWorker, recurringWorker]) {
  w.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));
}

console.log('InvoiceForge worker online. Listening on queues:', Object.values(QUEUES).join(', '));

const shutdown = async () => {
  await Promise.all([
    emailWorker.close(),
    pdfWorker.close(),
    reminderWorker.close(),
    recurringWorker.close(),
  ]);
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
