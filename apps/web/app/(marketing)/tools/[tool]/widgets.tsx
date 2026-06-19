'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const round = (n: number) => Math.round(n * 100) / 100;

export function ProfitMarginCalculator() {
  const [cost, setCost] = useState(60);
  const [price, setPrice] = useState(100);
  const profit = round(price - cost);
  const margin = price > 0 ? round((profit / price) * 100) : 0;
  const markup = cost > 0 ? round((profit / cost) * 100) : 0;
  return (
    <Card className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Cost
          <Input type="number" value={cost} onChange={(e) => setCost(+e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">Sale price
          <Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="mt-1" />
        </label>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Stat label="Profit" value={`$${profit}`} />
        <Stat label="Margin" value={`${margin}%`} highlight />
        <Stat label="Markup" value={`${markup}%`} />
      </div>
    </Card>
  );
}

export function HourlyRateCalculator() {
  const [income, setIncome] = useState(90000);
  const [weeks, setWeeks] = useState(46);
  const [hours, setHours] = useState(30);
  const [overhead, setOverhead] = useState(20);
  const billable = weeks * hours;
  const base = billable > 0 ? income / billable : 0;
  const rate = round(base * (1 + overhead / 100));
  return (
    <Card className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Target annual income ($)
          <Input type="number" value={income} onChange={(e) => setIncome(+e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">Working weeks / year
          <Input type="number" value={weeks} onChange={(e) => setWeeks(+e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">Billable hours / week
          <Input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">Overhead %
          <Input type="number" value={overhead} onChange={(e) => setOverhead(+e.target.value)} className="mt-1" />
        </label>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <Stat label="Billable hrs/yr" value={String(billable)} />
        <Stat label="Suggested rate" value={`$${rate}/hr`} highlight />
      </div>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="text-xs text-[var(--color-ink-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${highlight ? 'text-[var(--color-amber)]' : ''}`}>{value}</div>
    </div>
  );
}
