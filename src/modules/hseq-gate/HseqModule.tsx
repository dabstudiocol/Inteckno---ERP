import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  UserCheck,
  Award,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { LightTable } from '../../components/ui/LightTable';

export const HseqModule: React.FC = () => {
  const { users, projects, assignTechnician, currentUser } = useErp();

  const technicians = users.filter((u) => u.role === 'tecnico_stc' || u.role === 'supervisor_tecnico');

  const handleTestAssignment = (userId: string, userName: string) => {
    assignTechnician(projects[0]?.id, userId);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Banner de Política de Cero Tolerancia HSEQ (Manual 2.3) */}
      <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-900">
        <div className="flex items-center gap-2.5">
          <ShieldAlert size={18} className="text-rose-600 shrink-0" />
          <div>
            <strong className="block font-bold">Compuerta HSEQ / SST (Procedimiento 2.3):</strong>
            <span>Ningún técnico operativo puede ser asignado a campo ni iniciar labores en alturas sin certificado digital de liberación HSEQ vigente (ARL, EPS y curso de alturas certificado).</span>
          </div>
        </div>
        <div className="px-2.5 py-0.5 rounded-lg bg-white font-bold text-rose-800 border border-rose-300 self-start sm:self-auto shrink-0 text-[11px]">
          Política Cero Tolerancia
        </div>
      </div>

      {/* Panel de Verificación de Cuadrilla Técnica */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Matriz de Liberación Técnica y Seguridad</h3>
            <p className="text-xs text-slate-500">Auditoría en tiempo real de certificaciones médicas y cursos de alturas</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Supervisado por: Kelly Rojas / Dayannifer Mosquera
          </span>
        </div>

        <LightTable
          data={technicians}
          keyExtractor={(t) => t.id}
          columns={[
            {
              key: 'name',
              header: 'Colaborador / Cargo',
              render: (t) => (
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: t.avatarColor }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-gray-900">{t.name}</div>
                    <div className="text-[11px] text-gray-400">{t.roleLabel} • {t.phone}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'competencies',
              header: 'Competencias Técnicas Clave',
              render: (t) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {t.competencies.map((c, idx) => (
                    <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: 'hseqStatus',
              header: 'Estado Liberación SST',
              align: 'center',
              render: (t) => (
                <div className="text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.hseqStatus === 'valid'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {t.hseqStatus === 'valid' ? (
                      <>
                        <CheckCircle2 size={11} /> Liberación Aprobada
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} /> ¡CERTIFICADO VENCIDO!
                      </>
                    )}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Vigencia: {t.hseqExpiresAt}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Prueba de Asignación',
              align: 'right',
              render: (t) => (
                <button
                  onClick={() => handleTestAssignment(t.id, t.name)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shadow-xs ml-auto block ${
                    t.hseqStatus === 'valid'
                      ? 'bg-[#00668F] hover:bg-[#005073] text-white'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                >
                  {t.hseqStatus === 'valid' ? 'Asignar a Cuadrilla' : 'Probar Bloqueo HSEQ'}
                </button>
              ),
            },
          ]}
        />
      </div>

    </div>
  );
};
