# Dashboard UNGRD

Gestión de proyectos y tareas, recepción de requerimientos mediante tickets, reuniones y decisiones trazables, versiones y cambios de alcance, esfuerzo real y aporte institucional con evidencia y reconocimiento del equipo productor.

Aplicación: `dashboard-proyecto/dashboard_proyectos/nextjs_space`. Stack: Next.js 15, TypeScript, Prisma 6 y PostgreSQL.

Producción: [Dashboard UNGRD](https://dashboard-ungrd-sand.vercel.app). Formulario público: [Solicitar un requerimiento](https://dashboard-ungrd-sand.vercel.app/solicitar). Vercel y Supabase conectados; producción inicia sin proyectos ni tareas históricas, con los seis usuarios reales autorizados.

- [Guía local y verificación](README-LOCAL.md)
- [Estado y pendientes](STATUS.md)
- [Contrato de la API de gestión](dashboard-proyecto/dashboard_proyectos/nextjs_space/docs/GESTION-API.md)
- [Operación en Vercel y Supabase](docs/DEPLOYMENT.md)

## Configuración

En la carpeta de la aplicación, instalar con `pnpm install --frozen-lockfile`, copiar `.env.example` a `.env`, completar la conexión PostgreSQL y generar un secreto propio para NextAuth. Ejecutar `pnpm exec prisma generate`. Preparar una base propia y aplicar el schema mediante `pnpm exec prisma db push` tras revisar los cambios. Iniciar con `pnpm dev --hostname 127.0.0.1 --port 3040`.

La copia local existente se inicia desde la raíz mediante `./start-local.sh`, con su PostgreSQL privado ya preparado. El repositorio no incluye esa base, sus usuarios, credenciales, adjuntos ni respaldos. El administrador inicial de una instalación nueva debe provisionarse de forma controlada; no se distribuyen contraseñas por defecto. No ejecutar el seed heredado: sus datos históricos y cuentas de ejemplo quedan fuera del repositorio.

Los aprobadores y áreas se configuran con identidades reales. La configuración de S3 para adjuntos sigue pendiente. EDAN queda fuera de esta entrega.
