import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface LightTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptySubtitle?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export function LightTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay registros disponibles.',
  emptySubtitle,
  emptyAction,
}: LightTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-[#EBF2FA] rounded-3xl space-y-1.5">
        <p className="text-xs sm:text-sm text-[#050C1A] font-black">{emptyMessage}</p>
        {emptySubtitle && (
          <p className="text-xs text-[#334155] font-semibold max-w-sm mx-auto">{emptySubtitle}</p>
        )}
        {emptyAction && (
          <div className="pt-2.5">
            <button
              type="button"
              onClick={emptyAction.onClick}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#035388] hover:opacity-95 text-white text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{emptyAction.label}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      {/* VISTA MÓVIL (< 768px): Tarjetas de Datos Táctiles Curvas */}
      <div className="md:hidden space-y-2.5">
        {data.map((item) => {
          const key = keyExtractor(item);
          const firstCol = columns[0];
          const lastCol = columns.length > 1 ? columns[columns.length - 1] : null;
          const middleCols = columns.slice(1, lastCol ? columns.length - 1 : undefined);

          return (
            <div
              key={key}
              onClick={() => onRowClick && onRowClick(item)}
              className={`bg-[#EBF2FA] rounded-2xl p-4 space-y-2.5 transition-colors ${
                onRowClick ? 'cursor-pointer active:bg-[#DCE9F8]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  {firstCol.render ? firstCol.render(item) : (item as any)[firstCol.key]}
                </div>
                {lastCol && (
                  <div className={`shrink-0 ${lastCol.align === 'center' ? 'text-center' : lastCol.align === 'left' ? 'text-left' : 'text-right'}`}>
                    {lastCol.render ? lastCol.render(item) : (item as any)[lastCol.key]}
                  </div>
                )}
              </div>

              {middleCols.length > 0 && (
                <div className="pt-2 grid grid-cols-2 gap-2.5 text-xs">
                  {middleCols.map((col) => (
                    <div key={col.key} className={`min-w-0 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      <span className="text-[10px] text-[#334155] block font-black uppercase tracking-wider">
                        {col.header}
                      </span>
                      <div className="mt-0.5 truncate text-[#050C1A] font-bold">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VISTA TABLET & DESKTOP (>= 768px): Tabla Capsule Enterprise */}
      <div className="hidden md:block w-full max-w-full min-w-0 overflow-x-auto rounded-3xl bg-white overflow-hidden">
        <table className="w-full text-left min-w-full">
          <thead>
            <tr className="bg-[#DCE8F6]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-[11px] font-black text-[#07192F] uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const key = keyExtractor(item);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`group transition-colors duration-150 hover:bg-[#E0F2FE] ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-xs font-bold text-[#050C1A] align-middle ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
