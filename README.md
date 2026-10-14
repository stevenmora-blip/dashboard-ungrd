# Dashboard UNGRD

Gestión de proyectos y tareas, recepción de requerimientos mediante tickets, reuniones y decisiones trazables, versiones y cambios de alcance, esfuerzo real y aporte institucional con evidencia y reconocimiento del equipo productor.

Aplicación: `Dashboard Proyecto/dashboard_proyectos/nextjs_space`. Stack: Next.js 15, TypeScript, Prisma 6 y PostgreSQL.

- [Guía local y verificación](README-LOCAL.md)
- [Estado y pendientes](STATUS.md)
- [Contrato de la API de gestión](Dashboard%20Proyecto/dashboard_proyectos/nextjs_space/docs/GESTION-API.md)

## Configuración

En la carpeta de la aplicación, instalar con `pnpm install --frozen-lockfile`, copiar `.env.example` a `.env`, completar la conexión PostgreSQL y generar un secreto propio para NextAuth. Ejecutar `pnpm exec prisma generate`. Preparar una base propia y aplicar el schema mediante `pnpm exec prisma db push` tras revisar los cambios. Iniciar con `pnpm dev --hostname 127.0.0.1 --port 3040`.

La copia local existente se inicia desde la raíz mediante `./start-local.sh`, con su PostgreSQL privado ya preparado. El repositorio no incluye esa base, sus usuarios, credenciales, adjuntos ni respaldos. El administrador inicial de una instalación nueva debe provisionarse de forma controlada; no se distribuyen contraseñas por defecto. No ejecutar el seed heredado: sus datos históricos y cuentas de ejemplo quedan fuera del repositorio.

Los aprobadores y áreas se configuran con identidades reales. La entrega actual pasa compilación de producción y pruebas; la configuración de S3 y un despliegue de producción son tareas separadas. EDAN queda fuera de esta entrega.
