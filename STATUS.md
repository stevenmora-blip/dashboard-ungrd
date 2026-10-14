# STATUS — Dashboard UNGRD

Actualizado por **Codex** el **2026-10-14**, hora de Bogotá.

## Continuar aquí

Aplicación ejecutándose en **http://localhost:3040**, con PostgreSQL propio en **127.0.0.1:55432/dashboard_ungrd**. Inicio: `./start-local.sh`. Acceso local: `.local/acceso.json`. Guía: `README-LOCAL.md`.

El proyecto fue extraído de `Dashboard Proyecto-20261014T183736Z-1-001.zip` dentro de esta carpeta. El usuario autorizó después crear el repositorio privado `stevenmora-blip/dashboard-ungrd` en GitHub; copia local inicializada en la rama `main`.

## Resultado comprobado

- Dependencias instaladas con pnpm; lockfile generado.
- Cliente Prisma generado para macOS tras retirar la ruta absoluta `/home/ubuntu/...` del schema.
- Base local creada y respaldo del 26-mar-2026 restaurado en una transacción: 14 proyectos, 198 tareas, 340 subtareas, 376 entradas diarias y 217 registros de progreso.
- 7 actas y 13 compromisos recuperados del respaldo del 20-mar-2026.
- Administrador local nuevo agregado; contraseñas originales ausentes del respaldo.
- Inicio de sesión y visualización del dashboard probados en navegador.
- TypeScript sin errores; Bash y script de restauración sin errores de sintaxis.
- API de estadísticas, progreso, equipos, actividad, proyectos, tareas, usuarios, responsables, actas y carga de trabajo responde HTTP 200 con sesión local.

## Límites existentes

- Adjuntos dependen de S3 sin configuración/credenciales: listado de archivos HTTP 500; 84 metadatos de adjuntos restaurados, sin integración de almacenamiento local.
- Lint de gestión y lint general con reglas de corrección aprobados, 0 errores; una directiva heredada sin uso produce una advertencia.
- Copia local con servidor de desarrollo. La versión Next.js 15.5.28 también pasó compilación de producción.
- No se recuperaron datos posteriores a las fechas de los respaldos ni sesiones originales. Asistencia no figura en el respaldo.

Memanto fue consultado desde terminal con `--tool codex`; `MEMORY.md` se conserva como exportación original de continuidad.

## Nueva evolución solicitada — 2026-10-14, Codex

Solicitados: tickets mediante formulario, responsable de levantamiento y reunión, trazabilidad de aprobación/rechazo, esfuerzo de personas/máquinas/tecnología, cambios de alcance y reportes de aporte a varias subdirecciones/áreas con reconocimiento del equipo productor.

El usuario compartirá la lista real de usuarios después. EDAN queda fuera por indicación expresa. Se conservó la lista de usuarios y no se habilitaron aprobadores ni nombres de áreas automáticamente.

Diseño: `docs/superpowers/specs/2026-10-14-requerimientos-esfuerzo-aporte-design.md`, aprobado por el usuario. Implementación local terminada y verificada según `docs/superpowers/plans/2026-10-14-requerimientos-esfuerzo-aporte.md`. Respaldo anterior a los cambios: `.local/backups/antes-requerimientos-20261014.dump`. La publicación privada de código se autorizó después de esta implementación.

## Entrega funcional verificada — Codex

- `/solicitar`: recepción pública y comprobante de número/fecha, sin consulta de información interna.
- `/dashboard/requerimientos`: bandeja filtrada, responsable, reuniones, alcance, decisiones, versiones, cambios y reporte imprimible. Los enlaces desde un proyecto aplican su filtro al abrir.
- `/dashboard/esfuerzo`: horas de personas y máquinas, tecnología/recursos, cantidades, tarifas y monedas opcionales, plan inicial/vigente frente a consumo real.
- `/dashboard/aporte`: catálogo de áreas, distribución declarada de beneficio, evidencia observada con fuente/productor/corte y subtotales por área; total institucional sin duplicación de proyectos.
- Concurrencia: un conflicto conserva borradores durante la permanencia en la pantalla. Las tareas con consumos no pueden moverse a otro proyecto ni eliminarse sin resolver su trazabilidad.
- 15 pruebas unitarias y 5 HTTP/flujo aprobadas. TypeScript y lint de módulos nuevos aprobados; revisiones de cumplimiento y calidad sin hallazgos pendientes. Recorridos de navegador de recepción, conflictos, recursos, porcentajes y enlaces por proyecto aprobados.
- Tras retirar únicamente registros temporales: 14 proyectos, 198 tareas, 54 usuarios, 39 responsables y 7 auditorías originales. Cero tickets, áreas, consumos, distribuciones, evidencias o aprobadores creados para pruebas permanecen.
- Pendientes aportados por el usuario: usuarios/roles definitivos y nombres oficiales de las tres subdirecciones. El respaldo contiene cuentas de demostración conservadas. EDAN excluido. S3 sigue pendiente; compilación de producción completada y despliegue Vercel en preparación.

