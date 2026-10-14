# Implementación: requerimientos, esfuerzo y aporte institucional

> Ejecución en esta sesión mediante `subagent-driven-development`, con revisión de cumplimiento y revisión técnica. Diseño aprobado por el usuario el 14-oct-2026. El trabajo funcional se realizó antes de crear el repositorio Git. Publicación privada posterior autorizada expresamente por el usuario.

**Objetivo:** integrar recepción y gestión de requerimientos, decisiones y versiones de alcance, esfuerzo real y reporte institucional con procedencia.

**Arquitectura:** modelos Prisma aditivos, funciones de dominio comprobables, API autenticada de gestión y formulario de recepción público. Reutilizar autenticación y estilo institucional azul/amarillo. Los usuarios y áreas reales se configurarán después; no crear datos ficticios ni aprobaciones históricas.

**Stack:** Next.js 14, TypeScript, PostgreSQL 14, Prisma 6, Zod, Node test runner, componentes existentes.

## Tarea 1 — Datos, dominio y API

**Archivos:** `prisma/schema.prisma`, `lib/gestion/{domain,validation,auth,tickets,resources,impact}.ts`, `app/api/solicitudes/route.ts`, `app/api/gestion/**/route.ts`, `middleware.ts`, `tests/gestion-domain.test.ts` y `docs/GESTION-API.md`, todos relativos a `Dashboard Proyecto/dashboard_proyectos/nextjs_space`.

- [x] Respaldar la base: `.local/backups/antes-requerimientos-20261014.dump`.
- [x] Escribir pruebas primero y confirmar fallos para transiciones inválidas, aprobación no autorizada, porcentajes distintos de 100, mezcla de monedas/unidades y doble conteo institucional.
- [x] Añadir modelos de área, ticket, evento, reunión, versión de alcance, decisión, cambio, consumo, distribución de beneficio y evidencia. Agregar `User.canApproveRequests` con valor inicial `false` y relaciones aditivas.
- [x] Implementar validación Zod, autorización usando identidad activa de base de datos, transacciones de eventos/decisiones/versiones y control de concurrencia de cambios de estado.
- [x] Implementar formulario POST público que devuelva sólo número/fecha de recepción; no añadir GET público de tickets. Validar enlaces HTTP(S), longitudes y tamaño del cuerpo.
- [x] Implementar catálogo autenticado, configuración admin de áreas/aprobadores, bandeja y detalle de tickets, reuniones, alcance y acciones de transición/decisión/cambio/proyecto.
- [x] Implementar consumos físicos y costos calculados cuando exista tarifa; unidades y monedas se agrupan por separado. Validar pertenencia de tarea/ticket al proyecto.
- [x] Implementar beneficiarios con suma 100, evidencias con fuente/productor/corte y resumen institucional sin duplicar horas de proyectos multiarea. Exportación de reporte con trazabilidad.
- [x] Documentar contratos exactos en `docs/GESTION-API.md` para la UI.
- [x] Aplicar schema de forma aditiva, generar Prisma y pasar las pruebas de dominio/TypeScript.

