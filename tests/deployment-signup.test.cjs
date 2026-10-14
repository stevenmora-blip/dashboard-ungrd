const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient, createDatabaseClient, appRequire } = require('./gestion-test-client.cjs');

test('el registro heredado no permite crear administradores a visitantes ni usuarios comunes', async () => {
  const db = createDatabaseClient();
  const suffix = randomUUID();
  const targetEmail = `qa-signup-target-${suffix}@example.invalid`;
  const memberEmail = `qa-signup-member-${suffix}@example.invalid`;
  let memberId;
  try {
    const guest = createClient();
    const payload = { email: targetEmail, name: 'Prueba de acceso', password: randomUUID(), role: 'ADMIN' };
    const anonymous = await guest.json('/api/signup', 'POST', payload);
    assert.equal(anonymous.status, 401, 'Un visitante no debe poder crear cuentas');
    const password = randomUUID();
    const member = await db.user.create({ data: { email: memberEmail, name: 'Prueba de permisos', role: 'USER', password: await appRequire('bcryptjs').hash(password, 12) } });
    memberId = member.id;
    const client = createClient();
    await client.login(memberEmail, password);
    const ordinary = await client.json('/api/signup', 'POST', payload);
    assert.ok([401, 403].includes(ordinary.status));
    assert.equal(await db.user.count({ where: { email: targetEmail } }), 0);
  } finally {
    await db.user.deleteMany({ where: { email: targetEmail } });
    if (memberId) await db.user.delete({ where: { id: memberId } });
    await db.$disconnect();
  }
});
