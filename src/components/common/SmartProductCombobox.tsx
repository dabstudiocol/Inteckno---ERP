import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Package, X, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { Product } from '../../types';
import { formatCOP } from '../../core/services/trmService';

export interface SmartProductSelection {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  estimatedCostCOP: number;
  stockCentral: number;
}

interface SmartProductComboboxProps {
  value: string;
  onSelectProduct: (product: SmartProductSelection) => void;
  onChangeText?: (rawText: string) => void;
  filterCategoryKeywords?: string[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SmartProductCombobox: React.FC<SmartProductComboboxProps> = ({
  value,
  onSelectProduct,
  onChangeText,
  filterCategoryKeywords,
  label,
  placeholder = 'Escribe 3 letras o SKU (ej. ROD, CABLE, TALADRO)...',
  disabled = false,
  className = '',
}) => {
  const { products = [] } = useErp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery(value || '');
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool: Product[] = products;

    if (filterCategoryKeywords && filterCategoryKeywords.length > 0) {
      const kwFiltered = products.filter((p) => {
        const text = `${p.category || ''} ${p.name || ''} ${p.sku || ''}`.toLowerCase();
        return filterCategoryKeywords.some((kw) => text.includes(kw.toLowerCase()));
      });
      if (kwFiltered.length > 0) pool = kwFiltered;
    }

    if (!q) {
      return pool.slice(0, 30);
    }

    return pool
      .filter(
        (p) =>
          (p.sku || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [products, query, filterCategoryKeywords]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    onChangeText?.('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>}
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChangeText?.(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-8 pr-14 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00668F] disabled:bg-slate-100"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar búsqueda"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
          {results.length === 0 ? (
            <li className="p-3 text-xs text-slate-400 text-center">
              Sin coincidencias en catálogo ({products.length} SKUs). Puedes continuar escribiendo libremente.
            </li>
          ) : (
            results.map((item) => {
              const stock = Number(item.availableStock ?? item.realStock ?? 0);
              const cost = Number(item.costPriceCOP || 0);
              return (
                <li
                  key={item.id || item.sku}
                  onClick={() => {
                    onSelectProduct({
                      id: item.id,
                      sku: item.sku,
                      name: item.name,
                      unit: item.unit || 'UNIDAD',
                      category: item.category || 'Repuesto STC',
                      estimatedCostCOP: cost,
                      stockCentral: stock,
                    });
                    setQuery(item.name);
                    setIsOpen(false);
                  }}
                  className="p-2.5 hover:bg-sky-50/80 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#003650] font-mono text-[10px]">
                        [{item.sku}]
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Unidad: <strong>{item.unit || 'UNID'}</strong> • Cat: {item.category || 'General'} • Costo Prom:{' '}
                      <strong>{formatCOP(cost)}</strong>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        stock > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {stock > 0 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      Stock: {stock}
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