## Repositorio GitHub — Codex

Destino privado: https://github.com/stevenmora-blip/dashboard-ungrd. Creado mediante la sesión del usuario en Chrome por petición explícita. La raíz del proyecto es el repositorio local; aplicación y rutas originales se conservan.

Se excluyen `.local`, `.env`, respaldos, adjuntos, Excel/datos de trabajo, `MEMORY.md`, logs y scripts históricos con credenciales de ejemplo o correcciones puntuales. `.env.example` contiene únicamente campos vacíos y marcadores. La base local permanece aislada; subir el código no despliega el servidor ni restaura datos al clonar.

Publicación verificada: rama `main` sincronizada con `origin/main`; commit inicial de código `c8278b2` comprobado tanto por API como en Chrome. 191 archivos de código/documentación publicados; sin base ni credenciales. Herramienta responsable: Codex.

## Preparación de Vercel/Supabase — Codex

El usuario autorizó despliegue en Vercel y eligió explícitamente la base Supabase `UNGRD_DASHBOARD`, ref `desyqjjxgbrmcwucqbax`, de su organización. Producción comienza vacía: no se migró el respaldo. Se crearon seis identidades reales indicadas por el usuario, Steven como único ADMIN y los demás USER, cada una vinculada a su responsable. Credenciales iniciales únicamente en `.local/accesos-produccion.json` con permisos 600; conexión/secreto únicamente en `.local/production-secrets.json` con permisos 600.

- Schema privado `dashboard` en Supabase: 31 tablas, RLS habilitado en todas, sin permisos USAGE para `anon`/`authenticated` y sin grants de tablas/secuencias para esos roles ni PUBLIC. Backend Prisma por conexión agrupada, sin claves de Supabase en navegador.
- Next.js actualizado de14.2.28 a15.5.28 según aviso de seguridad oficial de Vercel; rutas y página de detalle adaptadas a params asíncronos. Build genera Prisma antes de compilar.
- Registro heredado `/api/signup` cerrado a visitantes/usuarios comunes; exige ADMIN activo releído de DB. Cuota pública de30recepciones/minuto compartida mediante PostgreSQL, con rollback junto con el ticket.
- Build de producción, 15 pruebas unitarias y7 HTTP/flujo/regresiones, TypeScript y lint de módulos nuevos pasan. Prueba de cuota incluye contención paralela en2clientes.
- Proyecto Vercel previsto: `dashboard-ungrd`, equipo `stevenmora-blips-projects`, root `dashboard-proyecto/dashboard_proyectos/nextjs_space`. Conexión y publicación pendientes de completar en la sesión de Chrome. No activar Neon ni planes pagos.

Primer despliegue Vercel compiló pero falló en empaquetado por la raíz padre heredada de outputFileTracingRoot. Se retiró el override: build local nuevo aprobado y manifiesto con raíz de aplicación/relativeAppDir vacío. Dominio confirmado por Vercel: `https://dashboard-ungrd-sand.vercel.app`; NEXTAUTH_URL ajustado al dominio real. Segundo despliegue pendiente de verificar.

Segundo despliegue superó el empaquetado y fue rechazado por el espacio de la carpeta extraída: nombre de función `Dashboard Proyecto/.../___next_launcher.cjs`. Se normalizó a `dashboard-proyecto` sin alterar contenido funcional ni perder respaldos, se actualizaron nueve referencias de rutas y Root Directory en Vercel. Build de producción y22 pruebas vuelven a pasar en el directorio nuevo. Publicación corregida pendiente de verificar.
