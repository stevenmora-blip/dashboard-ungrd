# Despliegue del Dashboard

Vercel: equipo `stevenmora-blips-projects`, proyecto `dashboard-ungrd`, repositorio `stevenmora-blip/dashboard-ungrd`, rama `main`, root `dashboard-proyecto/dashboard_proyectos/nextjs_space`, framework Next.js. El build de package.json genera Prisma y ejecuta next build; pnpm10.30.1 fijado.

Producción publicada por **Codex** el 14-oct-2026: https://dashboard-ungrd-sand.vercel.app. Formulario compartible: https://dashboard-ungrd-sand.vercel.app/solicitar. Vercel confirmó Ready para el código `3f9867d` (despliegue `dpl_89MMczyK3fihmKyoGoJf6NUQjgh2`). Los pushes a main actualizan producción; conexión y secreto son variables sensibles de Production, no de Preview.

Supabase elegido: `UNGRD_DASHBOARD`, schema privado `dashboard`. Vercel requiere DATABASE_URL por Transaction Pooler (6543), con `schema=dashboard`, `pgbouncer=true`, `connection_limit=1` y `sslmode=require`. El Session Pooler (5432) se usa sólo para preparar schema y revisar datos, no como conexión habitual serverless. NEXTAUTH_SECRET es exclusivo de producción y NEXTAUTH_URL debe coincidir con el dominio confirmado por Vercel. Ninguno de esos valores secretos se versiona.

Las tablas se prepararon desde Prisma en una base vacía autorizada; luego se revocaron permisos de schema/tablas/secuencias para PUBLIC/anon/authenticated y se habilitó RLS en todas. La aplicación usa NextAuth/Prisma y su tabla User, no Supabase Auth ni una conexión directa desde el navegador. Tras cambios futuros del schema, verificar y mantener estas protecciones. Nunca aplicar db push automático a una base con datos sin revisar el cambio.

No se importaron proyectos ni tareas históricas. Se provisionaron sólo los seis usuarios reales pedidos por el dueño, con Steven ADMIN y cinco USER; aprobadores deshabilitados y áreas sin nombres inventados. Contraseñas iniciales en archivo privado local, sin envío de correos. El almacenamiento de adjuntos original S3 requiere configuración adicional.

Verificación: build de producción,15 tests unitarios y7HTTP/flujo (incluye bloqueo de registro público y cuota compartida bajo contención), TypeScript y lint. Pruebas HTTP en el dominio HTTPS real comprobaron login/rol de las seis cuentas, restricción de configuración a ADMIN, APIs privadas protegidas, registro público bloqueado y formulario público; comprobaciones sin crear proyectos ni tickets de prueba. Navegador confirmó dashboard con seis responsables y cero proyectos, bandeja, consumo, aporte y formulario. Supabase:31 tablas con RLS y permisos de schema negados a anon/authenticated.

Conservar el directorio de aplicación sin espacios y el trazado predeterminado de Next. Forzar outputFileTracingRoot al directorio padre causó un fallo de empaquetado; el espacio de la carpeta extraída causó nombres de funciones inválidos. No reintroducir ninguno en futuros despliegues.
