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
}

export function LightTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay registros disponibles.',
}: LightTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-5 text-center bg-white rounded-xl">
        <p className="text-xs text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      {/* ========================================================================= */}
      {/* VISTA MÓVIL (< 768px): Tarjetas de Datos Táctiles (Mobile-First / Fitts Law) */}
      {/* ========================================================================= */}
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
              className={`bg-white rounded-xl p-3.5 space-y-2.5 transition-colors shadow-2xs ${
                onRowClick ? 'cursor-pointer active:bg-slate-50/90' : ''
              }`}
            >
              {/* Fila Primaria: Columna Principal + Estado/Acción Final */}
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

              {/* Fila Secundaria: Columnas Intermedias en Rejilla Compacta */}
              {middleCols.length > 0 && (
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  {middleCols.map((col) => (
                    <div key={col.key} className={`min-w-0 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                        {col.header}
                      </span>
                      <div className="mt-0.5 truncate text-slate-700 font-medium">
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

      {/* ========================================================================= */}
      {/* VISTA TABLET & DESKTOP (>= 768px): Tabla Compacta Enterprise Limpia */}
      {/* ========================================================================= */}
      <div className="hidden md:block w-full max-w-full min-w-0 overflow-x-auto rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3 sm:px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${
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
                  className={`group transition-colors duration-150 hover:bg-slate-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 sm:px-4 text-xs text-[#1D1D1F] align-middle ${
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
