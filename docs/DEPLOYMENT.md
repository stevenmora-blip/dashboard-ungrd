# Despliegue del Dashboard

Vercel: equipo `stevenmora-blips-projects`, proyecto `dashboard-ungrd`, repositorio `stevenmora-blip/dashboard-ungrd`, rama `main`, root `Dashboard Proyecto/dashboard_proyectos/nextjs_space`, framework Next.js. El build de package.json genera Prisma y ejecuta next build; pnpm10.30.1 fijado.

Supabase elegido: `UNGRD_DASHBOARD`, schema privado `dashboard`. Vercel requiere DATABASE_URL por Transaction Pooler (6543), con `schema=dashboard`, `pgbouncer=true`, `connection_limit=1` y `sslmode=require`. El Session Pooler (5432) se usa sólo para preparar schema y revisar datos, no como conexión habitual serverless. NEXTAUTH_SECRET es exclusivo de producción y NEXTAUTH_URL debe coincidir con el dominio confirmado por Vercel. Ninguno de esos valores secretos se versiona.

Las tablas se prepararon desde Prisma en una base vacía autorizada; luego se revocaron permisos de schema/tablas/secuencias para PUBLIC/anon/authenticated y se habilitó RLS en todas. La aplicación usa NextAuth/Prisma y su tabla User, no Supabase Auth ni una conexión directa desde el navegador. Tras cambios futuros del schema, verificar y mantener estas protecciones. Nunca aplicar db push automático a una base con datos sin revisar el cambio.

No se importaron proyectos ni tareas históricas. Se provisionaron sólo los seis usuarios reales pedidos por el dueño, con Steven ADMIN y cinco USER; aprobadores deshabilitados y áreas sin nombres inventados. Contraseñas iniciales en archivo privado local, sin envío de correos. El almacenamiento de adjuntos original S3 requiere configuración adicional.

Verificación: build de producción,15 tests unitarios y7HTTP/flujo (incluye bloqueo de registro público y cuota compartida bajo contención), TypeScript y lint de gestión. La publicación no está completa hasta comprobar dominio HTTPS, login con datos reales, APIs protegidas, catálogos y formulario con conexión aSupabase.
