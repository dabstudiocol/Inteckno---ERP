import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FolderKanban, X, ChevronDown, Percent } from 'lucide-react';
import { useErp, ensureProjectItems } from '../../core/storage/erpStore';
import { getProjectTaxRate } from '../../core/services/taxService';
import { formatCOP } from '../../core/services/trmService';

export interface SmartProjectItemOption {
  itemId: string;
  code: string;
  description: string;
  budgetPlanned: number;
  costCenter: string;
  countryName: string;
  taxRate: number;
  taxLabel: string;
}

interface SmartProjectItemSelectProps {
  projectId: string;
  value: string;
  onChange: (itemCode: string, meta: SmartProjectItemOption | null) => void;
  includeIndirectOption?: boolean;
  showTaxAndCostCenterBadge?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SmartProjectItemSelect: React.FC<SmartProjectItemSelectProps> = ({
  projectId,
  value,
  onChange,
  includeIndirectOption = true,
  showTaxAndCostCenterBadge = true,
  label,
  placeholder = 'Seleccionar carpeta contractual (ej. ITEM 01)...',
  disabled = false,
  className = '',
}) => {
  const { projects = [] } = useErp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(() => {
    if (!projectId) return projects[0] || null;
    return (
      projects.find(
        (p) =>
          p.id === projectId ||
          p.code === projectId ||
          `${p.code} — ${p.name}` === projectId ||
          p.name === projectId
      ) || null
    );
  }, [projects, projectId]);

  const items = useMemo<SmartProjectItemOption[]>(() => {
    if (!selectedProject) return [];
    const tax = getProjectTaxRate((selectedProject as any).clientCountry || selectedProject.location || 'Colombia');
    const costCenter = selectedProject.costCenter || selectedProject.code;
    const rawItems = ensureProjectItems(selectedProject);

    const mapped: SmartProjectItemOption[] = rawItems.map((it: any) => ({
      itemId: it.id || it.code,
      code: it.code,
      description: it.name || 'Alcance Contractual',
      budgetPlanned: Number(it.budgetPlanned || 0),
      costCenter,
      countryName: tax.countryName,
      taxRate: tax.rate,
      taxLabel: tax.label,
    }));

    if (includeIndirectOption) {
      mapped.push({
        itemId: 'INDIRECTO',
        code: 'INDIRECTO',
        description: '[ Insumos y Costos Generales del Proyecto ]',
        budgetPlanned: 0,
        costCenter,
        countryName: tax.countryName,
        taxRate: tax.rate,
        taxLabel: tax.label,
      });
    }

    return mapped;
  }, [selectedProject, includeIndirectOption]);

  const currentSelected = useMemo(() => {
    if (!value) return null;
    return (
      items.find(
        (i) =>
          i.code === value ||
          i.itemId === value ||
          `${i.code} — ${i.description}` === value
      ) || null
    );
  }, [items, value]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(currentSelected ? `${currentSelected.code} — ${currentSelected.description}` : value || '');
    }
  }, [currentSelected, value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || (currentSelected && searchTerm === `${currentSelected.code} — ${currentSelected.description}`)) {
      return items;
    }
    return items.filter(
      (i) => i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }, [items, searchTerm, currentSelected]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('', null);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>}
      <div className="relative flex items-center">
        <FolderKanban className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled || !selectedProject}
          value={searchTerm}
          onFocus={() => {
            setIsOpen(true);
            if (currentSelected) setSearchTerm('');
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          placeholder={selectedProject ? placeholder : 'Selecciona primero un Proyecto STC...'}
          className="w-full pl-8 pr-14 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00668F] disabled:bg-slate-100"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {(searchTerm || value) && !disabled && selectedProject && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar ítem contractual"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled || !selectedProject}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {showTaxAndCostCenterBadge && currentSelected && (
        <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-sky-50/70 border border-sky-200/70 flex items-center justify-between text-[10px] text-slate-600">
          <span>
            C. Costos: <strong className="text-[#003650]">{currentSelected.costCenter}</strong>
          </span>
          <span className="flex items-center gap-1 font-bold text-[#00668F]">
            <Percent size={10} />
            IVA {currentSelected.countryName}: {currentSelected.taxLabel}
          </span>
        </div>
      )}

      {isOpen && !disabled && selectedProject && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
          {filtered.map((it) => (
            <button
              key={it.itemId}
              type="button"
              onClick={() => {
                onChange(it.code, it);
                setSearchTerm(`${it.code} — ${it.description}`);
                setIsOpen(false);
              }}
              className="w-full p-2.5 text-left hover:bg-sky-50/80 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">
                  <span className="text-[#00668F]">{it.code}</span> — {it.description}
                </div>
                <div className="text-[10px] text-slate-500">
                  Centro de Costo: {it.costCenter} • Impuesto ({it.countryName}): {it.taxLabel}
                </div>
              </div>
              {it.budgetPlanned > 0 && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {formatCOP(it.budgetPlanned)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
