import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
}

export function IconButton({ icon, className = '', ...props }: IconButtonProps) {
  return (
    <button 
      className={`p-1.5 rounded-md hover:bg-black/5 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30 ${className}`} 
      {...props}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
