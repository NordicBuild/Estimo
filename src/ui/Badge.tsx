import React from 'react';

export interface BadgeProps {
  variant?: 'blue' | 'green' | 'amber' | 'purple' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  const styles: Record<string, string> = {
    blue: 'bg-[var(--blue-lt)] text-[var(--blue)]',
    green: 'bg-[var(--green-lt)] text-[var(--green)]',
    amber: 'bg-[var(--amber-lt)] text-[var(--amber)]',
    purple: 'bg-[var(--purple-lt)] text-[var(--purple)]',
    gray: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
  };
  
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
