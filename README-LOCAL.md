# Dashboard UNGRD en local

Preparado por **Codex** el 14 de octubre de 2026.

Abrir **http://localhost:3040**. Las credenciales del administrador local están en `.local/acceso.json`; no son las contraseñas del sistema original.

## Volver a iniciar

Desde esta carpeta:

```bash
./start-local.sh
```

El comando inicia PostgreSQL si está detenido y ejecuta Next.js en primer plano. Mantener esa terminal abierta. Para detener Next.js, pulsar `Ctrl+C`. Para detener también la base:

```bash
./stop-database-local.sh
```

Requisitos instalados y comprobados: Node.js 24.13.0, pnpm 10.30.1 y PostgreSQL 14.21. La configuración privada está en `dashboard-proyecto/dashboard_proyectos/nextjs_space/.env`.

## Datos y aislamiento

- Aplicación: `dashboard-proyecto/dashboard_proyectos/nextjs_space`.
- Base: `dashboard_ungrd`, usuario `dashboard_local`, en `127.0.0.1:55432`.
- Instancia PostgreSQL propia: `.local/postgres`; log: `.local/postgres.log`.
- Next.js escucha exclusivamente en loopback, puerto 3040.
- Datos del respaldo `backup_2026-03-26.json`: 14 proyectos, 198 tareas, 39 responsables, 53 usuarios originales, 340 subtareas, 376 entradas diarias y 217 registros de progreso.
- Se agregó un administrador con contraseña local nueva; el respaldo no incluye contraseñas originales ni sus sesiones.
- 7 actas y 13 compromisos proceden del respaldo anterior `backup_dashboard_20260320.tar.gz` (20 de marzo). El respaldo más reciente no contiene actas.
- 63 membresías de proyectos se reconstruyeron a partir de las asignaciones conservadas. No se recuperaron membresías sin asignaciones porque no figuran en el respaldo.
- Los respaldos fuente se conservan. `scripts/restore-local.cjs` sólo funciona contra esta base y cancela la operación si alguna tabla ya contiene datos.

Se retiró la ruta Linux absoluta del generador Prisma y se agregó un lockfile de pnpm para reproducir la instalación. El diseño aprobado añade modelos de gestión de requerimientos, esfuerzo y aporte institucional sobre la base local, conservando los datos históricos.

## Verificación y límites

Verificados: inicio de sesión del administrador, dashboard con estadísticas y datos, TypeScript (`pnpm exec tsc --noEmit`) y API de proyectos, tareas, usuarios, responsables, actas y carga de trabajo (HTTP 200).

Este arranque usa el servidor de desarrollo de Next.js. La preparación de Vercel actualiza a Next.js 15.5.28 y pasó una compilación de producción en `.next-vercel-check`.

Se restauraron 84 registros de adjuntos, pero la aplicación original descarga y sube archivos mediante S3. El ZIP no aporta la configuración ni las credenciales de ese servicio: el listado de archivos puede fallar (HTTP 500) y las descargas/subidas no están habilitadas. Los documentos incluidos en el ZIP permanecen en `dashboard-proyecto/Uploads` y en los archivos de respaldo. No se configuraron servicios externos ni se enviaron notificaciones.

El ZIP no contenía configuración general de ESLint. Se añadieron `eslint.gestion.config.cjs` para gestión y `eslint.config.cjs` para las fuentes completas con las mismas reglas de corrección; ambas revisiones y TypeScript terminan correctamente. El lint general deja una advertencia heredada por una directiva sin uso. Los scripts locales pasan las comprobaciones de sintaxis de Bash y Node.js.

## Gestión de requerimientos y esfuerzo

Diseño aprobado: `docs/superpowers/specs/2026-10-14-requerimientos-esfuerzo-aporte-design.md`. Plan: `docs/superpowers/plans/2026-10-14-requerimientos-esfuerzo-aporte.md`. Contrato de API: `dashboard-proyecto/dashboard_proyectos/nextjs_space/docs/GESTION-API.md`.

