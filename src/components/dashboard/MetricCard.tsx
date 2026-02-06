import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  miniChart?: ReactNode;
  color?: 'orange' | 'blue' | 'green' | 'red' | 'purple';
  icon?: ReactNode;
}

const colorStyles: Record<string, { badge: string; icon: string }> = {
  orange: {
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  green: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  red: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

function TrendBadge({ trend, value, color }: { trend: 'up' | 'down' | 'neutral'; value: string; color: string }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const styles = colorStyles[color] || colorStyles.orange;
  
  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', styles.badge)}>
      <Icon className="h-3 w-3" />
      <span>{value}</span>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  miniChart,
  color = 'orange',
  icon,
}: MetricCardProps) {
  const styles = colorStyles[color] || colorStyles.orange;

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && (
              <div className={cn('p-2 rounded-lg', styles.icon)}>
                {icon}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <TrendBadge trend={trend} value={trendValue} color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'} />
      </div>
      {miniChart && (
        <div className="h-16 -mx-2 mt-2">
          {miniChart}
        </div>
      )}
    </Card>
  );
}
