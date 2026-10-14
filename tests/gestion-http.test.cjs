const { test } = require('node:test');
const assert = require('node:assert/strict');

const base = process.env.GESTION_BASE_URL || 'http://127.0.0.1:3040';
const url = new URL(base);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '3040') {
  throw new Error('Las pruebas sólo se ejecutan contra el dashboard local en el puerto 3040.');
}

test('el formulario se puede abrir sin iniciar sesión', async () => {
  const response = await fetch(`${base}/solicitar`, { redirect: 'manual' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
});

test('una solicitud vacía se rechaza sin exigir acceso al dashboard', async () => {
  const response = await fetch(`${base}/api/solicitudes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}', redirect: 'manual',
  });
  assert.equal(response.status, 400);
  assert.match(response.headers.get('content-type'), /application\/json/);
});

test('los tickets internos no son públicos ni redirigen la API al login', async () => {
  const response = await fetch(`${base}/api/gestion/tickets`, { redirect: 'manual' });
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.ok(body.error);
});

test('el catálogo de identidades internas está protegido', async () => {
  const response = await fetch(`${base}/api/gestion/catalogos`, { redirect: 'manual' });
  assert.equal(response.status, 401);
});
