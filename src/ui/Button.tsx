import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: string;
}

export function Button({ variant = 'primary', icon, className = '', children, ...props }: ButtonProps) {
  let btnClass = 'btn ';
  if (variant === 'primary') btnClass += 'btn-primary ';
  if (variant === 'ghost') btnClass += 'btn-ghost ';
  if (variant === 'danger') btnClass += 'bg-[var(--color-status-error)] text-white hover:opacity-90 ';
  
  return (
    <button className={`${btnClass} ${className}`} {...props}>
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      {children}
    </button>
  );
}
