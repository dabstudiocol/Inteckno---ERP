import fs from 'fs';

let content = fs.readFileSync('src/modules/timesheet/TimesheetModule.tsx', 'utf8').replace(/\r\n/g, '\n');

const oldActionsSnippet = `                    {t.status === 'submitted' && isLeader && (
                      <>
                        <button
                          onClick={() => approveTimesheet(t.id)}
                          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => rejectTimesheet(t.id, 'Requiere mayor detalle en actividades de campo.')}
                          className="px-2 py-1 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Devolver
                        </button>
                      </>
                    )}`;

const newActionsSnippet = `                    {t.status === 'submitted' && isLeader && (() => {
                      // Auditoría Práctica Parte 6: Principio de Maker-Checker (Segregación de Funciones)
                      // Si el registrador es el mismo supervisor activo, se bloquea la auto-aprobación y requiere Gerente de Proyectos (USR-18 o USR-07)
                      const isSelfEntry = t.userId === currentUser.id || t.userName?.toLowerCase() === currentUser.name?.toLowerCase();
                      const isHighManagement = ['gerente_proyectos', 'gerente_general', 'admin_sistemas'].includes(currentUser.role) || currentUser.id === 'USR-18' || currentUser.id === 'USR-07';
                      const canApprove = !isSelfEntry || isHighManagement;

                      if (!canApprove) {
                        return (
                          <span
                            title="Auditoría Maker-Checker: No puedes auto-aprobar tus propias horas. Requiere visto bueno de Gerencia de Proyectos (USR-18)."
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold cursor-help"
                          >
                            Requiere Checker USR-18
                          </span>
                        );
                      }

                      return (
                        <>
                          <button
                            onClick={() => approveTimesheet(t.id)}
                            className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => rejectTimesheet(t.id, 'Requiere mayor detalle en actividades de campo.')}
                            className="px-2 py-1 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Devolver
                          </button>
                        </>
                      );
                    })()}`;

if (content.includes(oldActionsSnippet)) {
  content = content.replace(oldActionsSnippet, newActionsSnippet);
  fs.writeFileSync('src/modules/timesheet/TimesheetModule.tsx', content, 'utf8');
  console.log('✅ Maker-Checker segregación de funciones integrado en TimesheetModule.tsx!');
} else {
  console.error('❌ Snippet de acciones en TimesheetModule no coincide');
}
