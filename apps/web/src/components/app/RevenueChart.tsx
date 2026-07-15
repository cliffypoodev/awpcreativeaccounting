import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { money } from "@/lib/format";

interface Point {
  month: string;
  revenue: number;
  expenses: number;
}

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(28 88% 46%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(28 88% 46%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(35 8% 42%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(35 8% 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 20% 87%)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="hsl(35 8% 42%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(35 8% 42%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [money(value), name === "revenue" ? "Revenue" : "Expenses"]}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid hsl(36 20% 87%)",
              fontSize: 13,
              fontFamily: "Hanken Grotesk, sans-serif",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(28 88% 46%)"
            strokeWidth={2.5}
            fill="url(#rev)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="hsl(35 8% 42%)"
            strokeWidth={1.5}
            fill="url(#exp)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
