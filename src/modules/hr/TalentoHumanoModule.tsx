import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Palmtree,
  ClipboardList,
  Coins,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Pencil,
  Settings,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { EmployeeRecord } from '../../types';
import { AiDocumentUploader } from '../../components/ui/AiDocumentUploader';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';

interface TalentoHumanoProps {
  initialTab?: 'empleados' | 'vacaciones' | 'encuestas' | 'nomina';
}

export const TalentoHumanoModule: React.FC<TalentoHumanoProps> = ({ initialTab = 'empleados' }) => {
  const { employees, createEmployee, updateEmployee, timesheets, expenses, activeModuleId } = useErp();

  const currentTab = (activeModuleId === 'vacaciones' || activeModuleId === 'encuestas' || activeModuleId === 'nomina' || activeModuleId === 'empleados')
    ? (activeModuleId as 'empleados' | 'vacaciones' | 'encuestas' | 'nomina')
    : initialTab;

  const [activeTab, setActiveTab] = useState<'empleados' | 'vacaciones' | 'encuestas' | 'nomina'>(currentTab);
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogDepartments = useModuleCatalog('empleados', 'departments');
  const catalogRoles = useModuleCatalog('empleados', 'roles');
  const catalogLeaveTypes = useModuleCatalog('empleados', 'leaveTypes');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (activeModuleId && ['empleados', 'vacaciones', 'encuestas', 'nomina'].includes(activeModuleId)) {
      setActiveTab(activeModuleId as any);
    }
  }, [initialTab, activeModuleId]);

  // Formulario nuevo empleado
  const [empForm, setEmpForm] = useState({
    name: '',
    documentId: '',
    role: '',
    department: '',
    hireDate: '',
    baseSalaryCOP: 0,
    heightCertExpiry: '',
    medicalExamExpiry: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.documentId) return;
    createEmployee({
      ...empForm,
      heightCertStatus: 'vigente',
      medicalExamStatus: 'vigente',
      vacationDaysAvailable: 15,
    });
    setIsNewEmpModalOpen(false);
    setEmpForm({
      name: '',
      documentId: '',
      role: '',
      department: '',
      hireDate: '',
      baseSalaryCOP: 0,
      heightCertExpiry: '',
      medicalExamExpiry: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  return (
    <div className="space-y-6">

      {/* 1. PERSONAL TÉCNICO Y CERTIFICACIONES */}
      {activeTab === 'empleados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Directorio de Ingenieros y Cuadrillas STC</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewEmpModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00668F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#005273] cursor-pointer"
              >
                <Plus size={15} />
                Registrar Empleado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{emp.name}</h4>
                    <p className="text-xs text-[#00668F] font-semibold">{emp.role}</p>
                    <p className="text-[11px] text-gray-400">{emp.documentId} • {emp.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      title="Editar Datos y Certificados"
                      className="p-1 rounded-lg text-gray-400 hover:text-[#00668F] hover:bg-sky-50 transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* Semáforo de Certificaciones Críticas para Trabajos en Pilonas */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[10px] text-gray-500 block font-medium">Curso Alturas (Avanzado)</span>
                    <div className="flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                      <ShieldCheck size={14} />
                      <span>Vigente ({emp.heightCertExpiry})</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[10px] text-gray-500 block font-medium">Examen Médico Ocupacional</span>
                    <div className="flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                      <CheckCircle2 size={14} />
                      <span>Apto ({emp.medicalExamExpiry})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Días de Vacaciones: <strong className="text-gray-900">{emp.vacationDaysAvailable} días</strong></span>
                  <span>Emergencia: <strong className="text-gray-700">{emp.emergencyPhone}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. VACACIONES */}
      {activeTab === 'vacaciones' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl mx-auto space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Solicitud y Balance de Días de Descanso</h3>
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="p-3.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900">{emp.name}</div>
                  <div className="text-[11px] text-gray-500">{emp.role}</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-xs font-bold text-[#00668F]">{emp.vacationDaysAvailable} días disponibles</span>
                  <button
                    onClick={() => {
                      const days = prompt(`¿Cuántos días de vacaciones solicita ${emp.name}? (Disponibles: ${emp.vacationDaysAvailable})`, '5');
                      if (days && Number(days) > 0) {
                        const num = Number(days);
                        if (num <= emp.vacationDaysAvailable) {
                          updateEmployee(emp.id, { vacationDaysAvailable: emp.vacationDaysAvailable - num });
                          alert(`Solicitud aprobada: se descontaron ${num} días.`);
                        } else {
                          alert(`No cuenta con suficientes días (Máximo: ${emp.vacationDaysAvailable})`);
                        }
                      }
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-sky-50 text-[#00668F] border border-sky-200 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Solicitar Período
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CHECKLIST SST PRE-TURNO */}
      {activeTab === 'encuestas' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Inspección Pre-Operacional de Alturas STC</h3>
              <p className="text-xs text-gray-500">Comprobación obligatoria antes del ascenso a pilonas y cabezales</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              Protocolo SST-04
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              'Verificación visual de arnés de cuerpo entero (sin cortes ni costuras reventadas)',
              'Comprobación de eslinga de posicionamiento y absorbedor de impacto',
              'Casco con barbuquejo de 3 puntos y protección dieléctrica',
              'Inspección de línea de vida vertical de acero en pilona',
              'Prueba de comunicación por radio VHF con operador de estación',
              'Verificación climática (Viento < 50 km/h y sin tormenta eléctrica)',
            ].map((item, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-gray-200 cursor-pointer hover:bg-slate-100/70">
                <input type="checkbox" className="w-4 h-4 text-[#00668F] rounded-md" />
                <span className="text-gray-800 font-medium">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. NÓMINA DE CAMPO */}
      {activeTab === 'nomina' && (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl w-full max-w-full min-w-0 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Liquidación Preliminar de Horas de Campo</h3>
          <p className="text-xs text-gray-500">Cálculo con base en las horas reportadas en el módulo de Registro de Horas</p>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Salario Base</th>
                  <th className="p-3">Horas Campo Validadas</th>
                  <th className="p-3">Viáticos Acumulados</th>
                  <th className="p-3 text-right">Total a Liquidar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  // Conexión real con horas aprobadas en Timesheet
                  const empTimesheets = timesheets.filter(
                    (t) =>
                      t.userId === emp.id ||
                      t.userName.toLowerCase() === emp.name.toLowerCase() ||
                      t.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())
                  );
                  const totalHours = empTimesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

                  // Conexión real con viáticos aprobados en el módulo de Gastos
                  const empExpenses = expenses.filter(
                    (e) =>
                      (e.userId === emp.id ||
                        e.userName.toLowerCase() === emp.name.toLowerCase() ||
                        e.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())) &&
                      (e.status === 'approved' || e.status === 'legalized')
                  );
                  const totalViaticosCOP = empExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                  const totalLiquidarCOP = (emp.baseSalaryCOP || 0) + totalViaticosCOP;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-gray-900">{emp.name}</td>
                      <td className="p-3 text-gray-600">{emp.role}</td>
                      <td className="p-3 font-semibold text-gray-900">${(emp.baseSalaryCOP || 0).toLocaleString()} COP</td>
                      <td className="p-3 font-bold text-[#00668F]">{totalHours} horas</td>
                      <td className="p-3 text-gray-600">${totalViaticosCOP.toLocaleString()} COP</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ${totalLiquidarCOP.toLocaleString()} COP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO EMPLEADO */}
      {isNewEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <UserCheck size={18} className="text-[#00668F]" />
                Registrar Técnico / Ingeniero
              </div>
              <div className="flex items-center gap-2">
                <AiDocumentUploader
                  docType="cedula_sst"
                  onExtracted={(extracted) => {
                    setEmpForm((prev) => ({
                      ...prev,
                      name: extracted.name || prev.name,
                      documentId: extracted.documentId || prev.documentId,
                      role: extracted.role || prev.role,
                      heightCertExpiry: extracted.heightCertExpiry || prev.heightCertExpiry,
                      medicalExamExpiry: extracted.medicalExamExpiry || prev.medicalExamExpiry,
                      emergencyContact: extracted.emergencyContact || prev.emergencyContact,
                      emergencyPhone: extracted.emergencyPhone || prev.emergencyPhone,
                    }));
                  }}
                  title="Escanear Cédula o Certificado Alturas SST"
                  description="La IA extrae automáticamente los datos del colaborador y vigencias de curso de alturas."
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Configurar departamentos y cargos"
                  >
                    <Settings size={13} className="text-[#00668F]" />
                    <span>Configuración</span>
                  </button>
                  <button onClick={() => setIsNewEmpModalOpen(false)} className="text-gray-400 text-lg font-bold">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateEmp} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Jonathan Guzmán Pineda"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cédula / Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="CC 1.036.789.000"
                    value={empForm.documentId}
                    onChange={(e) => setEmpForm({ ...empForm, documentId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <CreatableSelect
                    label="Cargo Técnico"
                    required
                    value={empForm.role}
                    onChange={(val) => setEmpForm({ ...empForm, role: val })}
                    options={catalogRoles.map((r) => ({ id: r.id, name: r.name }))}
                    moduleId="empleados"
                    catalogKey="roles"
                    placeholder="Seleccionar o escribir cargo..."
                    allowCustomText={true}
                  />
                </div>
              </div>

              <div>
                <CreatableSelect
                  label="Departamento / Área"
                  required
                  value={empForm.department}
                  onChange={(val) => setEmpForm({ ...empForm, department: val })}
                  options={catalogDepartments.map((d) => ({
                    id: d.id,
                    name: d.name,
                    code: d.code,
                  }))}
                  moduleId="empleados"
                  catalogKey="departments"
                  placeholder="Seleccionar o escribir departamento..."
                  allowCustomText={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vence Curso Alturas</label>
                  <input
                    type="date"
                    value={empForm.heightCertExpiry}
                    onChange={(e) => setEmpForm({ ...empForm, heightCertExpiry: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vence Examen Médico</label>
                  <input
                    type="date"
                    value={empForm.medicalExamExpiry}
                    onChange={(e) => setEmpForm({ ...empForm, medicalExamExpiry: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273]"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR EMPLEADO */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 shrink-0 bg-slate-50/60">
              <div>
                <span className="text-[10px] font-bold text-[#00668F] uppercase tracking-wider block">
                  Talento Humano & SST • {editingEmployee.documentId}
                </span>
                <h3 className="text-base font-bold text-gray-900">Editar Ficha de Empleado</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configurar departamentos y cargos"
                >
                  <Settings size={13} className="text-[#00668F]" />
                  <span>Configuración</span>
                </button>
                <button
                  onClick={() => setEditingEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Desplazable */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateEmployee(editingEmployee.id, editingEmployee);
                setEditingEmployee(null);
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <CreatableSelect
                      label="Cargo / Especialidad"
                      required
                      value={editingEmployee.role}
                      onChange={(val) => setEditingEmployee({ ...editingEmployee, role: val })}
                      options={catalogRoles.map((r) => ({ id: r.id, name: r.name }))}
                      moduleId="empleados"
                      catalogKey="roles"
                      placeholder="Seleccionar o escribir cargo..."
                      allowCustomText={true}
                    />
                  </div>
                  <div>
                    <CreatableSelect
                      label="Departamento / Área"
                      required
                      value={editingEmployee.department}
                      onChange={(val) => setEditingEmployee({ ...editingEmployee, department: val })}
                      options={catalogDepartments.map((d) => ({
                        id: d.id,
                        name: d.name,
                        code: d.code,
                      }))}
                      moduleId="empleados"
                      catalogKey="departments"
                      placeholder="Seleccionar o escribir departamento..."
                      allowCustomText={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Salario Base (COP)</label>
                    <input
                      type="number"
                      min={1000000}
                      value={editingEmployee.baseSalaryCOP}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalaryCOP: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Días de Vacaciones Disponibles</label>
                    <input
                      type="number"
                      min={0}
                      value={editingEmployee.vacationDaysAvailable}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, vacationDaysAvailable: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>

                {/* Control de Certificaciones SST */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Vigencia de Certificaciones Obligatorias SST</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Curso de Alturas (Vence)</label>
                      <input
                        type="date"
                        value={editingEmployee.heightCertExpiry}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, heightCertExpiry: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Examen Médico (Vence)</label>
                      <input
                        type="date"
                        value={editingEmployee.medicalExamExpiry}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, medicalExamExpiry: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contacto de Emergencia</label>
                    <input
                      type="text"
                      value={editingEmployee.emergencyContact}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyContact: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Emergencia</label>
                    <input
                      type="text"
                      value={editingEmployee.emergencyPhone}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyPhone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>
              </div>

              {/* Pie Fijo Siempre Visible */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración de Talento Humano */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="empleados"
        moduleTitle="Talento Humano & Personal Técnico"
      />
    </div>
  );
};
