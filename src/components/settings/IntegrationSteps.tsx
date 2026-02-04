import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Step {
  number: number;
  title: string;
  description?: string;
  content: ReactNode;
  completed?: boolean;
}

interface IntegrationStepsProps {
  steps: Step[];
  className?: string;
}

export function IntegrationSteps({ steps, className }: IntegrationStepsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step) => (
        <div
          key={step.number}
          className={cn(
            'relative pl-8 pb-4',
            step.number < steps.length && 'border-l-2 border-muted ml-3'
          )}
        >
          <div
            className={cn(
              'absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
              step.completed
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {step.completed ? '✓' : step.number}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{step.title}</h4>
            {step.description && (
              <p className="text-xs text-muted-foreground">{step.description}</p>
            )}
            <div className="pt-1">{step.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
