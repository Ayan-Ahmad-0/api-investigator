import React from 'react';
import { IncidentSeverity } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: IncidentSeverity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => {
  const styles = {
    critical: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    high: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    medium: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    low: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider',
        styles[severity] || styles.low,
        className
      )}
    >
      {severity}
    </span>
  );
};
