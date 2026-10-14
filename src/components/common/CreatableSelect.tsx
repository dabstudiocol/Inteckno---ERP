import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Search, Sparkles, Settings } from 'lucide-react';
import { addCatalogItem, CatalogItem } from '../../core/services/moduleConfigService';

export interface CreatableSelectOption {
  id?: string;
  name: string;
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
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
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
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  helpText,
  onOpenConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedNotice, setJustAddedNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalizar opciones
  const normalizedOptions: CreatableSelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { id: opt, name: opt, isActive: true };
      }
      return {
        id: opt.id || opt.name,
        name: opt.name,
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

  const handleSelectOption = (opt: CreatableSelectOption) => {
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
        <div className="flex items-center justify-between mb-1 min-h-[22px] gap-1.5">
          <label className="font-bold text-gray-700 text-xs flex items-center gap-1 min-w-0">
            <span className="truncate whitespace-nowrap">{label}</span>
            {required && <span className="text-rose-500 shrink-0">*</span>}
          </label>
          {(moduleId || onOpenConfig) && (
            <button
              type="button"
              onClick={handleOpenModuleConfig}
              title="Configurar opciones desplegables de este campo"
              className="text-[11px] font-semibold text-[#00668F] hover:text-[#005073] flex items-center gap-1 hover:underline cursor-pointer shrink-0"
            >
              <Settings size={12} className="shrink-0" />
              <span className="hidden sm:inline">Configurar</span>
            </button>
          )}
        </div>
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
            if (allowCustomText) {
              onChange(e.target.value);
            }
          }}
          onFocus={() => {
            setSearchTerm(value || '');
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full p-2.5 pr-14 rounded-xl bg-slate-100 text-gray-800 text-xs font-medium focus:bg-white focus:outline-hidden transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
          } ${inputClassName}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              title="Limpiar"
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-slate-200/60 transition-colors"
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
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-slate-200/60 transition-transform duration-200"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00668F]' : ''}`}
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
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl p-1.5 space-y-1 max-h-64 overflow-y-auto scrollbar-thin shadow-xl border border-slate-200 min-w-[260px] w-full sm:w-max max-w-md animate-in fade-in-50 zoom-in-95">
          {/* Indicador de escritura rápida */}
          {searchTerm.trim() && !exactMatch && allowCustomText && (
            <div className="p-2 bg-sky-50 rounded-xl space-y-1.5 border border-sky-100">
              <button
                type="button"
                onClick={handleUseCustomText}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#00668F] hover:bg-sky-100 flex items-center justify-between transition-colors cursor-pointer gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">✍️ Usar:</span>
                  <span className="truncate italic font-extrabold text-gray-900">
                    "{searchTerm.trim()}"
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-white text-[#00668F] rounded-md shadow-2xs font-semibold shrink-0">
                  Personalizado
                </span>
              </button>

              {moduleId && catalogKey && (
                <button
                  type="button"
                  onClick={handleSaveToCatalog}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Guardar y usar en catálogo
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Opciones disponibles */}
          {filteredOptions.length > 0 ? (
            <div className="space-y-0.5">
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00668F] text-white font-bold shadow-2xs'
                        : 'text-gray-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{opt.name}</span>
                      {opt.code && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          {opt.code}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : !searchTerm.trim() ? (
            <div className="p-4 text-center text-xs text-gray-400">
              No hay opciones configuradas.
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-gray-500">
              <span>No coincide con opciones existentes.</span>
              <p className="text-[11px] text-gray-400 mt-1">
                Puedes seleccionarla arriba como valor personalizado o guardarla en el catálogo.
              </p>
            </div>
          )}

          {/* Pie de lista con acceso a configuración */}
          {(moduleId || onOpenConfig) && (
            <div className="pt-1 mt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenModuleConfig}
                className="w-full px-2.5 py-1.5 text-center text-[11px] font-semibold text-[#00668F] hover:bg-sky-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings size={12} />
                <span>Administrar todas las opciones en Configuración</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
