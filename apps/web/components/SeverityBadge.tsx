import React from 'react';
import { IncidentSeverity } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: IncidentSeverity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => {
  const styles: Record<IncidentSeverity, string> = {
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-amber-50 text-amber-800 border-amber-200',
    medium: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const label = severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs',
        styles[severity] || styles.low,
        className
      )}
    >
      {label}
    </span>
  );
};
