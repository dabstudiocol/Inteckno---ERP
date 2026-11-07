import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Search, Sparkles, Settings } from 'lucide-react';
import { addCatalogItem, CatalogItem } from '../../core/services/moduleConfigService';

export interface CreatableSelectOption {
  id?: string;
  name?: string;
  value?: string;
  label?: string;
  code?: string;
  isActive?: boolean;
}

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (CreatableSelectOption | string)[];
  placeholder?: string;
  label?: string;
  moduleId?: string;
  catalogKey?: string;
  allowCustomText?: boolean;
  allowCreate?: boolean;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  isClearable?: boolean;
  onOpenConfig?: () => void;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar o escribir opción...',
  label,
  moduleId,
  catalogKey,
  allowCustomText = true,
  allowCreate,
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  helpText,
  isClearable = true,
  onOpenConfig,
}) => {
  const effectiveAllowCustomText = allowCreate !== undefined ? allowCreate : allowCustomText;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedNotice, setJustAddedNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalizar opciones
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { id: opt, name: opt, isActive: true };
      }
      const resolvedName = opt.name || opt.label || opt.value || opt.id || '';
      return {
        id: opt.id || opt.value || resolvedName,
        name: resolvedName,
        code: opt.code,
        isActive: opt.isActive !== false,
      };
    });
  }, [options]);

  // Sincronizar texto de búsqueda con valor seleccionado
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
    }
  }, [value, isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Opciones filtradas
  const filteredOptions = useMemo(() => {
    const query = (searchTerm || '').trim().toLowerCase();
    if (!query) return normalizedOptions.filter((o) => o.isActive !== false);

    return normalizedOptions.filter(
      (opt) =>
        opt.isActive !== false &&
        (opt.name.toLowerCase().includes(query) ||
          (opt.code && opt.code.toLowerCase().includes(query)))
    );
  }, [normalizedOptions, searchTerm]);

  // Verificar si el término actual coincide exactamente con una opción
  const exactMatch = useMemo(() => {
    const query = (searchTerm || '').trim().toLowerCase();
    if (!query) return null;
    return normalizedOptions.find(
      (opt) =>
        opt.name.toLowerCase() === query ||
        (opt.code && opt.code.toLowerCase() === query)
    );
  }, [normalizedOptions, searchTerm]);

  const handleSelectOption = (opt: { id: string; name: string; code?: string; isActive: boolean }) => {
    onChange(opt.name);
    setSearchTerm(opt.name);
    setIsOpen(false);
  };

  const handleUseCustomText = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setIsOpen(false);
  };

  const handleSaveToCatalog = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed || !moduleId || !catalogKey) {
      handleUseCustomText();
      return;
    }

    try {
      const created = addCatalogItem(moduleId, catalogKey, trimmed);
      onChange(created.name);
      setSearchTerm(created.name);
      setJustAddedNotice(`"${trimmed}" añadida al catálogo`);
      setTimeout(() => setJustAddedNotice(null), 3000);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      handleUseCustomText();
    }
  };

  const handleOpenModuleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenConfig) {
      onOpenConfig();
    } else if (moduleId) {
      window.dispatchEvent(
        new CustomEvent('inteckno:open-module-config', {
          detail: { moduleId, catalogKey },
        })
      );
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block font-bold text-gray-700 text-xs mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input de búsqueda / escritura interactiva */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : value || ''}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (effectiveAllowCustomText) {
              onChange(e.target.value);
            }
          }}
          onFocus={() => {
            setSearchTerm(value || '');
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full p-2.5 pr-14 rounded-2xl bg-[#E3EDF8] text-[#050C1A] text-xs font-bold focus:bg-[#CFE6FC] focus:outline-hidden transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
          } ${inputClassName}`}
        />

        <div className="absolute right-2 flex items-center gap-1 z-10">
          {(value || searchTerm) && !disabled && isClearable && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="Limpiar y ver todas las opciones"
              className="p-1 rounded-lg text-[#334155] hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setSearchTerm(value || '');
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded-lg text-[#0284C7] hover:text-white hover:bg-[#0284C7] transition-all duration-200 cursor-pointer"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {justAddedNotice && (
        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block animate-in fade-in">
          ✓ {justAddedNotice}
        </span>
      )}

      {helpText && !justAddedNotice && (
        <span className="text-[10px] text-gray-400 mt-0.5 block">{helpText}</span>
      )}

      {/* MENÚ DESPLEGABLE CON FILTRADO Y ESCRITURA LIBRE (Adaptable y Reactivo) */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#08172B] text-white rounded-2xl p-2 space-y-1 max-h-64 overflow-y-auto scrollbar-thin min-w-[260px] w-full sm:w-max max-w-md animate-in fade-in-50 zoom-in-95">
          {/* Indicador de escritura rápida */}
          {searchTerm.trim() && !exactMatch && effectiveAllowCustomText && (
            <div className="p-2 bg-[#0F2747] rounded-xl space-y-1.5">
              <button
                type="button"
                onClick={handleUseCustomText}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-cyan-300 hover:bg-[#0284C7] hover:text-white flex items-center justify-between transition-colors cursor-pointer gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">✍️ Usar:</span>
                  <span className="truncate italic font-black text-white">
                    "{searchTerm.trim()}"
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-white/15 text-cyan-200 rounded-full font-extrabold shrink-0">
                  Personalizado
                </span>
              </button>

              {moduleId && catalogKey && (
                <button
                  type="button"
                  onClick={handleSaveToCatalog}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} className="shrink-0" />
                  <span className="truncate">
                    Guardar y usar en catálogo
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Opciones disponibles */}
          {filteredOptions.length > 0 ? (
            <div className="space-y-1">
              {filteredOptions.map((opt) => {
                const isSelected =
                  value === opt.name ||
                  (opt.code && value === opt.code) ||
                  (opt.id && value === opt.id);

                return (
                  <button
                    key={opt.id || opt.name}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0284C7] text-white font-black'
                        : 'text-sky-100 hover:bg-[#132E52] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{opt.name}</span>
                      {opt.code && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-black/30 text-sky-300'
                          }`}
                        >
                          {opt.code}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-cyan-200" />}
                  </button>
                );
              })}
            </div>
          ) : !searchTerm.trim() ? (
            <div className="p-4 text-center text-xs text-sky-300/80 font-bold">
              No hay opciones configuradas.
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-sky-200 font-bold">
              <span>No coincide con opciones existentes.</span>
              <p className="text-[11px] text-sky-300/80 mt-1">
                Puedes seleccionarla arriba como valor personalizado o guardarla en el catálogo.
              </p>
            </div>
          )}

          {/* Fin de opciones */}
        </div>
      )}
    </div>
  );
};
