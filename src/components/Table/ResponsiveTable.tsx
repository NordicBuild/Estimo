import React, { useState, useEffect } from 'react';

export interface ColumnDef {
  key: string;
  label: React.ReactNode;
  numeric?: boolean;
  visible?: boolean;
  hideOnTablet?: boolean;
  render?: (row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  data: any[];
  columns: ColumnDef[];
  onRowClick?: (row: any) => void;
}

export function ResponsiveTable({ data, columns, onRowClick }: ResponsiveTableProps) {
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

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row, i) => (
          <div key={row.id || i} className="bg-surface border border-outline-variant rounded-lg p-4 shadow-sm">
            {columns
              .filter(col => col.visible !== false)
              .map(col => (
                <div key={col.key} className="flex justify-between items-start mb-2 last:mb-0">
                  <span className="text-sm font-semibold text-on-surface-variant pr-2">
                    {col.label}
                  </span>
                  <span className={`text-sm text-right ${col.numeric ? 'font-mono' : ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
            {onRowClick && (
              <button 
                onClick={() => onRowClick(row)} 
                className="w-full mt-3 py-2 bg-primary-container text-on-primary-container rounded-md text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Visa detaljer
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {columns
                .filter(col => col.hideOnTablet !== true)
                .map(col => (
                  <th
                    key={col.key}
                    className={`p-3 font-semibold text-on-surface-variant ${
                      col.numeric ? 'text-right' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.map((row, i) => (
              <tr 
                key={row.id || i} 
                className={`hover:bg-surface-variant transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns
                  .filter(col => col.hideOnTablet !== true)
                  .map(col => (
                    <td
                      key={col.key}
                      className={`p-3 text-on-surface ${
                        col.numeric ? 'text-right font-mono' : ''
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Desktop: Full table
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {columns.map(col => (
              <th
                key={col.key}
                className={`p-4 font-semibold text-on-surface-variant ${
                  col.numeric ? 'text-right' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {data.map((row, i) => (
            <tr 
              key={row.id || i} 
              className={`hover:bg-surface-variant transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`p-4 text-on-surface ${
                    col.numeric ? 'text-right font-mono' : ''
                  }`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
