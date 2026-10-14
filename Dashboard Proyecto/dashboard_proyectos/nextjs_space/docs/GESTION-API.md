# Gestión UNGRD — contrato API local

Todos los campos de texto son texto plano, sin `<`, `>` ni NUL. Fechas civiles `YYYY-MM-DD`; instantes ISO con zona. Enlaces sólo HTTP(S), sin credenciales. Cuerpo JSON máximo 64 KiB, recepción 32 KiB. Errores `{error,issues?}` con HTTP 400/401/403/409/413/415/429. Sesión NextAuth y usuario activo releído de BD. Privadas no permiten Origin externo. Ninguna API envía notificaciones ni consulta enlaces.

## Recepción pública

`POST /api/solicitudes` con `{requesterName,requesterEmail,area,title,problem,expectedResult,beneficiaries,sources,deliverables,acceptanceCriteria,desiredDate?,desiredDateReason?,referenceLinks?:string[]}`. Todas las cadenas sin `?` obligatorias. Si hay fecha deseada requiere motivo. 201 `{number,createdAt}`: no devuelve datos privados ni permite consultar tickets. Formulario `/solicitar`. Cuota global de 30 recepciones confirmadas por minuto civil, compartida entre instancias mediante PostgreSQL, sin usar XFF. Los cuerpos inválidos y las transacciones fallidas no consumen cuota; la recepción y la cuota se confirman juntas.

## Catálogos y configuración

`GET /api/gestion/catalogos` devuelve `{identity:{id,name,email,role,canApproveRequests},users:[{id,name,email,canApproveRequests}],projects:[{id,name,tasks:[{id,name}]}],areas:[{id,name}]}`. Usuarios/áreas activos; proyectos activos filtrados por administrador o membresía/asignación real del responsable enlazado al usuario. No devuelve contraseñas/tokens.

`GET /api/gestion/configuracion` administrador: `{users,areas}`; áreas incluyen inactivas.

`PATCH /api/gestion/configuracion` administrador: `{action:'approver',userId,canApproveRequests:boolean}` o `{action:'area',id?,name,isActive?:boolean}`. No crea usuarios; aprobadores inicialmente deshabilitados. Escrituras auditadas.

## Tickets

`GET /api/gestion/tickets?status=&ownerId=&area=&projectId=` devuelve array de tickets con `owner`, `approver`, `project` (identidades sanitizadas). Administrador ve todos; otros sólo designados como propietario/aprobador. Orden recepción descendente, máximo 500.

`GET /api/gestion/tickets/[id]` devuelve ticket completo con `events`, `meetings`, `scopeVersions`, `decisions`, `scopeChanges`, `resourceConsumptions` y `comparison:{baseline,current,actual}`. Alcances baseline/current son versiones completas o null; actual separa cantidades y monedas.

`POST /api/gestion/tickets/[id]/acciones`: todas las acciones llevan `action` y `expectedUpdatedAt` exactamente del último GET; conflictos 409. Respuesta: ticket completo actualizado. Transacciones serializables y comparación atómica. Campos adicionales por acción:

| action | Campos | Permiso/regla |
|---|---|---|
| assign | ownerId, approverId?:string/null | Admin; usuario activo; aprobador activo habilitado; recibido/levantamiento |
| meeting | heldAt,participants,summary,clarifiedNeeds,agreements,evidenceLinks?:string[] | Responsable/admin; levantamiento |
| scope | scope,deliverables,acceptanceCriteria,laborHours:number,machineHours:number,resourceNotes,proposedDate | Responsable/admin; levantamiento; crea versión inmutable, horas >=0 |
| submit | scopeVersionId,approverId | Responsable/admin; debe tener propietario activo y versión propia válida; aprobador activo habilitado |
| approve | reason?:string | Sólo usuario designado habilitado; pendiente; fija baseline/current |
| reject | reason | Sólo aprobador designado habilitado; pendiente; conserva historial |
| clarify | reason | Sólo aprobador designado habilitado; pendiente→levantamiento; conserva decisión |
| cancel | reason | Responsable/admin; estado no terminal |
| transition | status:EN_EJECUCION/ENTREGADO/CERRADO,note | Responsable/admin; siguiente estado válido |
| attachProject | projectId | Admin; proyecto activo existente; adjunta explícitamente |
| createProject | name,description | Admin; ticket aprobado y sin proyecto; crea/adjunta explícitamente |
| requestChange | baseScopeVersionId,additions,reason,requestedBy,additionalLaborHours,additionalMachineHours,resourceNotes,proposedDate | Responsable/admin; aprobado/en ejecución y proyecto explícitamente vinculado; base=current; crea pendiente sin alterar plan |
| approveChange | changeId,reason?:string | Sólo aprobador designado habilitado; base aún=current; crea nueva versión sumando horas y anexando textos |
| rejectChange | changeId,reason | Sólo aprobador designado habilitado; conserva plan |

