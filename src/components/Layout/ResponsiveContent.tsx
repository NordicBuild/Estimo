import React, { useState, useEffect } from 'react';

interface ResponsiveContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveContent({ children, className = '' }: ResponsiveContentProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  return (
    <main
      className={`
        flex-1 overflow-y-auto bg-background
        ${isMobile ? 'p-4 pb-20' : ''}
        ${isTablet ? 'p-5 pb-0' : ''}
        ${isDesktop ? 'p-6 pb-0' : ''}
        ${className}
      `}
    >
      <div
        className={`
          mx-auto h-full
          ${isMobile ? 'w-full' : ''}
          ${isTablet ? 'max-w-4xl' : ''}
          ${isDesktop ? 'max-w-6xl' : ''}
        `}
      >
        {children}
      </div>
    </main>
  );
}
