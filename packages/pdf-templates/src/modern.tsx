import type { PdfInvoiceData } from './types.js';

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

/** Modern: sans-serif, bold amber accent band, generous whitespace. */
export function ModernTemplate({ data }: { data: PdfInvoiceData }) {
  const accent = data.brandColor ?? '#E8A33D';
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: '#14110e', maxWidth: '720px' }}>
      <div style={{ background: accent, padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 style={{ margin: 0, fontSize: '26px', color: '#14110e' }}>{data.orgName}</h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '3px' }}>Invoice</div>
          <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700 }}>{data.invoiceNumber}</div>
        </div>
      </div>

      <div style={{ padding: '32px 48px' }}>
        <section style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '24px' }}>
          <div>
            <div style={{ color: '#999', fontSize: '11px', textTransform: 'uppercase' }}>Billed to</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{data.clientName}</div>
            {data.clientEmail && <div style={{ color: '#666' }}>{data.clientEmail}</div>}
          </div>
          <div style={{ textAlign: 'right', color: '#666' }}>
            <div>Issued {data.issueDate}</div>
            <div>Due {data.dueDate}</div>
          </div>
        </section>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#999', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '10px 0' }}>{it.description}</td>
                <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                <td style={{ textAlign: 'right' }}>{fmt(it.unitPrice, data.currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(it.amount, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <div style={{ minWidth: '260px' }}>
            <Line label="Subtotal" value={fmt(data.subtotal, data.currency)} />
            <Line label="Tax" value={fmt(data.taxAmount, data.currency)} />
            {data.discountAmount > 0 && <Line label="Discount" value={`− ${fmt(data.discountAmount, data.currency)}`} />}
            <div style={{ borderTop: '2px solid #14110e', marginTop: '8px', paddingTop: '8px' }}>
              <Line label="Amount due" value={fmt(data.amountDue, data.currency)} big accent={accent} />
            </div>
          </div>
        </section>

        {(data.notes || data.terms) && (
          <footer style={{ marginTop: '32px', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            {data.notes && <p style={{ margin: '4px 0' }}>{data.notes}</p>}
            {data.terms && <p style={{ margin: '4px 0' }}>{data.terms}</p>}
          </footer>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: big ? 700 : 500, fontSize: big ? '18px' : '13px', color: accent ?? 'inherit' }}>{value}</span>
    </div>
  );
}

export default ModernTemplate;
