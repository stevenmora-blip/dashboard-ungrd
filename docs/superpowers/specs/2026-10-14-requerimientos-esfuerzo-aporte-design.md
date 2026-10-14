# Propuesta: requerimientos, esfuerzo y aporte institucional

Preparada por **Codex** el **14 de octubre de 2026**. Estado: diseño aprobado por el usuario; implementación local terminada y verificada por Codex.

## Objetivo solicitado

El Dashboard de Proyectos UNGRD debe evidenciar qué solicita la entidad, quién recoge y ejecuta cada requerimiento, quién lo aprueba, cuánto esfuerzo consume y qué áreas se benefician. Los cambios de alcance deben mostrar su efecto sobre esfuerzo, recursos y fechas. Los reportes deben conservar la procedencia y el reconocimiento del trabajo que produce la información.

El usuario suministrará la lista de usuarios en otro momento. EDAN queda fuera de esta etapa por indicación expresa. No se crearán identidades para Carolina o Claudia sin sus datos reales ni se sustituirá la lista de usuarios actual.

## Alternativas y recomendación

1. **Módulo integrado en el dashboard, recomendado.** Un formulario alimenta tickets; cada ticket enlaza responsable, reuniones, decisiones, proyecto, cambios y consumos. Centraliza la trazabilidad y reutiliza autenticación, proyectos y exportaciones existentes. Requiere añadir modelos y pantallas.
2. **Formulario independiente y registro manual.** Permite recibir información rápidamente, pero deja la asignación, aprobación y conciliación con proyectos y consumos como trabajo manual. No satisface por sí solo la trazabilidad solicitada.

La propuesta desarrolla la primera alternativa. La primera entrega será local, en la aplicación existente. Compartir el formulario con otras personas requerirá un destino accesible por ellas (servidor o intranet); una dirección localhost sólo funciona en el computador donde corre el software. Esta etapa no incluye publicación ni envío de mensajes.

## 1. Formulario y tickets

### Captura de la solicitud

Formulario con nombre y correo del solicitante, área solicitante, título, problema actual, resultado esperado, usuarios/áreas beneficiarias, información disponible y fuentes, entregables solicitados, fecha deseada, motivo de esa fecha y criterios con los que el área aceptaría el resultado. Permitir guardar enlaces a documentos de referencia. La fecha deseada no se convierte automáticamente en compromiso del equipo.

Al enviarlo, generar un número único de ticket y conservar la fecha de recepción. Mostrar un comprobante con ese número. El formulario de recepción no expone la lista interna de usuarios ni el historial de los demás tickets.

### Atención del requerimiento

Bandeja con filtros por estado, responsable, área y proyecto. El administrador asigna a un integrante real del equipo como responsable del levantamiento: esa persona coordina con el solicitante, registra la reunión y prepara el alcance para decisión.

Cada reunión conserva fecha, participantes, resumen, necesidades aclaradas, acuerdos y enlaces a evidencia. Registrar reuniones ya realizadas; la aplicación no enviará invitaciones automáticamente.

Flujo propuesto:

**Recibido → En levantamiento → Pendiente de aprobación → Aprobado → En ejecución → Entregado → Cerrado.**

También permitir **Rechazado** y **Cancelado**, con motivo obligatorio. Una solicitud que necesite aclaraciones puede volver al levantamiento dejando el evento correspondiente. Una decisión de rechazo conserva la solicitud y todo su historial.

Antes de solicitar aprobación se registra alcance, entregables, criterios de aceptación, estimación de horas de trabajo, estimación de recursos y fecha propuesta. La aprobación identifica persona, fecha, decisión, observación y versión de alcance. Sólo una persona habilitada para aprobar podrá registrar la decisión; el nombre escrito en una nota no equivale a una aprobación autenticada.

La configuración permitirá habilitar aprobadores cuando estén disponibles sus usuarios reales. Hasta entonces, los tickets podrán avanzar en recepción y levantamiento; la interfaz mostrará que hace falta configurar un aprobador para pasar esa etapa. No asignar ese papel a cuentas inventadas.

Relacionar cada ticket con un proyecto existente o crear un proyecto a partir de una solicitud aprobada mediante acción explícita. Los proyectos históricos podrán recibir tickets nuevos sin inventar aprobaciones pasadas.

### Trazabilidad

Historial cronológico de recepción, asignaciones, reuniones, cambios de estado, versiones de alcance, decisiones y entrega. Cada evento registra actor, fecha y contenido. Decisiones y eventos anteriores no se sobrescriben; las correcciones se registran como eventos nuevos.

## 2. Esfuerzo, recursos y cambios de alcance

### Plan y ejecución

Registrar estimaciones asociadas a la versión de alcance presentada para aprobación. Registrar consumos reales con fecha, proyecto, ticket opcional, tarea opcional, persona o recurso, cantidad, unidad y descripción del trabajo.

Mantener separados:

- **Horas de trabajo:** por persona, actividad y proyecto.
- **Horas de máquina:** por equipo o servicio utilizado.
- **Tecnología y otros recursos:** servicio/recurso, cantidad y unidad explícita.

Se podrán registrar tarifas para calcular importes. Si falta una tarifa, mostrar el consumo físico y el importe como no calculado; no tratarlo como costo cero. No sumar horas de trabajo, horas de máquina y cantidades de otras unidades en un único total. Los reportes separan monedas cuando existan importes.

### Cambios de alcance

