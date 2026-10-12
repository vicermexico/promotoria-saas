/**
 * id_status de una tarea: la app móvil lo escribe directo por PUT /tasks/:id
 * con su propio vocabulario (1-8); el enum TASK_STATUS del backend
 * (core/constants/status.constants.ts, 0-7 con otros significados) casi no
 * se usa en la práctica — ver memoria del proyecto. Esta es la fuente de
 * verdad real, hay que mantenerla igual a `_statusLabel` en
 * promotoria-app/lib/features/home/presentation/screens/dashboard_screen.dart.
 */
export interface TaskStatusInfo {
  label: string
  dot: string
  bg: string
  text: string
}

export const TASK_STATUS: Record<number, TaskStatusInfo> = {
  0: { label: "Cancelada", dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  1: { label: "Pendiente asignación", dot: "bg-warning", bg: "bg-warning/15", text: "text-warning-foreground dark:text-warning" },
  2: { label: "Aceptada", dot: "bg-info", bg: "bg-info/10", text: "text-info" },
  3: { label: "En camino", dot: "bg-orange-500", bg: "bg-orange-500/10", text: "text-orange-600" },
  4: { label: "Llegó al establecimiento", dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-600" },
  5: { label: "Iniciada", dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
  6: { label: "En revisión", dot: "bg-teal-500", bg: "bg-teal-500/10", text: "text-teal-600" },
  7: { label: "Finalizada", dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  8: { label: "Terminada con incidencia", dot: "bg-destructive", bg: "bg-destructive/15", text: "text-destructive" },
  9: { label: "Rechazada por el cliente · en revisión del master", dot: "bg-warning", bg: "bg-warning/15", text: "text-warning-foreground dark:text-warning" },
}

const UNKNOWN_STATUS: TaskStatusInfo = {
  label: "Desconocido",
  dot: "bg-muted-foreground",
  bg: "bg-muted",
  text: "text-muted-foreground",
}

export const getTaskStatus = (id_status: number): TaskStatusInfo =>
  TASK_STATUS[id_status] ?? UNKNOWN_STATUS

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS).map(([value, info]) => ({
  value,
  label: info.label,
}))
