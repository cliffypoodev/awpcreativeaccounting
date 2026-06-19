import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/Provider';

export const metadata: Metadata = {
  title: 'InvoiceForge — AI-native invoicing, estimates & expenses',
  description:
    'Create invoices and estimates in seconds, get paid with Stripe, and let AI handle the busywork. A faster, more extensible alternative to invoicer.ai.',
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Hanken+Grotesk:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