Cada ampliación se registra como solicitud de cambio vinculada al ticket y al proyecto. Conservar qué se agregó o modificó, el motivo, quién lo pidió, horas adicionales estimadas, recursos adicionales y efecto propuesto sobre la entrega.

La aprobación de un cambio crea una nueva versión del alcance y del plan. Un cambio pendiente o rechazado no altera el compromiso aprobado. El reporte compara alcance inicial, cambios aprobados y ejecución real, y permite consultar las versiones anteriores.

No convertir el registro de esfuerzo en una prohibición automática de cambios. Su función es hacer visible el compromiso adicional y sustentar la decisión.

## 3. Aporte institucional y reportes

### Áreas beneficiarias

Sustituir la limitación de una sola subdirección en texto por un catálogo administrable y una relación de varios beneficiarios por proyecto. Conservar el campo histórico para consulta y migrarlo sólo cuando exista una correspondencia confirmada.

El usuario confirmará los nombres oficiales de las tres subdirecciones posteriormente. También se podrán registrar otras áreas beneficiarias. La primera entrega permitirá configurar ese catálogo; no inventará nombres ni repartirá porcentajes automáticamente sobre los datos históricos.

### Tres indicadores diferentes

1. **Avance:** progreso de tareas y entregables.
2. **Esfuerzo:** consumos registrados y comparación con lo estimado.
3. **Aporte/beneficio:** áreas que usan o reciben los productos, distribución declarada de beneficio y evidencias de resultados.

La distribución declarada de beneficio de cada proyecto suma 100% entre sus áreas beneficiarias. Debe conservar responsable de la valoración, fecha y justificación. No presentarla como porcentaje observado de impacto institucional. Los proyectos sin valoración aparecen como **sin distribución registrada**, no como aporte cero.

El beneficio observado se sustenta con registros concretos: entregable compartido, área receptora, uso documentado, usuarios atendidos, reporte consumido o indicador con fuente y fecha. En esta etapa esas evidencias se registran manualmente; no se afirmará una medición automática de consumo de sistemas externos.

El resumen mostrará proyectos que benefician a cada área, distribución de beneficio declarada por proyecto, entregables y evidencias, y esfuerzo total de los proyectos relacionados. Cuando un proyecto beneficia a varias áreas, advertir que sus horas son compartidas: el agregado institucional cuenta cada proyecto una sola vez. No sumar subtotales por área para producir un total duplicado.

### Procedencia y reconocimiento del trabajo

Cada entregable o evidencia conserva equipo productor, responsable técnico, fuentes de información, fecha de corte, responsable de validación cuando aplique y áreas destinatarias. Los reportes exportados conservan estos datos y enlazan al proyecto/ticket correspondiente.

El reporte ejecutivo permitirá responder: qué se solicitó, qué se acordó, quién decidió, qué cambió, cuánto se invirtió, qué se entregó y a qué áreas benefició.

## Encaje en el software actual

Reutilizar Next.js App Router, PostgreSQL/Prisma, NextAuth, los componentes visuales y las herramientas de exportación existentes. Añadir módulos de **Requerimientos**, **Esfuerzo y recursos** y **Aporte institucional**, enlazados desde los proyectos. Ampliar Reportes con la vista ejecutiva sin eliminar el reporte individual actual.

Modelos nuevos previstos: catálogo de áreas, ticket, reunión, evento de ticket, versión de alcance, decisión de aprobación, solicitud de cambio, consumo de recurso, beneficiario de proyecto y evidencia de aporte. Los consumos y las decisiones se relacionan con identidades reales, no con nombres sueltos de demostración.

Permisos: administración del catálogo y asignaciones para administradores; acceso del responsable a sus tickets y consumos; aprobación para usuarios habilitados específicamente; recepción del formulario sin acceso al resto del dashboard. Las API deben verificar los permisos en servidor.

Cambios de base aditivos sobre la instancia local propia `127.0.0.1:55432/dashboard_ungrd`, con respaldo antes de migrar. Ninguna eliminación de proyectos, tareas o usuarios históricos forma parte de esta etapa.

## Comprobación de aceptación

- Enviar el formulario crea un ticket único y un evento de recepción.
- Asignar responsable y registrar reunión deja trazabilidad consultable.
- Solicitar aprobación requiere alcance y estimación; aprobar requiere usuario autorizado.
- Rechazar conserva el historial y exige motivo.
- Un cambio pendiente no modifica el plan; aprobarlo crea una versión nueva.
- Registrar consumos permite contrastar estimado/real, sin mezclar unidades ni monedas.
- Distribuciones inválidas no se guardan; falta de información se muestra explícitamente.
- Un proyecto con varias áreas no duplica sus horas en el total institucional.
- Un reporte conserva equipo productor, fuente y fecha de corte.
- Formulario, API y permisos se prueban con sesiones de distintos roles y solicitudes sin sesión.
- La información histórica permanece disponible tras la migración.

## Orden propuesto

Primero tickets, formulario y trazabilidad; después esfuerzo y cambios de alcance; finalmente aporte institucional y reporte ejecutivo. Los catálogos de usuarios y subdirecciones se completarán cuando el usuario entregue sus datos. EDAN no forma parte de esta implementación.

## Revisión de la propuesta

Se contrastó con las rutas, permisos, esquema Prisma y reportes existentes. Actualmente no hay modelos de tickets ni consumos de horas. El campo `Project.subdireccion` contiene OAPI, Subdirección de Manejo y valores vacíos, por lo que no acredita un catálogo completo de las tres subdirecciones. La propuesta separa métricas declaradas y observadas, conserva versiones y evita doble conteo.
