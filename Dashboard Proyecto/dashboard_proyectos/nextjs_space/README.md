# Dashboard de Proyectos - UNGRD

Sistema de gestión y seguimiento de proyectos de Data Lakehouse para UNGRD.

## Características

### Sistema de Autenticación
- Login con email y contraseña
- Dos roles: **Administrador** y **Usuario**
  - **Administradores**: Acceso completo, gestión de usuarios, edición de todas las tareas
  - **Usuarios**: Solo ven y editan sus propias tareas asignadas

### Dashboard Principal
- **Panel de Resumen**: Proyectos activos, total tareas, tareas atrasadas, tasa de completitud
- **Gráficos Interactivos**:
  - Progreso por proyecto (barras horizontales)
  - Distribución por estado (pie/dona)
  - Productividad por persona (barras apiladas)
- **Tabla de Productividad**: Comparación de métricas por responsable

### Gestión de Tareas
- Filtros dinámicos: proyecto, responsable, estado, prioridad, fechas
- Búsqueda en tiempo real
- Edición inline de campos
- Indicadores visuales para tareas atrasadas y prioridad alta
- Ordenamiento por cualquier columna

### Proyectos
- Vista de todos los proyectos con progreso
- Desglose por fases y entregables
- Barras de progreso visuales

### Equipo
- Ranking de productividad
- Estadísticas por persona
- Métricas de completitud

### Reportes y Exportación
- **Exportar a Excel**: Todas las tareas con filtros aplicados
- **Reporte Ejecutivo**: HTML/PDF con métricas y tablas

### Notificaciones
- Sistema de alertas para tareas atrasadas
- Resumen de tareas por vencer
- Tareas bloqueadas

### Gestión de Usuarios (Admin)
- Crear/editar/desactivar usuarios
- Asignar roles
- Vincular con responsables del sistema

## Tecnologías

- **Framework**: Next.js 14 con App Router
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Gráficos**: Recharts
- **Estilos**: Tailwind CSS
- **Exportación**: xlsx

## Estructura de Datos

Jerarquía: **Proyecto → Fase → Entregable → Tarea → Responsable**

### Campos de Tarea
- Estado: Pendiente, En Progreso, Completado, Bloqueado
- Prioridad: Alta, Media, Baja
- Fechas planificadas y reales
- Porcentaje de avance (0-100%)
- Horas estimadas y reales
- Comentarios y bloqueadores

## Uso

1. Iniciar sesión con credenciales de administrador
2. Navegar por el dashboard para ver resúmenes
3. Usar filtros en Tareas para encontrar tareas específicas
4. Editar tareas haciendo clic en el botón de edición
5. Exportar reportes desde la sección Reportes
6. Gestionar usuarios desde Configuración (solo admin)

## Datos Importados

Se importaron datos desde el archivo Excel "Planes de trabajo.xlsx":
- 7 proyectos de implementación de Data Lakehouse
- 170 tareas únicas
- 58 responsables
- Planificación de 11 semanas
