const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'Dashboard Proyecto/dashboard_proyectos/nextjs_space');
const appRequire = createRequire(path.join(app, 'package.json'));
const base = process.env.GESTION_BASE_URL || 'http://127.0.0.1:3040';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname) || new URL(base).port !== '3040') {
  throw new Error('Esta prueba sólo admite el servidor local del proyecto.');
}

function createDatabaseClient() {
  const env = appRequire('dotenv').parse(fs.readFileSync(path.join(app, '.env')));
  const databaseUrl = new URL(env.DATABASE_URL);
  if (databaseUrl.hostname !== '127.0.0.1' || databaseUrl.port !== '55432' || databaseUrl.pathname !== '/dashboard_ungrd') {
    throw new Error('Esta prueba sólo admite la base local dashboard_ungrd:55432.');
  }
  return new (appRequire('@prisma/client').PrismaClient)({ datasources: { db: { url: env.DATABASE_URL } } });
}

function createClient() {
  const cookies = new Map();
  async function request(route, options = {}) {
    if (!route.startsWith('/')) throw new Error('Se requiere una ruta local.');
    const headers = new Headers(options.headers);
    if (cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const response = await fetch(new URL(route, base), { ...options, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body, headers: response.headers };
  }
  async function json(route, method, data) {
    return request(route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  }
  async function login(email, password) {
    const csrf = await request('/api/auth/csrf');
    if (csrf.status !== 200 || !csrf.body.csrfToken) throw new Error('No se pudo obtener CSRF local.');
    const response = await request('/api/auth/callback/credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: csrf.body.csrfToken, email, password, callbackUrl: `${base}/dashboard`, json: 'true' }).toString(),
    });
    const session = await request('/api/auth/session');
    if (response.status !== 200 || !session.body.user || session.body.user.email !== email) {
      throw new Error('No se pudo iniciar la sesión local de prueba.');
    }
    return session.body;
  }
  return { request, json, login };
}

function localAdminAccess() {
  return JSON.parse(fs.readFileSync(path.join(root, '.local/acceso.json'), 'utf8'));
}

module.exports = { appRequire, base, createDatabaseClient, createClient, localAdminAccess };
