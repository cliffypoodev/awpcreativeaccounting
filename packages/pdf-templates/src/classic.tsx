import type { PdfInvoiceData } from './types.js';

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

/** Classic: serif headings, ruled table, conservative. */
export function ClassicTemplate({ data }: { data: PdfInvoiceData }) {
  const accent = data.brandColor ?? '#1a1a1a';
  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', padding: '48px', maxWidth: '720px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${accent}`, paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: accent }}>{data.orgName}</h1>
          {data.orgEmail && <div style={{ fontSize: '12px', color: '#555' }}>{data.orgEmail}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', letterSpacing: '2px', textTransform: 'uppercase' }}>Invoice</div>
          <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{data.invoiceNumber}</div>
        </div>
      </header>

      <section style={{ display: 'flex', justifyContent: 'space-between', margin: '24px 0', fontSize: '13px' }}>
        <div>
          <div style={{ color: '#777', textTransform: 'uppercase', fontSize: '11px' }}>Bill to</div>
          <div style={{ fontWeight: 700 }}>{data.clientName}</div>
          {data.clientEmail && <div style={{ color: '#555' }}>{data.clientEmail}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Issued: {data.issueDate}</div>
          <div>Due: {data.dueDate}</div>
        </div>
      </section>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${accent}` }}>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '8px 0' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '8px 0' }}>Unit</th>
            <th style={{ textAlign: 'right', padding: '8px 0' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '8px 0' }}>{it.description}</td>
              <td style={{ textAlign: 'right' }}>{it.quantity}</td>
              <td style={{ textAlign: 'right' }}>{fmt(it.unitPrice, data.currency)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(it.amount, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <table style={{ fontSize: '13px', minWidth: '240px' }}>
          <tbody>
            <Row label="Subtotal" value={fmt(data.subtotal, data.currency)} />
            <Row label="Tax" value={fmt(data.taxAmount, data.currency)} />
            {data.discountAmount > 0 && <Row label="Discount" value={`− ${fmt(data.discountAmount, data.currency)}`} />}
            <Row label="Total" value={fmt(data.total, data.currency)} bold />
            <Row label="Amount due" value={fmt(data.amountDue, data.currency)} bold accent={accent} />
          </tbody>
        </table>
      </section>

      {(data.notes || data.terms) && (
        <footer style={{ marginTop: '32px', fontSize: '12px', color: '#555' }}>
          {data.notes && <p><strong>Notes:</strong> {data.notes}</p>}
          {data.terms && <p><strong>Terms:</strong> {data.terms}</p>}
        </footer>
      )}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <tr>
      <td style={{ padding: '4px 16px 4px 0', color: '#555' }}>{label}</td>
      <td style={{ textAlign: 'right', fontWeight: bold ? 700 : 400, color: accent ?? 'inherit' }}>{value}</td>
    </tr>
  );
}

export default ClassicTemplate;
