import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniChartProps {
  data: { value: number }[];
  color?: 'orange' | 'blue' | 'green' | 'red' | 'purple';
}

const colorMap: Record<string, string> = {
  orange: 'hsl(24 95% 53%)',
  blue: 'hsl(217 91% 60%)',
  green: 'hsl(142 76% 36%)',
  red: 'hsl(0 84% 60%)',
  purple: 'hsl(263 70% 50%)',
};

export function MiniAreaChart({ data, color = 'orange' }: MiniChartProps) {
  const strokeColor = colorMap[color];
  const gradientId = `mini-gradient-${color}-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MiniLineChart({ data, color = 'blue' }: MiniChartProps) {
  const strokeColor = colorMap[color];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
