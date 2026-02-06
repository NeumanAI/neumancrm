import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalysisCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function AnalysisCard({ title, description, children, action }: AnalysisCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
