import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Plus,
  DollarSign,
  Calendar,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';
import { DianPayrollDocument } from '../../../types';
import { DianPayrollService } from '../../hr/services/dianPayrollService';
import { LightTable } from '../../../components/ui/LightTable';

export const DianPayrollManager: React.FC = () => {
  const [payrollRecords, setPayrollRecords] = useState<DianPayrollDocument[]>(() =>
    DianPayrollService.getPayrollRecords()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo comprobante de nómina
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDocumentNumber, setEmployeeDocumentNumber] = useState('');
  const [basicSalary, setBasicSalary] = useState(3500000);
  const [overtime, setOvertime] = useState(250000);
  const [periodMonth, setPeriodMonth] = useState('2026-03');

  // Cálculos dinámicos
  const appliesTransport = basicSalary <= 2 * 1423500;
  const transportAllowance = appliesTransport ? 162000 : 0;
  const healthDeduction = Math.round((basicSalary + overtime) * 0.04);
  const pensionDeduction = Math.round((basicSalary + overtime) * 0.04);
  const totalDevengado = basicSalary + transportAllowance + overtime;
  const totalDeducciones = healthDeduction + pensionDeduction;
  const netPay = totalDevengado - totalDeducciones;

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !employeeDocumentNumber) return;

    DianPayrollService.transmitPayroll({
      periodMonth,
      employeeName,
      employeeDocumentNumber,
      basicSalary,
      transportAllowance,
      overtimeAndBonuses: overtime,
      healthDeduction,
      pensionDeduction,
      otherDeductions: 0,
    });

    setPayrollRecords(DianPayrollService.getPayrollRecords());
    setIsModalOpen(false);
    setEmployeeName('');
    setEmployeeDocumentNumber('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner Nómina Electrónica Res. 000013/2021 */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-emerald-700 shrink-0" />
          <div>
            <strong className="block font-bold">
              Documento Soporte de Pago de Nómina Electrónica (Resolución DIAN 000013/2021):
            </strong>
            <span>
              Transmisión obligatoria dentro de los primeros 10 días del mes siguiente. Genera CUNE y constituye
              el único soporte válido para deducción de costos laborales y parafiscales en Renta.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Transmitir Nómina Electrónica (DNE)</span>
        </button>
      </div>

      {/* Tabla de Nómina Electrónica */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Comprobantes de Nómina Electrónica Transmitidos
            </h3>
            <p className="text-xs text-gray-400">
              Validación individual por empleado con devengados, deducciones y CUNE
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Comprobantes Validados: {payrollRecords.length}
          </div>
        </div>

        <LightTable
          data={payrollRecords}
          keyExtractor={(r) => r.id}
          columns={[
            {
              key: 'employee',
              header: 'Colaborador',
              render: (r) => (
                <div>
                  <div className="font-extrabold text-gray-900 text-xs">{r.employeeName}</div>
                  <div className="text-[10px] text-slate-400">
                    CC {r.employeeDocument} | {r.prefix}-{r.consecutive}
                  </div>
                </div>
              ),
            },
            {
              key: 'period',
              header: 'Periodo Liquidado',
              render: (r) => (
                <div className="text-xs">
                  <div className="font-bold text-[#00668F]">{r.periodStart} a {r.periodEnd}</div>
                  <div className="text-[11px] text-gray-400">Liquidación: {r.settlementDate}</div>
                </div>
              ),
            },
            {
              key: 'devengados',
              header: 'Devengados',
              render: (r) => (
                <div className="text-xs">
                  <div className="font-bold text-gray-800">
                    ${r.totalAccrued.toLocaleString('es-CO')}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Básico: ${r.basicSalary.toLocaleString('es-CO')}
                  </div>
                  {r.transportAllowance > 0 && (
                    <div className="text-[10px] text-emerald-600">
                      + Aux. Transp: ${r.transportAllowance.toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'deducciones',
              header: 'Deducciones SS',
              render: (r) => (
                <div className="text-xs">
                  <div className="font-bold text-rose-600">
                    -${r.totalDeductions.toLocaleString('es-CO')}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Salud 4%: -${r.healthDeduction.toLocaleString('es-CO')}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Pensión 4%: -${r.pensionDeduction.toLocaleString('es-CO')}
                  </div>
                </div>
              ),
            },
            {
              key: 'net',
              header: 'Neto a Pagar',
              render: (r) => (
                <div className="font-black text-emerald-700 text-xs">
                  ${r.netPaid.toLocaleString('es-CO')}
                </div>
              ),
            },
            {
              key: 'cune',
              header: 'CUNE & Validación DIAN',
              render: (r) => (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} /> {r.dianStatus.toUpperCase()}
                  </span>
                  <div
                    className="text-[9px] font-mono text-gray-400 truncate max-w-[130px]"
                    title={`CUNE: ${r.cune}`}
                  >
                    CUNE: {r.cune.slice(0, 16)}...
                  </div>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Deseas eliminar el comprobante de nómina ${r.prefix}-${r.consecutive}?`)) {
                      const updated = DianPayrollService.deletePayrollRecord(r.id);
                      setPayrollRecords(updated);
                    }
                  }}
                  title="Eliminar comprobante"
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              ),
            },
          ]}
        />
      </div>

      {/* Modal Transmisión de Nómina */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Users size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Transmitir Nómina Electrónica Individual
                  </h3>
                  <p className="text-xs text-gray-500">Cálculo legal automático con CUNE SHA-384</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0 aspect-square cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Periodo Liquidado</label>
                  <input
                    type="month"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cédula del Colaborador</label>
                  <input
                    type="text"
                    required
                    value={employeeDocumentNumber}
                    onChange={(e) => setEmployeeDocumentNumber(e.target.value)}
                    placeholder="Ej. 1017892345"
                    className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombres y Apellidos</label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Ej. Andrés Felipe Lopera Castro"
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Salario Básico (COP)</label>
                  <input
                    type="number"
                    min="1423500"
                    step="10000"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horas Extras / Bonificaciones</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={overtime}
                    onChange={(e) => setOvertime(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Previsualización del Desglose Legal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Devengado Total:</span>
                  <span className="font-bold">${totalDevengado.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-rose-600 text-[11px]">
                  <span>Salud (4%) + Pensión (4%):</span>
                  <span>-${totalDeducciones.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between font-extrabold text-emerald-800 border-t border-slate-200 pt-1 text-sm">
                  <span>Neto Liquidado a Pagar:</span>
                  <span>${netPay.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Transmitir Nómina a DIAN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