Estados: RECIBIDO,EN_LEVANTAMIENTO,PENDIENTE_APROBACION,APROBADO,EN_EJECUCION,ENTREGADO,CERRADO,RECHAZADO,CANCELADO. No existen endpoints de borrar/editar historial. Solicitud de aprobación siempre elige versión y aprobador expresos.

## Esfuerzo y recursos

`GET /api/gestion/recursos?projectId=&ticketId=&from=YYYY-MM-DD&to=YYYY-MM-DD` → `{records,summary,plans}`. `records` con persona/proyecto/ticket/tarea sanitizados; `summary:{quantities:[{kind,unit,quantity}],costs:[{currency,amount}],unpricedCount}`; `plans:[{ticketId,number,baseline,current,actual}]` (historial completo en detalle de ticket). Sólo proyectos autorizados y tickets visibles; máximo 5000 registros, `truncated` indica límite.

`POST /api/gestion/recursos` → 201 registro. JSON `{projectId,ticketId?,taskId?,kind:PERSONA/MAQUINA/TECNOLOGIA/OTRO,personId?,resourceName?,quantity:number,unit,unitRate?:number,currency?:string,day,description}`. PERSONA exige identidad activa y no resourceName; otros exigen resourceName y no personId. No admin sólo registra su propia persona y proyectos por membresía/asignación; si incluye ticket debe ser suyo. Tarea/ticket deben pertenecer al proyecto. Tarifas >=0 y moneda ISO 3 letras juntas; sin ambas, importe no calculado. Cantidades >0 finitas. PERSONA y MAQUINA requieren unidad canónica `horas`, para comparar con el plan. No mezcla unidades/kinds ni monedas.

## Aporte

`GET /api/gestion/aporte?projectId=` → `{projects,summary,areas}`. Cada proyecto incluye `distributions` (todas las versiones con beneficiaries y area), `evidence` (con recipients.area), `resources`, `resourceSummary`, `hasDistribution`. `summary:{projectCount,withoutDistribution,resources}` cuenta proyectos únicos. Áreas comparten horas de proyectos; no se suman sus subtotales como total institucional. Distribución es declaración de beneficio, no impacto observado.

`POST /api/gestion/aporte` administrador, 201:

- `{action:'distribution',projectId,expectedVersion:number,reason,assessedAt,beneficiaries:[{areaId,percent:number}]}`. expectedVersion=0 si ninguna; última versión en otro caso. Áreas activas únicas; porcentajes positivos finitos suman100 con tolerancia 0.000001. Valorador es identidad autenticada; cada registro crea versión inmutable.
- `{action:'evidence',projectId,title,areaIds:string[],producerTeam,technicalResponsible,source,cutoffDate,validationResponsible?,url?,description,result}`. Áreas activas únicas. Responsable técnico/validación son atribución documental en texto (no aprobación autenticada); equipo/fuente/corte obligatorios. Conserva quién registró evidencia.

## Reporte ejecutivo

`GET /api/gestion/reporte?projectId=&ticketId=` devuelve descarga JSON UTF-8 (`gestion-ungrd.json`) con `generatedAt`, `generatedBy`, `tickets` (historial íntegro), `resources`, `resourceSummary`, `projects` (distribuciones, evidencias/procedencia), `summary`. Sin filtros exporta alcance autorizado. Filtrar un proyecto/ticket fuera de permisos responde403. JSON conserva cantidades numéricas y textos sin ejecutar HTML ni fórmulas. Sin distribución aparece explícito, sin tarifa conserva null.

`?format=html` abre un reporte imprimible en español con tablas, todas las versiones, reuniones/eventos/decisiones y atribución de evidencias. Textos escapados, sin scripts ni consultas externas; CSP restringida. Usar Imprimir del navegador para PDF. JSON es el formato predeterminado.

El reporte HTML enlaza cada ticket y proyecto al dashboard con origen tomado de NEXTAUTH_URL (validado HTTP(S), sin credenciales) y los identificadores codificados. Los enlaces funcionan desde un archivo exportado.

Los filtros `ticketId`, `projectId`, `from` y `to` del reporte se aplican a los mismos consumos en el nivel superior, cada proyecto y el total institucional. Al filtrar ticket sólo aparece su proyecto vinculado; un ticket sin proyecto conserva su historia y exporta `projects:[]`. Distribuciones/evidencias corresponden únicamente al proyecto relevante.

La relación de consumos con tareas usa FK compuesta `(taskId,projectId)` hacia `(Task.id,Task.projectId)`, con actualización y eliminación restringidas. No se puede mover a otro proyecto ni borrar una tarea con consumos registrados; la API de tareas responde409 y conserva el proyecto histórico.