Formulario de recepción: **http://localhost:3040/solicitar**. Bandeja interna: **http://localhost:3040/dashboard/requerimientos**. Esfuerzo: **http://localhost:3040/dashboard/esfuerzo**. Aporte institucional: **http://localhost:3040/dashboard/aporte**. Un envío genera un número de ticket y su fecha de recepción. El formulario no permite consultar datos internos. Copiar esta URL no publica el proyecto: localhost sólo funciona en el computador donde está ejecutándose.

En el ticket, un administrador asigna responsable y vincula proyecto. El responsable registra las reuniones y prepara una versión del alcance con entregables, aceptación, horas y fecha propuesta. Para solicitar decisión se debe elegir un aprobador habilitado. El administrador puede habilitar usuarios existentes desde **Configurar aprobadores**, pero su propio permiso de administrador no equivale a una aprobación.

Una decisión conserva actor, fecha y versión. Las ampliaciones se solicitan sobre el plan aprobado y sólo cambian ese plan tras su aprobación. El alcance inicial y las versiones posteriores permanecen consultables. Un conflicto de actualización recarga el ticket y conserva los borradores durante la permanencia en esa pantalla.

Los consumos separan horas de personas, horas de máquinas y cantidades de tecnología/otros recursos. Los importes sólo se calculan con tarifa y moneda explícitas; no se mezclan monedas ni unidades y una tarifa ausente no significa costo cero. Una tarea con consumos registrados no se puede trasladar a otro proyecto ni eliminar sin resolver antes su trazabilidad.

Las distribuciones por áreas describen **beneficio declarado**, con porcentajes que suman 100%, justificación y valorador. El resultado observado se sustenta con evidencias que identifiquen equipo productor, fuente, responsable técnico, destinatarios y fecha de corte. El total institucional cuenta cada proyecto una sola vez. Los reportes imprimibles conservan los enlaces al proyecto/ticket y sus decisiones.

La lista real de usuarios y los nombres oficiales de las áreas se configurarán cuando el usuario los comparta. El respaldo original incluye cuentas de demostración; no se depuraron ni se habilitaron aprobadores automáticamente. EDAN está fuera de esta etapa. La configuración S3 original sigue pendiente.

Verificación de los módulos nuevos:

```bash
node --test tests/gestion-http.test.cjs
node --test tests/gestion-workflow.test.cjs
cd 'dashboard-proyecto/dashboard_proyectos/nextjs_space'
node --import tsx --test tests/gestion-domain.test.ts tests/gestion-area-summary.test.ts ../../../tests/gestion-client.test.ts
pnpm exec tsc --noEmit
pnpm exec eslint --config eslint.gestion.config.cjs lib/gestion app/api/gestion app/api/solicitudes components/gestion app/solicitar app/dashboard/requerimientos app/dashboard/esfuerzo app/dashboard/aporte
```

Las pruebas de flujo usan registros temporales en la instancia local protegida por comprobación de URL y los retiran al terminar. No ejecutar contra bases compartidas o de producción. El archivo `eslint.gestion.config.cjs` configura la revisión de los módulos nuevos sin cambiar el lint heredado del ZIP.

Resultado: 15 pruebas unitarias y 5 HTTP/flujo aprobadas; recorridos de navegador y revisiones de cumplimiento y calidad aprobados. Se conservan 14 proyectos, 198 tareas, 54 usuarios y 39 responsables; no quedaron registros de prueba ni aprobadores habilitados.

El repositorio contiene código y documentación. La base local, credenciales, respaldos, datos de trabajo, memorias y scripts históricos de corrección no se incluyen. `start-local.sh` presupone la base ya preparada; clonar el repositorio no restaura automáticamente los datos. El seed histórico se conserva sólo en la copia local y no debe ejecutarse desde el repositorio.
