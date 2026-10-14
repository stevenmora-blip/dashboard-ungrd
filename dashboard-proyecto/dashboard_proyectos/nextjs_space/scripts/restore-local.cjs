const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const root = path.resolve(__dirname, '../../../..');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/dashboard_ungrd') {
  throw new Error('La restauración sólo se permite en la base local dashboard_ungrd:55432.');
}
const backup = JSON.parse(fs.readFileSync(path.join(__dirname, '../../backup_2026-03-26.json'), 'utf8'));
const actas = JSON.parse(fs.readFileSync(path.join(root, '.local/actas-20260320.json'), 'utf8'));
const access = JSON.parse(fs.readFileSync(path.join(root, '.local/acceso.json'), 'utf8'));
const prisma = new PrismaClient();
const tasks = backup.projects.flatMap(project => project.tasks);

function scalarData(modelName, rows) {
  const fields = Prisma.dmmf.datamodel.models.find(model => model.name === modelName).fields
    .filter(field => field.kind !== 'object');
  return rows.map(row => Object.fromEntries(fields
    .filter(field => row[field.name] !== undefined)
    .map(field => [field.name, row[field.name]])));
}

async function main() {
  const password = await bcrypt.hash(access.password, 12);
  await prisma.$transaction(async tx => {
    for (const model of Prisma.dmmf.datamodel.models) {
      const delegate = model.name[0].toLowerCase() + model.name.slice(1);
      if (await tx[delegate].count()) {
        throw new Error('La base no está vacía. Restauración cancelada para preservar los datos.');
      }
    }
    async function insert(model, rows) {
      if (!rows.length) return;
      const unique = [...new Map(rows.map(row => [row.id, row])).values()];
      const delegate = model[0].toLowerCase() + model.slice(1);
      await tx[delegate].createMany({ data: scalarData(model, unique) });
      console.log(`${model}: ${unique.length}`);
    }
    await insert('Team', backup.teams);
    await insert('Project', backup.projects);
    await insert('Responsable', backup.responsables);
    await insert('User', backup.users);
    await tx.user.create({ data: {
      email: access.email, name: 'Administrador local', role: 'ADMIN', password,
    } });
    await insert('Task', tasks);
    await insert('Acta', actas);
    await insert('Compromiso', actas.flatMap(acta => acta.compromisos || []));
    const children = {
      TaskAssignment: 'assignments', SubTask: 'subTasks', DailyEntry: 'dailyEntries',
      TaskAttachment: 'attachments', TaskProgressLog: 'progressLogs',
    };
    for (const [model, key] of Object.entries(children)) {
      await insert(model, tasks.flatMap(task => task[key] || []));
    }
    await insert('AuditLog', backup.auditLogs || []);
    // El respaldo no incluye membresías: reconstruir sólo las acreditadas por asignaciones.
    const memberships = new Map();
    for (const task of tasks) for (const assignment of task.assignments || []) {
      const key = `${assignment.responsableId}:${task.projectId}`;
      memberships.set(key, { responsableId: assignment.responsableId, projectId: task.projectId });
    }
    if (memberships.size) await tx.projectMembership.createMany({ data: [...memberships.values()] });
    console.log(`ProjectMembership: ${memberships.size}`);
  }, { timeout: 60000 });
  console.log('Restauración local completada.');
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
