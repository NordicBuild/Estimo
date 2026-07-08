import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getGridColsClass = (breakpoint: string, value?: number) => {
  if (!value) return '';
  const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
  const key = `${prefix}grid-cols-${value}`;
  
  // Explicit mapping so Tailwind statically extracts the classes
  const classes: Record<string, string> = {
    'grid-cols-1': 'grid-cols-1',
    'grid-cols-2': 'grid-cols-2',
    'grid-cols-3': 'grid-cols-3',
    'grid-cols-4': 'grid-cols-4',
    'grid-cols-5': 'grid-cols-5',
    'grid-cols-6': 'grid-cols-6',
    'grid-cols-12': 'grid-cols-12',
    
    'sm:grid-cols-1': 'sm:grid-cols-1',
    'sm:grid-cols-2': 'sm:grid-cols-2',
    'sm:grid-cols-3': 'sm:grid-cols-3',
    'sm:grid-cols-4': 'sm:grid-cols-4',
    'sm:grid-cols-5': 'sm:grid-cols-5',
    'sm:grid-cols-6': 'sm:grid-cols-6',
    'sm:grid-cols-12': 'sm:grid-cols-12',
    
    'md:grid-cols-1': 'md:grid-cols-1',
    'md:grid-cols-2': 'md:grid-cols-2',
    'md:grid-cols-3': 'md:grid-cols-3',
    'md:grid-cols-4': 'md:grid-cols-4',
    'md:grid-cols-5': 'md:grid-cols-5',
    'md:grid-cols-6': 'md:grid-cols-6',
    'md:grid-cols-12': 'md:grid-cols-12',
    
    'lg:grid-cols-1': 'lg:grid-cols-1',
    'lg:grid-cols-2': 'lg:grid-cols-2',
    'lg:grid-cols-3': 'lg:grid-cols-3',
    'lg:grid-cols-4': 'lg:grid-cols-4',
    'lg:grid-cols-5': 'lg:grid-cols-5',
    'lg:grid-cols-6': 'lg:grid-cols-6',
    'lg:grid-cols-12': 'lg:grid-cols-12',
    
    'xl:grid-cols-1': 'xl:grid-cols-1',
    'xl:grid-cols-2': 'xl:grid-cols-2',
    'xl:grid-cols-3': 'xl:grid-cols-3',
    'xl:grid-cols-4': 'xl:grid-cols-4',
    'xl:grid-cols-5': 'xl:grid-cols-5',
    'xl:grid-cols-6': 'xl:grid-cols-6',
    'xl:grid-cols-12': 'xl:grid-cols-12',
  };
  
  return classes[key] || '';
};

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = ''
}: ResponsiveGridProps) {
  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }[gap];

  const gridClasses = [
    'grid',
    gapClass,
    getGridColsClass('xs', cols.xs),
    getGridColsClass('sm', cols.sm),
    getGridColsClass('md', cols.md),
    getGridColsClass('lg', cols.lg),
    getGridColsClass('xl', cols.xl),
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}
