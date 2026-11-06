import fs from 'fs';

let content = fs.readFileSync('src/modules/projects/components/tabs/TabWbsGantt.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Agregar competencyId a taskForm
const targetFormInit = `  const [taskForm, setTaskForm] = useState({
    code: '',
    name: '',
    description: '',
    itemCode: '',
    plannedHours: 0,
    actualHours: 0,
    progressPct: 0,
    startDate: '',
    endDate: '',
    durationDays: 1,
    isMilestone: false,
    priority: 'alta' as 'alta' | 'media' | 'baja',
    deliverable: '',
    assignedToName: '',`;

const replaceFormInit = `  const [taskForm, setTaskForm] = useState({
    code: '',
    name: '',
    description: '',
    itemCode: '',
    competencyId: '', // Eje 6: Competencia técnica requerida de catálogo (SKILL-001 a SKILL-010)
    plannedHours: 0,
    actualHours: 0,
    progressPct: 0,
    startDate: '',
    endDate: '',
    durationDays: 1,
    isMilestone: false,
    priority: 'alta' as 'alta' | 'media' | 'baja',
    deliverable: '',
    assignedToName: '',`;

// 2. Integrar selector de competencyId junto a SmartEmployeeSelect
const targetEmployeeSelectBlock = `                  <div>
                    <SmartEmployeeSelect
                      label="Responsable Técnico (Validación HSEQ Res. 4272)"
                      value={taskForm.assignedToName}
                      isHeightTask={/altura|pilona|polea|cable|torre|montaje|izaj/i.test(\`\${taskForm.name} \${taskForm.description}\`)}
                      showHourlyCostBadge={true}
                      onChange={(_id, empObj) =>
                        setTaskForm({ ...taskForm, assignedToName: empObj ? empObj.name : _id })
                      }
                      placeholder="Seleccionar técnico con HSEQ vigente..."
                    />
                  </div>`;

const replaceEmployeeSelectBlock = `                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Competencia Requerida (Eje 6 • Filtro Luciana)
                    </label>
                    <select
                      value={taskForm.competencyId}
                      onChange={(e) => setTaskForm({ ...taskForm, competencyId: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">Todas las competencias técnicas</option>
                      <option value="SKILL-001">SKILL-001 • Empalme de Cables</option>
                      <option value="SKILL-002">SKILL-002 • Mantenimiento de Pilonas</option>
                      <option value="SKILL-003">SKILL-003 • Overhaul de Pinzas</option>
                      <option value="SKILL-004">SKILL-004 • Trabajo en Alturas (Res. 4272)</option>
                      <option value="SKILL-005">SKILL-005 • Inspección Magneto-Inductiva MRT</option>
                      <option value="SKILL-006">SKILL-006 • Ensayos No Destructivos NDT Nivel II</option>
                      <option value="SKILL-007">SKILL-007 • Alineación Láser de Poleas</option>
                      <option value="SKILL-008">SKILL-008 • Sistemas Hidráulicos</option>
                      <option value="SKILL-009">SKILL-009 • PLC y Automatización STC</option>
                    </select>
                  </div>

                  <div>
                    <SmartEmployeeSelect
                      label="Responsable Técnico (Filtro IA • HSEQ y Competencias)"
                      value={taskForm.assignedToName}
                      requiredCompetencyId={taskForm.competencyId}
                      isHeightTask={/altura|pilona|polea|cable|torre|montaje|izaj/i.test(\`\${taskForm.name} \${taskForm.description}\`)}
                      showHourlyCostBadge={true}
                      onChange={(_id, empObj) =>
                        setTaskForm({ ...taskForm, assignedToName: empObj ? empObj.name : _id })
                      }
                      placeholder="Seleccionar técnico pre-aprobado..."
                    />
                  </div>`;

let ok = 0;
if (content.includes(targetFormInit)) {
  content = content.replace(targetFormInit, replaceFormInit);
  ok++;
}
if (content.includes(targetEmployeeSelectBlock)) {
  content = content.replace(targetEmployeeSelectBlock, replaceEmployeeSelectBlock);
  ok++;
}

if (ok === 2) {
  fs.writeFileSync('src/modules/projects/components/tabs/TabWbsGantt.tsx', content, 'utf8');
  console.log('✅ Selector de competencyId y filtro reactivo integrados en TabWbsGantt!');
} else {
  console.error('❌ Solo coincidieron ' + ok + ' de 2 targets en TabWbsGantt');
}
