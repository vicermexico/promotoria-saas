import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, CheckSquare2, ClipboardList, Loader2, MapPin, Store, User, FileText, Image as ImageIcon, Receipt, CheckCircle2, XCircle, Ban, PackagePlus, Phone, Calendar, Sun, Moon } from "lucide-react"

import { TaskDTO } from "@/dtos"
import { api, ApiResponse, formatDate } from "@/lib"
import { getPreorder, PreorderDTO } from "@/Fetch/preorder"
import {
  Button, Card, CardContent, DataTable, PageHeader, PageWrapper,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
  Textarea,
} from "@/components"
import { getTaskStatus } from "./utils"

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v)

const PREORDER_TIME_LABEL: Record<string, string> = { MAÑANA: "Por la mañana", TARDE: "Por la tarde" }

interface ChecklistRow {
  id_request_product_question: number
  producto: string
  pregunta: string
  respuesta: string
  evidencia: string | null
}

export function TareaDetalle() {
  const { id_task } = useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState<TaskDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [cancelComment, setCancelComment] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [preorder, setPreorder] = useState<Omit<PreorderDTO, 'task'> | null>(null)

  const fetchTask = async () => {
    if (!id_task) return
    try {
      setLoading(true)
      const resp = await api.get<ApiResponse<TaskDTO>>(`/tasks/${id_task}/checklist`)
      setTask(resp.data)
    } catch {
      toast.error("Error al cargar la tarea")
    } finally {
      setLoading(false)
    }
  }

  const fetchPreorder = async () => {
    if (!id_task) return
    try {
      const resp = await getPreorder(Number(id_task))
      setPreorder(resp.data)
    } catch {
      // Sin prepedido levantado para esta tarea, o la solicitud no tiene el
      // extra activado — no es un error que valga la pena mostrarle al
      // cliente, la seccion simplemente no aparece.
    }
  }

  useEffect(() => {
    fetchTask()
    fetchPreorder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_task])

  const handleApprove = async () => {
    if (!id_task) return
    setApproving(true)
    try {
      const resp = await api.patch<ApiResponse<TaskDTO>>(`/tasks/${id_task}/approve`)
      if (!resp.ok) {
        toast.error(resp.message || "No se pudo aprobar la tarea")
        return
      }
      toast.success("Tarea aprobada")
      await fetchTask()
    } catch {
      toast.error("Error al aprobar la tarea")
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = async () => {
    if (!id_task) return
    if (!cancelComment.trim()) {
      toast.error("Indica el motivo de la cancelación")
      return
    }
    setCancelling(true)
    try {
      const resp = await api.patch<ApiResponse<TaskDTO>>(`/tasks/${id_task}/cancel`, {
        comment: cancelComment.trim(),
      })
      if (!resp.ok) {
        toast.error(resp.message || "No se pudo cancelar la tarea")
        return
      }
      toast.success("Tarea cancelada")
      setCancelDialog(false)
      setCancelComment("")
      await fetchTask()
    } catch {
      toast.error("Error al cancelar la tarea")
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando tarea...</p>
        </div>
      </PageWrapper>
    )
  }

  if (!task) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tarea no encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/tareas")}>
            <ArrowLeft size={16} className="mr-2" /> Volver
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const status = getTaskStatus(task.id_status)
  const promotorNombre = task.promoter ? `${task.promoter.name} ${task.promoter.lastname}`.trim() : null

  const addressParts = [
    task.storeAddress?.street,
    task.storeAddress?.ext_number && `#${task.storeAddress.ext_number}`,
    task.storeAddress?.neighborhood,
    task.storeAddress?.city?.name,
    task.storeAddress?.state?.name,
  ].filter(Boolean)

  const checklistRows: ChecklistRow[] = (task.request?.request_products ?? []).flatMap((rp) =>
    rp.request_product_questions.map((rpq) => {
      const answer = task.myAnswers?.find(
        (a) => a.id_request_product_question === rpq.id_request_product_question,
      )
      return {
        id_request_product_question: rpq.id_request_product_question,
        producto: rp.product.name,
        pregunta: rpq.question.question,
        respuesta: answer?.vc_answer || "—",
        evidencia: answer?.vc_image_url ?? null,
      }
    }),
  )

  const checklistColumns: ColumnDef<ChecklistRow>[] = [
    { accessorKey: "producto", header: "Producto" },
    { accessorKey: "pregunta", header: "Pregunta" },
    { accessorKey: "respuesta", header: "Respuesta" },
    {
      id: "evidencia",
      header: "Evidencia",
      cell: ({ row }) => {
        const url = row.original.evidencia
        return url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt="Evidencia"
              className="w-12 h-12 object-cover rounded border"
              style={{ borderColor: "var(--border)" }}
            />
          </a>
        ) : (
          <span className="text-muted-foreground/70 text-sm">—</span>
        )
      },
    },
  ]

  return (
    <PageWrapper>
      <PageHeader
        title={`Tarea #${String(task.id_task).padStart(4, "0")}`}
        subtitle={`Registrada el ${formatDate(task.dt_register)}`}
        icon={CheckSquare2}
        actions={
          <div className="flex gap-2">
            {task.id_status === 6 && (
              <>
                <Button variant="destructive" size="sm" onClick={() => setCancelDialog(true)} disabled={approving}>
                  <XCircle size={14} className="mr-1.5" /> Rechazar
                </Button>
                <Button size="sm" onClick={handleApprove} disabled={approving}>
                  {approving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <CheckCircle2 size={14} className="mr-1.5" />}
                  Aceptar
                </Button>
              </>
            )}
            {task.id_order && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/detalle-pedido/${task.id_order}`)}>
                <Receipt size={14} className="mr-1.5" /> Ver orden de visita
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/tareas")}>
              <ArrowLeft size={16} className="mr-2" /> Volver
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Sidebar resumen ── */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Resumen
              </h3>

              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Estado</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              {task.order && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Orden de visita</span>
                  <button
                    className="font-semibold text-info hover:underline text-sm"
                    onClick={() => navigate(`/detalle-pedido/${task.id_order}`)}
                  >
                    #{String(task.id_order).padStart(4, "0")}
                  </button>
                </div>
              )}

              {task.request?.f_value && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Valor</span>
                  <span className="font-semibold text-success">{formatCurrency(Number(task.request.f_value))}</span>
                </div>
              )}

              {task.client && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cliente</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{task.client.name}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Notificaciones</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{task.i_notification_count ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Columna derecha ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Establecimiento */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Store size={18} style={{ color: "var(--text-secondary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Establecimiento</h3>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                  {task.store?.name ?? `#${task.id_store}`}
                </p>
                {task.store?.store_code && (
                  <p className="text-xs px-2 py-0.5 rounded w-fit font-medium" style={{ backgroundColor: "var(--hover)", color: "var(--text-secondary)" }}>
                    {task.store.store_code}
                  </p>
                )}
                {addressParts.length > 0 && (
                  <div className="flex items-start gap-2 mt-2">
                    <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {addressParts.join(", ")}
                      {task.storeAddress?.postal_code && ` CP ${task.storeAddress.postal_code}`}
                    </p>
                  </div>
                )}
                {task.storeAddress?.address_references && (
                  <p className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)" }}>
                    Ref: {task.storeAddress.address_references}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Solicitud */}
          {task.request && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} style={{ color: "var(--text-secondary)" }} />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Solicitud</h3>
                </div>
                <div className="flex items-start gap-4">
                  {task.request.url_rack_image && (
                    <img
                      src={task.request.url_rack_image}
                      alt={task.request.vc_name}
                      className="w-16 h-16 object-cover rounded-lg border shrink-0"
                      style={{ borderColor: "var(--border)" }}
                    />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{task.request.vc_name}</p>
                    {task.request.f_value && (
                      <p className="text-sm text-success font-medium">{formatCurrency(Number(task.request.f_value))}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancelación */}
          {task.id_status === 0 && task.vc_cancel_reason && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Ban size={18} className="text-destructive" />
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Motivo de cancelación
                    {task.vc_cancel_type === "negocio" && " (cierre de la orden)"}
                    {task.vc_cancel_type === "cliente" && " (por el cliente)"}
                  </h3>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{task.vc_cancel_reason}</p>
              </CardContent>
            </Card>
          )}

          {/* Promotor */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} style={{ color: "var(--text-secondary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Promotor asignado</h3>
              </div>
              {promotorNombre ? (
                <div className="space-y-2">
                  <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{promotorNombre}</p>
                  {task.promoter?.phone && (
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tel: {task.promoter.phone}</p>
                  )}
                  {task.promoter?.email && (
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{task.promoter.email}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <p className="text-sm italic text-destructive font-medium">Sin promotor asignado</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Fotos de acomodo + Prepedido + Checklist (ancho completo) ── */}
      <div className="space-y-4">
        {(task.arrangement_photo_url || task.arrangement_photo_after_url) && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon size={18} style={{ color: "var(--text-secondary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Fotos de acomodo</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {task.arrangement_photo_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Antes de acomodar</p>
                    <a href={task.arrangement_photo_url} target="_blank" rel="noreferrer">
                      <img
                        src={task.arrangement_photo_url}
                        alt="Foto antes del acomodo"
                        className="max-h-96 w-full rounded-lg border object-contain"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </a>
                  </div>
                )}
                {task.arrangement_photo_after_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Después de acomodar</p>
                    <a href={task.arrangement_photo_after_url} target="_blank" rel="noreferrer">
                      <img
                        src={task.arrangement_photo_after_url}
                        alt="Foto después del acomodo"
                        className="max-h-96 w-full rounded-lg border object-contain"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {preorder && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PackagePlus size={18} style={{ color: "var(--text-secondary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Prepedido levantado</h3>
              </div>
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={14} /> {new Date(preorder.preferred_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {preorder.preferred_time === "MAÑANA" ? <Sun size={14} /> : <Moon size={14} />}
                  {PREORDER_TIME_LABEL[preorder.preferred_time]}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone size={14} /> {preorder.manager_whatsapp}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {preorder.items.map((item) => (
                  <div key={item.id_item} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div>
                      <span className="font-bold text-foreground">{item.i_quantity}</span>{" "}
                      <span className="text-muted-foreground">{item.product.name}</span>
                    </div>
                    {item.i_quantity_backorder != null && item.i_quantity_backorder > 0 && (
                      <p className="text-xs text-warning-foreground dark:text-warning mt-0.5">
                        {item.i_quantity_immediate ?? 0} de inmediato · {item.i_quantity_backorder} en {item.i_backorder_days ?? '?'} días
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <a
                href={preorder.manager_signature}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Ver firma del encargado
              </a>
            </CardContent>
          </Card>
        )}

        {checklistRows.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={18} style={{ color: "var(--text-secondary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Checklist de la tarea</h3>
              </div>
              <DataTable
                columns={checklistColumns}
                data={checklistRows}
                emptyMessage="Sin respuestas registradas."
                export={{
                  enableExcel: true,
                  fileName: `checklist_tarea_${task.id_task}`,
                  sheetName: "Checklist",
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Modal cancelación ── */}
      <Dialog open={cancelDialog} onOpenChange={(v) => !cancelling && setCancelDialog(v)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cancelar tarea</DialogTitle>
            <DialogDescription>
              Explica el motivo de la cancelación. El promotor lo verá en la app y recibirá una notificación.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
              placeholder="Ej. El acomodo no cumple con lo solicitado..."
              rows={4}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialog(false)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !cancelComment.trim()}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
