import { cn } from '@/lib/utils';

interface TrafficSource {
  name: string;
  value: number;
  color: string;
}

interface TrafficSourceChartProps {
  data: TrafficSource[];
}

export function TrafficSourceChart({ data }: TrafficSourceChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-4">
      {data.map((source) => (
        <div key={source.name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{source.name}</span>
            <span className="text-muted-foreground">{source.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500')}
              style={{
                width: `${(source.value / maxValue) * 100}%`,
                backgroundColor: source.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
