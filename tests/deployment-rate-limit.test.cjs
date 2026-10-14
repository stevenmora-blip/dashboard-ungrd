const test = require('node:test');
const assert = require('node:assert/strict');
const { appRequire, createDatabaseClient } = require('./gestion-test-client.cjs');
appRequire('tsx/cjs');
const { limitPublicIntake } = appRequire('./lib/gestion/rate-limit.ts');

test('el límite de recepción se comparte entre instancias mediante PostgreSQL', async () => {
  const first = createDatabaseClient();
  const second = createDatabaseClient();
  const fixed = new Date('2001-01-01T00:00:00Z');
  const id = `intake:${Math.floor(fixed.getTime() / 60000)}`;
  try {
    for (let i = 0; i < 15; i++) await first.$transaction(tx => limitPublicIntake(tx, fixed));
    // Una instancia nueva carece de memoria de proceso de la anterior.
    delete globalThis.gestionIntakeLimit;
    await Promise.all(Array.from({ length: 15 }, (_, i) =>
      (i % 2 ? first : second).$transaction(tx => limitPublicIntake(tx, fixed), { maxWait: 15000, timeout: 15000 })
    ));
    await assert.rejects(second.$transaction(tx => limitPublicIntake(tx, fixed)), error => error.status === 429);
    assert.equal((await first.publicIntakeBucket.findUnique({ where: { id } })).count, 30);
  } finally {
    if (first.publicIntakeBucket) await first.publicIntakeBucket.deleteMany({ where: { id } });
    await first.$disconnect(); await second.$disconnect();
    delete globalThis.gestionIntakeLimit;
  }
});
