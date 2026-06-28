import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MaterialPriceChartProps {
  data: { date: string; price: number }[];
}

export default function MaterialPriceChart({ data }: MaterialPriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--text3)]">
        Ingen prishistorik tillgänglig. Ändra priset ovan för att börja spara historik.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" tickMargin={8} minTickGap={15} />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={40} tickFormatter={(v) => `${v}`} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(value: number) => [`${value} kr`, 'Pris']}
          labelStyle={{ color: 'var(--text2)', marginBottom: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}
        />
        <Line type="monotone" dataKey="price" stroke="var(--blue)" strokeWidth={2} dot={{ r: 4, fill: 'var(--blue)' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
