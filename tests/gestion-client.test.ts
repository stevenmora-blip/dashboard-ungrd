import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError } from '../dashboard-proyecto/dashboard_proyectos/nextjs_space/components/gestion/api';

test('los errores de validación del servidor conservan su estado y mensajes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: 'Datos inválidos',
    issues: { formErrors: [], fieldErrors: { requesterEmail: ['Correo inválido'] } },
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  try {
    await assert.rejects(() => api('/api/solicitudes', { method: 'POST', body: '{}' }), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.match(error.message, /Correo inválido/);
      return true;
    });
  } finally { globalThis.fetch = originalFetch; }
});
