import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ShieldCheck, AlertTriangle, Lock, X, ChevronDown, UserCheck } from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { formatCOP } from '../../core/services/trmService';
import { useLaborRates, calculateCustomizableHourlyRate } from '../../core/services/moduleConfigService';

export interface SmartEmployeeOption {
  employeeId: string;
  userId?: string;
  name: string;
  jobTitle: string;
  department: string;
  avatar: string;
  avatarColor: string;
  baseSalaryCOP: number;
  monthlyCompanyCostCOP: number;
  hourlyRateCOP: number;
  hseqStatus: 'valid' | 'expired' | 'pending';
  hseqExpiresAt: string;
  canWorkHeights: boolean;
}

interface SmartEmployeeSelectProps {
  value: string;
  onChange: (employeeId: string, employeeObj: SmartEmployeeOption | null) => void;
  isHeightTask?: boolean;
  requiredCompetencyId?: string; // Eje 6: Validación de competencia técnica de catálogo (ej. SKILL-005)
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showHourlyCostBadge?: boolean;
  className?: string;
}

export const SmartEmployeeSelect: React.FC<SmartEmployeeSelectProps> = ({
  value,
  onChange,
  isHeightTask = false,
  requiredCompetencyId,
  label,
  placeholder = 'Buscar y seleccionar empleado...',
  disabled = false,
  showHourlyCostBadge = false,
  className = '',
}) => {
  const { employees = [], users = [] } = useErp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [laborRates] = useLaborRates();
  const factor = laborRates.factorPrestacional || 1.0;
  const divisor = laborRates.divisorMensual || 210;
  const todayIso = new Date().toISOString().slice(0, 10);

  const mergedEmployees = useMemo<SmartEmployeeOption[]>(() => {
    const map = new Map<string, SmartEmployeeOption>();

    for (const emp of employees) {
      const matchedUser = users.find(
        (u) => u.id === emp.id || u.id === emp.userId || u.employeeId === emp.id || u.email === emp.email || u.name === emp.name
      );
      const expiry = emp.heightCertExpiry || matchedUser?.hseqExpiresAt || '2027-12-31';
      const isExpired =
        emp.heightCertStatus === 'vencido' ||
        matchedUser?.hseqStatus === 'expired' ||
        expiry < todayIso;
      const baseSal = Number(emp.baseSalaryCOP || emp.monthlyBaseSalary || 0);
      const empFactor = emp.customFactorPrestacional && emp.customFactorPrestacional > 0 ? emp.customFactorPrestacional : factor;
      const companyCost = Math.round(baseSal * empFactor);
      const hourly = calculateCustomizableHourlyRate(emp, laborRates);
      const initials = (emp.name || 'IT')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('');

      map.set(emp.id, {
        employeeId: emp.employeeId || emp.id,
        userId: matchedUser?.id || emp.userId || emp.id,
        name: emp.name,
        jobTitle: emp.role || emp.position || matchedUser?.roleLabel || 'Especialista STC',
        department: emp.department || matchedUser?.department || 'Operaciones STC',
        avatar: matchedUser?.avatar || initials,
        avatarColor: matchedUser?.avatarColor || '#00668F',
        baseSalaryCOP: baseSal,
        monthlyCompanyCostCOP: companyCost,
        hourlyRateCOP: hourly,
        hseqStatus: isExpired ? 'expired' : 'valid',
        hseqExpiresAt: expiry,
        canWorkHeights: isExpired ? false : Boolean(matchedUser?.canWorkHeights ?? true),
      });
    }

    for (const u of users) {
      if (map.has(u.id) || (u.employeeId && map.has(u.employeeId))) continue;
      const expiry = u.hseqExpiresAt || '2027-12-31';
      const isExpired = u.hseqStatus === 'expired' || expiry < todayIso;
      const roleStr = String(u.role || '').toLowerCase();
      const defaultSal = roleStr.includes('gerente')
        ? 6500000
        : roleStr.includes('lider')
        ? 4800000
        : roleStr.includes('ingeniero') || roleStr.includes('coord')
        ? 3800000
        : 3100000;
      const companyCost = Math.round(defaultSal * factor);
      const hourly = Math.round(companyCost / divisor);

      map.set(u.id, {
        employeeId: u.employeeId || `EMP-${u.id}`,
        userId: u.id,
        name: u.name,
        jobTitle: u.roleLabel || u.role,
        department: u.department || 'Operaciones STC',
        avatar: u.avatar || u.name.slice(0, 2).toUpperCase(),
        avatarColor: u.avatarColor || '#00668F',
        baseSalaryCOP: defaultSal,
        monthlyCompanyCostCOP: companyCost,
        hourlyRateCOP: hourly,
        hseqStatus: isExpired ? 'expired' : 'valid',
        hseqExpiresAt: expiry,
        canWorkHeights: isExpired ? false : Boolean(u.canWorkHeights),
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, users, laborRates, factor, divisor, todayIso]);

  const selectedEmployee = useMemo(() => {
    if (!value) return null;
    return (
      mergedEmployees.find(
        (e) => e.employeeId === value || e.userId === value || e.name.toLowerCase() === value.toLowerCase()
      ) || null
    );
  }, [mergedEmployees, value]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.jobTitle})` : value || '');
    }
  }, [selectedEmployee, value, isOpen]);

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
    let pool = mergedEmployees;

    // Filtro por competencia técnica requerida (Eje 6: Cruce con catálogo de competencias)
    if (requiredCompetencyId) {
      const targetReq = requiredCompetencyId.trim().toLowerCase();
      pool = pool.filter((emp) => {
        const linkedUser = users.find((u) => u.id === emp.userId || u.name.toLowerCase() === emp.name.toLowerCase());
        const linkedEmp = employees.find((e) => e.id === emp.employeeId || e.name.toLowerCase() === emp.name.toLowerCase());
        const cIds = [
          ...(linkedUser?.competencyIds || []),
          ...(linkedUser?.competencies || []),
          ...(linkedEmp?.competencyIds || [])
        ].map((c) => String(c).toLowerCase());
        return cIds.some((c) => c === targetReq || c.includes(targetReq));
      });
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q || (selectedEmployee && searchTerm === `${selectedEmployee.name} (${selectedEmployee.jobTitle})`)) {
      return pool;
    }
    return pool.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q)
    );
  }, [mergedEmployees, searchTerm, selectedEmployee, requiredCompetencyId, users, employees]);

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
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onFocus={() => {
            setIsOpen(true);
            if (selectedEmployee) setSearchTerm('');
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-3 pr-14 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00668F] disabled:bg-slate-100"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {(searchTerm || value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar selección"
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

      {showHourlyCostBadge && selectedEmployee && (
        <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 flex items-center gap-1 font-medium">
            <Lock size={11} className="text-[#00668F]" />
            Tarifa Hora Ley 2101 (Solo Lectura):
          </span>
          <span className="font-extrabold text-[#00668F]">
            {formatCOP(selectedEmployee.hourlyRateCOP)}/h
          </span>
        </div>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">
              No se encontraron empleados coincidentes.
            </div>
          ) : (
            filtered.map((emp) => {
              const isBlockedByHseq = isHeightTask && emp.hseqStatus !== 'valid';
              return (
                <button
                  key={emp.employeeId}
                  type="button"
                  disabled={isBlockedByHseq}
                  onClick={() => {
                    if (isBlockedByHseq) return;
                    onChange(emp.employeeId, emp);
                    setSearchTerm(`${emp.name} (${emp.jobTitle})`);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                    isBlockedByHseq
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'hover:bg-sky-50/70 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: isBlockedByHseq ? '#94a3b8' : emp.avatarColor }}
                    >
                      {emp.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{emp.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">({emp.employeeId})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {emp.jobTitle} • {formatCOP(emp.hourlyRateCOP)}/h
                      </div>
                      {isBlockedByHseq && (
                        <div className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={11} />
                          <span>[BLOQUEADO: Certificación Res. 4272/2021 Vencida ({emp.hseqExpiresAt})]</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {emp.hseqStatus === 'valid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck size={11} />
                        HSEQ Vigente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle size={11} />
                        Vencido
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
