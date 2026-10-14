import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Loader2, ArrowLeft, Receipt, Store, User, ClipboardList, Eye, Lock, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react"

import { OrderDTO, TaskDTO, PromoterDTO } from "@/dtos"
import { api, ApiResponse, formatDate } from "@/lib"
import { useAuthStore } from "@/stores/authStore"
import {
  Button, Card, CardContent,
  PageWrapper, PageHeader,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Textarea, Checkbox,
} from "@/components"
import { getTaskStatus } from "../tareas/utils"

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v)

export function PedidoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isSuperAdmin } = useAuthStore()

  const [order, setOrder] = useState<OrderDTO | null>(null)
  const [tasks, setTasks] = useState<TaskDTO[]>([])
  const [promotores, setPromotores] = useState<PromoterDTO[]>([])
  const [loading, setLoading] = useState(true)

  const [assignModal, setAssignModal] = useState<{ open: boolean; task: TaskDTO | null; saving: boolean }>({
    open: false, task: null, saving: false,
  })
  const [selectedPromoter, setSelectedPromoter] = useState<string>("")

  const [closeDialog, setCloseDialog] = useState(false)
  const [closing, setClosing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [approvingTaskId, setApprovingTaskId] = useState<number | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; task: TaskDTO | null }>({ open: false, task: null })
  const [rejectComment, setRejectComment] = useState("")
  const [rejecting, setRejecting] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  const esMaster = useAuthStore.getState().user?.i_rol === 1
  const approvableTasks = esMaster ? [] : tasks.filter((t) => t.id_status === 6)

  const toggleTaskSelected = (id_task: number) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id_task)) next.delete(id_task)
      else next.add(id_task)
      return next
    })
  }

  const toggleSelectAllApprovable = () => {
    setSelectedTaskIds((prev) =>
      prev.size === approvableTasks.length ? new Set() : new Set(approvableTasks.map((t) => t.id_task))
    )
  }

  const handleBulkApprove = async () => {
    if (selectedTaskIds.size === 0) return
    setBulkApproving(true)
    try {
      const results = await Promise.allSettled(
        [...selectedTaskIds].map((id) => api.patch<ApiResponse<TaskDTO>>(`/tasks/${id}/approve`))
      )
      const fallidas = results.filter((r) => r.status === "rejected").length
      if (fallidas > 0) {
        toast.error(`${fallidas} tarea(s) no se pudieron aprobar`)
      } else {
        toast.success(`${selectedTaskIds.size} tarea(s) aprobada(s)`)
      }
      setSelectedTaskIds(new Set())
      await fetchAll()
    } finally {
      setBulkApproving(false)
    }
  }

  const handleApproveTask = async (task: TaskDTO) => {
    setApprovingTaskId(task.id_task)
    try {
      const resp = await api.patch<ApiResponse<TaskDTO>>(`/tasks/${task.id_task}/approve`)
      if (!resp.ok) {
        toast.error(resp.message || "No se pudo aprobar la tarea")
        return
      }
      toast.success("Tarea aprobada")
      await fetchAll()
    } catch {
      toast.error("Error al aprobar la tarea")
    } finally {
      setApprovingTaskId(null)
    }
  }

  const handleRejectTask = async () => {
    if (!rejectDialog.task) return
    if (!rejectComment.trim()) {
      toast.error("Indica el motivo del rechazo")
      return
    }
    setRejecting(true)
    try {
      const resp = await api.patch<ApiResponse<TaskDTO>>(`/tasks/${rejectDialog.task.id_task}/cancel`, {
        comment: rejectComment.trim(),
      })
      if (!resp.ok) {
        toast.error(resp.message || "No se pudo rechazar la tarea")
        return
      }
      toast.success("Tarea rechazada")
      setRejectDialog({ open: false, task: null })
      setRejectComment("")
      await fetchAll()
    } catch {
      toast.error("Error al rechazar la tarea")
    } finally {
      setRejecting(false)
    }
  }

  const handleExportAll = async () => {
    if (!order || tasks.length === 0) return
    setExporting(true)
    try {
      const XLSX = await import("xlsx")

      // Trae el checklist completo (productos, preguntas, respuestas, fotos)
      // de cada tarea del pedido, para poder armar las hojas de Existencias
      // y Evidencias. Una tarea individual ya se ve asi en tareas.detalle.tsx.
      const details = await Promise.all(
        tasks.map((t) =>
          api.get<ApiResponse<TaskDTO>>(`/tasks/${t.id_task}/checklist`).catch(() => null)
        )
      )

      const pedidosRows = tasks.map((t) => ({
        "ID Tarea": t.id_task,
        "Folio": t.vc_folio ?? "",
        "Tienda": t.store?.name ?? `Tienda #${t.id_store}`,
        "Solicitud": t.request?.vc_name ?? "",
        "Estatus": getTaskStatus(t.id_status).label,
        "Promotor": t.promoter ? `${t.promoter.name} ${t.promoter.lastname}`.trim() : "Sin asignar",
        "Valor": Number(t.request?.f_value ?? 0),
      }))

      const existenciasRows: Record<string, unknown>[] = []
      const evidenciasRows: Record<string, unknown>[] = []

      details.forEach((resp, idx) => {
        const t = tasks[idx]
        const tiendaNombre = t.store?.name ?? `Tienda #${t.id_store}`
        const full = resp?.data
        if (!full) return

        if (full.arrangement_photo_url || full.arrangement_photo_after_url) {
          evidenciasRows.push({
            "ID Tarea": t.id_task,
            "Tienda": tiendaNombre,
            "Tipo": "Foto de acomodo (antes)",
            "URL": full.arrangement_photo_url ?? "",
          })
          evidenciasRows.push({
            "ID Tarea": t.id_task,
            "Tienda": tiendaNombre,
            "Tipo": "Foto de acomodo (después)",
            "URL": full.arrangement_photo_after_url ?? "",
          })
        }

        for (const rp of full.request?.request_products ?? []) {
          for (const rpq of rp.request_product_questions) {
            const answer = full.myAnswers?.find(
              (a) => a.id_request_product_question === rpq.id_request_product_question
            )
            if (rpq.question.question_type === "numeric") {
              existenciasRows.push({
                "ID Tarea": t.id_task,
                "Tienda": tiendaNombre,
                "Producto": rp.product.name,
                "Pregunta": rpq.question.question,
                "Cantidad": answer?.vc_answer ?? "",
              })
            }
            if (rpq.question.question_type === "photo" && answer?.vc_image_url) {
              evidenciasRows.push({
                "ID Tarea": t.id_task,
                "Tienda": tiendaNombre,
                "Tipo": `Evidencia: ${rp.product.name} — ${rpq.question.question}`,
                "URL": answer.vc_image_url,
              })
            }
          }
        }
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidosRows), "Pedidos")
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(existenciasRows.length ? existenciasRows : [{ "Sin datos": "" }]),
        "Existencias"
      )

      const evidenciasSheet = XLSX.utils.json_to_sheet(
        evidenciasRows.length ? evidenciasRows : [{ "Sin datos": "" }]
      )
      if (evidenciasRows.length > 0) {
        // "URL" es la 4ta columna (D): ID Tarea, Tienda, Tipo, URL. Le
        // agregamos el hyperlink real a cada celda para que sea clicleable
        // en Excel, no solo texto plano.
        evidenciasRows.forEach((row, i) => {
          const url = row["URL"]
          if (!url) return
          const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 3 })
          const cell = evidenciasSheet[cellRef]
          if (cell) cell.l = { Target: String(url), Tooltip: "Abrir imagen" }
        })
      }
      XLSX.utils.book_append_sheet(wb, evidenciasSheet, "Evidencias")

      XLSX.writeFile(wb, `Pedido_${String(order.id_order).padStart(4, "0")}.xlsx`)
    } catch {
      toast.error("Error al exportar la orden")
    } finally {
      setExporting(false)
    }
  }

  const fetchAll = async () => {
    if (!id) return
    const orderId = Number(id)
    try {
      setLoading(true)
      // Promise.allSettled en vez de Promise.all: si el cliente (negocio) no
      // tiene permiso para /promoters (endpoint solo de admin, usado nada
      // mas para "Cambiar promotor"), esa llamada falla sola sin tumbar el
      // pedido ni las tareas, que si debe poder ver cualquier rol.
      const [orderResult, tasksResult, promotoresResult] = await Promise.allSettled([
        api.get<ApiResponse<OrderDTO>>(`/orders/${orderId}`),
        api.get<ApiResponse<{ data: TaskDTO[]; meta: unknown }>>(`/tasks?id_order=${orderId}&limit=500`),
        (isAdmin() || isSuperAdmin())
          ? api.get<ApiResponse<PromoterDTO[]>>("/promoters")
          : Promise.resolve({ ok: true, error: 0, data: [] as PromoterDTO[] }),
      ])

      if (orderResult.status === "fulfilled") {
        setOrder(orderResult.value.data)
      } else {
        setOrder(null)
      }
      setTasks(tasksResult.status === "fulfilled" ? (tasksResult.value.data?.data || []) : [])
      setPromotores(promotoresResult.status === "fulfilled" ? (promotoresResult.value.data || []) : [])

      if (orderResult.status === "rejected") {
        toast.error("Error al cargar la orden")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleCloseOrder = async () => {
    if (!id) return
    setClosing(true)
    try {
      const resp = await api.patch<ApiResponse<OrderDTO>>(`/orders/${id}/close`)
      if (!resp.ok) {
        toast.error(resp.message || "No se pudo cerrar la orden")
        return
      }
      toast.success("Orden cerrada")
      window.dispatchEvent(new Event("saldo:actualizar"))
      setCloseDialog(false)
      await fetchAll()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Error al cerrar la orden")
      setCloseDialog(false)
    } finally {
      setClosing(false)
    }
  }

  const openAssignModal = (task: TaskDTO) => {
    setAssignModal({ open: true, task, saving: false })
    setSelectedPromoter(task.id_promoter ? String(task.id_promoter) : "")
  }

  const handleAssign = async () => {
    if (!assignModal.task || !selectedPromoter) {
      toast.error("Selecciona un promotor")
      return
    }

    setAssignModal((prev) => ({ ...prev, saving: true }))
    try {
      await api.put<ApiResponse>(`/tasks/${assignModal.task.id_task}/assign`, {
        id_promoter: Number(selectedPromoter),
      })

      const promotor = promotores.find((p) => p.id === Number(selectedPromoter))
      setTasks((prev) =>
        prev.map((t) =>
          t.id_task === assignModal.task!.id_task
            ? {
                ...t,
                id_promoter: Number(selectedPromoter),
                promoter: {
                  id: Number(selectedPromoter),
                  name: promotor?.name ?? "",
                  lastname: promotor?.lastname ?? "",
                  phone: promotor?.phone ?? "",
                },
              }
            : t
        )
      )

      toast.success("Promotor asignado correctamente")
      setAssignModal({ open: false, task: null, saving: false })
    } catch {
      toast.error("Error al asignar el promotor")
      setAssignModal((prev) => ({ ...prev, saving: false }))
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando orden...</p>
        </div>
      </PageWrapper>
    )
  }

  if (!order) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-muted-foreground">Orden no encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/pedidos")}>
            <ArrowLeft size={16} className="mr-2" /> Volver
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const uniqueRequests = [...new Map(
    (order.order_items ?? []).map((i) => [i.id_request, i.request?.vc_name])
  ).entries()]

  // id_status: 1=creada, 2-5=en progreso (asignada/en camino/en ejecucion/
  // enviada a validacion), 6=el promotor ya termino y esta en revision del
  // cliente ("Completada" desde este punto de vista), 7=el cliente ya la
  // aprobo ("Terminada", cierre definitivo).
  const pendientes = tasks.filter((t) => t.id_status === 1).length
  const enProgreso = tasks.filter((t) => t.id_status >= 2 && t.id_status <= 5).length
  const completadas = tasks.filter((t) => t.id_status === 6).length
  const terminadas = tasks.filter((t) => t.id_status === 7).length
  const canceladas = tasks.filter((t) => t.id_status === 8 || t.id_status === 0).length

  return (
    <PageWrapper>
      <PageHeader
        title={`Pedido #${String(order.id_order).padStart(4, "0")}`}
        subtitle={`Creado el ${formatDate(order.dt_register)}`}
        icon={Receipt}
        actions={
          <div className="flex gap-2">
            {tasks.length > 0 && (
              <Button variant="outline" onClick={handleExportAll} disabled={exporting}>
                {exporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileSpreadsheet size={16} className="mr-2" />}
                Exportar todo a Excel
              </Button>
            )}
            {order.id_status === 1 && (
              <Button variant="destructive" onClick={() => {
                  const trabajando = tasks.filter((t) => t.id_status >= 3 && t.id_status <= 5).length
                  if (!esMaster && trabajando > 0) {
                    toast.error(`Hay ${trabajando} visita(s) con un promotor en camino o trabajando. Espera a que terminen para cerrar la orden.`)
                    return
                  }
                  setCloseDialog(true)
                }}>
                <Lock size={16} className="mr-2" /> Cerrar orden
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/pedidos")}>
              <ArrowLeft size={16} className="mr-2" /> Volver a Pedidos
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Sidebar resumen ── */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Resumen de la orden
              </h3>

              {/* Estado */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                {order.id_status !== 1 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 text-destructive text-sm rounded-full">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full" /> Cancelado
                  </span>
                ) : tasks.length > 0 && tasks.every((t) => t.id_status === 7) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" /> Finalizado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success text-sm rounded-full">
                    <div className="w-1.5 h-1.5 bg-success rounded-full" /> Activo
                  </span>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total a pagar</span>
                <span className="font-semibold text-foreground text-lg">{formatCurrency(Number(order.f_total))}</span>
              </div>

              {/* Tareas */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total de tiendas solicitadas</span>
                <span className="font-semibold">{tasks.length}</span>
              </div>

              {/* Progreso tareas */}
              {tasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pendientes por aceptar</span><span className="font-medium text-foreground">{pendientes}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Aceptadas</span><span className="font-medium text-foreground">{enProgreso}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Completadas</span><span className="font-medium text-foreground">{completadas}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Finalizada</span><span className="font-medium text-foreground">{terminadas}</span>
                  </div>
                  {canceladas > 0 && (
                    <div className="flex justify-between text-xs text-destructive">
                      <span>Rechazadas</span><span className="font-medium">{canceladas}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Solicitudes */}
              {uniqueRequests.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Solicitudes</span>
                  <span className="font-semibold">{uniqueRequests.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Lista de tareas ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Store size={20} className="text-muted-foreground" />
              <h2 className="font-semibold text-lg text-foreground">
                Tareas en establecimientos
              </h2>
            </div>
            {approvableTasks.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={selectedTaskIds.size === approvableTasks.length}
                    onCheckedChange={toggleSelectAllApprovable}
                  />
                  Seleccionar todas ({approvableTasks.length} en revisión)
                </label>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={selectedTaskIds.size === 0 || bulkApproving}
                >
                  {bulkApproving
                    ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                    : <CheckCircle2 size={14} className="mr-1.5" />}
                  Aceptar seleccionadas ({selectedTaskIds.size})
                </Button>
              </div>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No hay tareas en este pedido.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const status = task.id_status === 6
                  ? { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info', label: 'Concluida y en revisión por cliente' }
                  : getTaskStatus(task.id_status)
                const promotorNombre = task.promoter
                  ? `${task.promoter.name} ${task.promoter.lastname}`.trim()
                  : null

                return (
                  <Card key={task.id_task} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {task.id_status === 6 && !esMaster && (
                        <Checkbox
                          checked={selectedTaskIds.has(task.id_task)}
                          onCheckedChange={() => toggleTaskSelected(task.id_task)}
                          className="shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            #{task.id_task}
                          </span>
                          <span className="font-semibold truncate text-foreground">
                            {task.store?.name ?? `Tienda #${task.id_store}`}
                          </span>
                        </div>
                        {task.request && (
                          <p className="text-sm truncate text-muted-foreground">
                            {task.request.vc_name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:flex-col sm:items-end">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>

                        <div className="flex flex-col items-end gap-0.5 text-sm">
                          <span className="text-[11px] text-muted-foreground">Promotor que aceptó la tarea</span>
                          <div className="flex items-center gap-1.5">
                            <User size={14} className="text-muted-foreground" />
                            {promotorNombre ? (
                              <span className="font-medium text-foreground">{promotorNombre}</span>
                            ) : (
                              <span className="text-xs font-medium text-warning-foreground dark:text-warning bg-warning/15 px-2 py-0.5 rounded-full">En espera de promotor para aceptar tarea</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {task.id_status === 6 && !esMaster && (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectDialog({ open: true, task })}
                                disabled={approvingTaskId === task.id_task}
                              >
                                <XCircle size={14} className="mr-1.5" /> Rechazar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveTask(task)}
                                disabled={approvingTaskId === task.id_task}
                              >
                                {approvingTaskId === task.id_task
                                  ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                                  : <CheckCircle2 size={14} className="mr-1.5" />}
                                Aceptar
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tareas/${task.id_task}`)}
                          >
                            <Eye size={14} className="mr-1.5" /> Ver TODO el detalle
                          </Button>
                          {(isAdmin() || isSuperAdmin()) && (
                            <Button
                              size="sm"
                              variant={promotorNombre ? "outline" : "default"}
                              onClick={() => openAssignModal(task)}
                            >
                              {promotorNombre ? "Cambiar promotor" : "Asignar promotor"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal asignación ── */}
      <Dialog
        open={assignModal.open}
        onOpenChange={(v) => !v && setAssignModal({ open: false, task: null, saving: false })}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Asignar promotor</DialogTitle>
            <DialogDescription>
              {assignModal.task?.store?.name ?? `Tarea #${assignModal.task?.id_task}`}
              {assignModal.task?.request && ` · ${assignModal.task.request.vc_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {promotores.length === 0 ? (
              <p className="text-sm text-warning-foreground dark:text-warning bg-warning/15 p-3 rounded-lg border border-warning/40">
                No hay promotores registrados. Da de alta un promotor primero.
              </p>
            ) : (
              <Select value={selectedPromoter} onValueChange={setSelectedPromoter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un promotor" />
                </SelectTrigger>
                <SelectContent>
                  {promotores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} {p.lastname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignModal({ open: false, task: null, saving: false })}
              disabled={assignModal.saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assignModal.saving || !selectedPromoter || promotores.length === 0}
            >
              {assignModal.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmación cierre de pedido ── */}
      <AlertDialog open={closeDialog} onOpenChange={(v) => !closing && setCloseDialog(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar orden</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se cobran las visitas realizadas; las no realizadas se devuelven al saldo del cliente (cuentas de prepago). Las tareas que estén en revisión se aprobarán automáticamente. Las que ya estén terminadas no se
              verán afectadas. Las que aún no se hayan contestado se cancelarán automáticamente con el motivo
              "Cierre de pedido" y se notificará a los promotores asignados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseOrder}
              className="bg-destructive hover:bg-destructive/90"
              disabled={closing}
            >
              {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Rechazar tarea (con motivo) ── */}
      <Dialog open={rejectDialog.open} onOpenChange={(v) => !rejecting && setRejectDialog({ open: v, task: v ? rejectDialog.task : null })}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Rechazar tarea</DialogTitle>
            <DialogDescription>
              Explica el motivo del rechazo. El promotor lo verá en la app y recibirá una notificación.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Ej. El acomodo no cumple con lo solicitado..."
              rows={4}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, task: null })} disabled={rejecting}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleRejectTask} disabled={rejecting || !rejectComment.trim()}>
              {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