Pruebas de referencia:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDistribution, summarizeResources } from '../lib/gestion/domain';
test('rechaza distribución incompleta', () => {
  assert.throws(() => validateDistribution([{ areaId: 'a', percent: 60 }]));
});
test('no combina importes de monedas diferentes', () => {
  const totals = summarizeResources([
    { kind: 'PERSONA', quantity: 2, unit: 'horas', unitRate: 10, currency: 'COP' },
    { kind: 'MAQUINA', quantity: 3, unit: 'horas', unitRate: 1, currency: 'USD' },
  ]);
  assert.deepEqual(totals.costs, [{ currency: 'COP', amount: 20 }, { currency: 'USD', amount: 3 }]);
});
```

Comando: `pnpm exec tsx --test tests/gestion-domain.test.ts`. Revisores de cumplimiento y TypeScript revisarán esta tarea antes de continuar.

## Tarea 2 — Formulario y gestión de tickets

**Archivos:** `app/solicitar/page.tsx`, `app/dashboard/requerimientos/page.tsx`, `app/dashboard/requerimientos/[id]/page.tsx`, componentes bajo `components/gestion`, navegación `components/sidebar.tsx` y enlace en proyectos.

- [x] Probar que `/solicitar` es accesible sin sesión y que enviar campos incompletos no crea ticket.
- [x] Construir formulario por secciones: contacto, problema/resultado, beneficiarios/fuentes, entregables/criterios y fecha/motivo. Mostrar número de ticket al confirmar recepción; no mostrar datos internos.
- [x] Construir bandeja con filtros de estado/responsable/área/proyecto, estados vacíos y errores visibles, enlace para copiar formulario y configuración de aprobadores por admin.
- [x] Construir detalle con resumen, responsable/proyecto, reuniones, versiones de alcance, decisiones, cambios e historial cronológico. Ocultar acciones no autorizadas y mostrar por qué falta configurar aprobador.
- [x] Permitir creación explícita de proyecto desde ticket aprobado y consumo de las acciones de API documentadas.
- [x] Comprobar recepción → asignación → reunión → alcance → pendiente de aprobación, y rechazo de transición sin permiso.
- [x] Revisar cumplimiento y calidad, y corregir antes de continuar.

Verificación adicional: conflictos 409 conservan el borrador en el formulario y en un panel de recuperación cuando otra actualización cambia el flujo y oculta la acción. Probado en navegador y ticket temporal retirado.

Estados que la UI debe distinguir:

```ts
const estados = ['RECIBIDO', 'EN_LEVANTAMIENTO', 'PENDIENTE_APROBACION',
  'APROBADO', 'EN_EJECUCION', 'ENTREGADO', 'CERRADO', 'RECHAZADO', 'CANCELADO'];
```

## Tarea 3 — Esfuerzo y aporte institucional

**Archivos:** `app/dashboard/esfuerzo/page.tsx`, `app/dashboard/aporte/page.tsx`, componentes correspondientes en `components/gestion`, enlaces en `app/dashboard/reportes/page.tsx` y `app/dashboard/proyectos/page.tsx`.

- [x] Crear pantalla de consumos con fecha, proyecto/ticket/tarea, persona/recurso, cantidad/unidad, descripción y tarifa/moneda opcionales. Mostrar plan vigente frente a ejecución y origen de cada estimación.
- [x] Crear catálogo de áreas editable por admin sin precargar subdirecciones inventadas.
- [x] Crear editor por proyecto de distribución de beneficio con justificación y suma visible. No interpretar ausencia de distribución como aporte cero.
- [x] Crear registro de evidencias con productor/responsable técnico/fuente/fecha de corte/validación/destinatarios.
- [x] Mostrar resumen institucional con conteo único de proyectos, métricas separadas y aviso de horas compartidas entre áreas. Exportar el reporte con procedencia.
- [x] Comprobar que 60+40 permite guardar, 60+30 no permite, y proyecto multiarea no duplica total institucional.
- [x] Revisar cumplimiento y calidad.

## Tarea 4 — Integración y entrega

- [x] Verificar TypeScript, pruebas de dominio y API contra base local, más recorrido de navegador del formulario y pantallas privadas.
- [x] Ejecutar revisiones de cumplimiento del diseño y seguridad/calidad, corregir hallazgos y revalidar.
- [x] Confirmar conservación de proyectos/tareas/usuarios históricos. Eliminar únicamente registros creados explícitamente para las pruebas.
- [x] Actualizar `README-LOCAL.md`, `STATUS.md` y estado del diseño con resultado verificado y límites de configuración pendientes.
- [x] Mostrar la aplicación local y comunicar URLs de formulario y módulos, sin publicación externa.

Verificado por Codex: 15 pruebas unitarias, 5 pruebas HTTP/flujo, TypeScript y lint de los módulos nuevos; recorridos de navegador de recepción, borradores tras conflictos, recursos, distribuciones y enlaces filtrados desde proyectos. Registros de prueba retirados; datos originales conservados.
