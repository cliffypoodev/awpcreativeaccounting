import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, round, lineAmount, paymentProgress } from './calc.ts';

test('round handles classic float drift', () => {
  assert.equal(round(0.1 + 0.2), 0.3);
  assert.equal(round(1.005), 1.01);
});

test('simple subtotal + tax', () => {
  const r = calculateInvoice([{ quantity: 2, unitPrice: 50, taxRate: 10 }]);
  assert.equal(r.subtotal, 100);
  assert.equal(r.taxAmount, 10);
  assert.equal(r.total, 110);
  assert.equal(r.amountDue, 110);
});

test('percentage discount applies to subtotal', () => {
  const r = calculateInvoice(
    [{ quantity: 1, unitPrice: 200, taxRate: 0 }],
    [{ type: 'percentage', value: 25 }],
  );
  assert.equal(r.discountAmount, 50);
  assert.equal(r.total, 150);
});

test('fixed discount + deposit reduces amount due', () => {
  const r = calculateInvoice(
    [{ quantity: 3, unitPrice: 100, taxRate: 0 }],
    [{ type: 'fixed', value: 30 }],
    [100],
  );
  assert.equal(r.subtotal, 300);
  assert.equal(r.discountAmount, 30);
  assert.equal(r.total, 270);
  assert.equal(r.depositsTotal, 100);
  assert.equal(r.amountDue, 170);
});

test('multi-line mixed tax rates round per line', () => {
  const r = calculateInvoice([
    { quantity: 3, unitPrice: 19.99, taxRate: 8.5 },
    { quantity: 1, unitPrice: 5.5, taxRate: 0 },
  ]);
  assert.equal(r.subtotal, 65.47);
  assert.equal(r.taxAmount, 5.1);
  assert.equal(r.total, 70.57);
});

test('overpayment clamps amountDue to 0, total never negative', () => {
  const r = calculateInvoice(
    [{ quantity: 1, unitPrice: 100, taxRate: 0 }],
    [{ type: 'fixed', value: 999 }],
    [50],
  );
  assert.equal(r.total, 0);
  assert.equal(r.amountDue, 0);
});

test('garbage inputs coerce to 0', () => {
  const r = calculateInvoice([{ quantity: NaN, unitPrice: Infinity, taxRate: 10 }]);
  assert.equal(r.subtotal, 0);
  assert.equal(r.total, 0);
});

test('helpers', () => {
  assert.equal(lineAmount(4, 12.5), 50);
  assert.equal(paymentProgress(200, 50), 25);
  assert.equal(paymentProgress(0, 0), 0);
});
