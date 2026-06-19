import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface InvoiceEmailProps {
  orgName: string;
  invoiceNumber: string;
  clientName: string;
  amountDue: string;
  dueDate: string;
  payUrl: string;
  brandColor?: string;
}

export function InvoiceEmail({
  orgName,
  invoiceNumber,
  clientName,
  amountDue,
  dueDate,
  payUrl,
  brandColor = '#34302a',
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Invoice ${invoiceNumber} from ${orgName} — ${amountDue} due`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={{ ...h1, color: brandColor }}>{orgName}</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>
            Invoice <strong>{invoiceNumber}</strong> is ready. The balance due is{' '}
            <strong>{amountDue}</strong>, payable by {dueDate}.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={payUrl} style={{ ...button, backgroundColor: brandColor }}>
              View &amp; pay invoice
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={muted}>
            Sent by {orgName} via InvoiceForge. If you have questions about this invoice, just reply
            to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoiceEmail;

const body = { backgroundColor: '#ece5da', fontFamily: 'Helvetica, Arial, sans-serif' };
const container = { margin: '0 auto', padding: '32px', maxWidth: '560px', backgroundColor: '#f4eee5' };
const h1 = { fontSize: '24px', fontWeight: 700, margin: '0 0 16px' };
const text = { color: '#34302a', fontSize: '15px', lineHeight: '24px' };
const muted = { color: '#847c6f', fontSize: '12px', lineHeight: '18px' };
const button = {
  color: '#ece5da',
  fontWeight: 700,
  fontSize: '15px',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
};
const hr = { borderColor: '#dcd3c5', margin: '24px 0' };
