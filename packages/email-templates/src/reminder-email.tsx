import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';

export interface ReminderEmailProps {
  orgName: string;
  invoiceNumber: string;
  clientName: string;
  amountDue: string;
  daysOverdue: number;
  payUrl: string;
  tone?: 'friendly' | 'firm' | 'final';
  brandColor?: string;
}

const opener = (tone: ReminderEmailProps['tone'], n: number) => {
  if (tone === 'final') return `This is a final notice — invoice is ${n} days overdue.`;
  if (tone === 'firm') return `A reminder that this invoice is now ${n} days overdue.`;
  return `Just a gentle nudge — this invoice slipped ${n} days past due.`;
};

export function ReminderEmail({
  orgName,
  invoiceNumber,
  clientName,
  amountDue,
  daysOverdue,
  payUrl,
  tone = 'friendly',
  brandColor = '#E8A33D',
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Reminder: invoice ${invoiceNumber} — ${amountDue} due`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={{ ...h1, color: brandColor }}>{orgName}</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>{opener(tone, daysOverdue)}</Text>
          <Text style={text}>
            Invoice <strong>{invoiceNumber}</strong> has an outstanding balance of{' '}
            <strong>{amountDue}</strong>.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={payUrl} style={{ ...button, backgroundColor: brandColor }}>
              Pay now
            </Button>
          </Section>
          <Text style={muted}>Thank you, {orgName}.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderEmail;

const body = { backgroundColor: '#14110e', fontFamily: 'Helvetica, Arial, sans-serif' };
const container = { margin: '0 auto', padding: '32px', maxWidth: '560px', backgroundColor: '#1c1814' };
const h1 = { fontSize: '24px', fontWeight: 700, margin: '0 0 16px' };
const text = { color: '#e8e2d9', fontSize: '15px', lineHeight: '24px' };
const muted = { color: '#9a9082', fontSize: '12px' };
const button = {
  color: '#14110e',
  fontWeight: 700,
  fontSize: '15px',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
};
