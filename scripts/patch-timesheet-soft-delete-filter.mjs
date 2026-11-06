import fs from 'fs';

let content = fs.readFileSync('src/modules/timesheet/TimesheetModule.tsx', 'utf8').replace(/\r\n/g, '\n');

const target = "data={timesheets}";
const replacement = "data={timesheets.filter((t) => !t.isDeleted)}";

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/modules/timesheet/TimesheetModule.tsx', content, 'utf8');
  console.log('✅ Soft-Delete filter aplicado a TimesheetModule!');
} else {
  console.error('❌ data={timesheets} no encontrado');
}
