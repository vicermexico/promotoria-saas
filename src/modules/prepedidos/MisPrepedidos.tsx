import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Store, Calendar, Sun, Moon, User, ExternalLink, PackageCheck, PackageX, Download, Filter, X } from "lucide-react"

import { useAuthStore } from "@/stores"
import { PageWrapper, PageHeader, Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components"
import { getPreordersByClient, updatePreorderStatus, PreorderDTO } from "@/Fetch/preorder"

const TIME_LABEL: Record<string, string> = { MAÑANA: 'Por la mañana', TARDE: 'Por la tarde' }

export default function MisPrepedidos() {
  const { user } = useAuthStore()
  const [preorders, setPreorders] = useState<PreorderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [surtidoFilter, setSurtidoFilter] = useState<"todos" | "surtido" | "sin_surtir">("todos")
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [municipioFilter, setMunicipioFilter] = useState<string>("todos")

  useEffect(() => {
    if (!user?.id_client) return
    setLoading(true)
    getPreordersByClient(user.id_client)
      .then((res) => setPreorders(res.data))
      .catch(() => toast.error("Error al cargar tus prepedidos"))
      .finally(() => setLoading(false))
  }, [user?.id_client])

  const estadosDisponibles = useMemo(
    () => [...new Set(preorders.map((p) => p.task.store.state).filter((s): s is string => !!s))].sort(),
    [preorders]
  )
  const municipiosDisponibles = useMemo(
    () => [...new Set(preorders.map((p) => p.task.store.city).filter((c): c is string => !!c))].sort(),
    [preorders]
  )

  const filteredPreorders = useMemo(() => {
    return preorders.filter((p) => {
      const fechaPreorder = p.preferred_date.slice(0, 10);
      if (fechaDesde && fechaPreorder < fechaDesde) return false;
      if (fechaHasta && fechaPreorder > fechaHasta) return false;
      if (surtidoFilter === "surtido" && p.id_status !== 1) return false;
      if (surtidoFilter === "sin_surtir" && p.id_status !== 0) return false;
      if (estadoFilter !== "todos" && p.task.store.state !== estadoFilter) return false;
      if (municipioFilter !== "todos" && p.task.store.city !== municipioFilter) return false;
      return true;
    });
  }, [preorders, fechaDesde, fechaHasta, surtidoFilter, estadoFilter, municipioFilter]);

  const hayFiltrosActivos = fechaDesde || fechaHasta || surtidoFilter !== "todos" || estadoFilter !== "todos" || municipioFilter !== "todos";

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setSurtidoFilter("todos");
    setEstadoFilter("todos");
    setMunicipioFilter("todos");
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = filteredPreorders.map((p) => ({
        Folio: p.task.vc_folio ?? "",
        Tienda: p.task.store.name,
        Estado: p.task.store.state ?? "",
        Municipio: p.task.store.city ?? "",
        "Fecha preferida": new Date(p.preferred_date).toLocaleDateString("es-MX", { timeZone: "UTC" }),
        Turno: TIME_LABEL[p.preferred_time] ?? p.preferred_time,
        Estatus: p.id_status === 1 ? "Surtido" : "Sin surtir",
        Promotor: p.task.promoter ? `${p.task.promoter.name} ${p.task.promoter.lastname ?? ""}`.trim() : "",
        "WhatsApp encargado": p.manager_whatsapp,
        Productos: p.items.map((i) => `${i.i_quantity} ${i.product.name}`).join(", "),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Prepedidos");
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `prepedidos_${fecha}.xlsx`);
    } catch {
      toast.error("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleToggleStatus = async (p: PreorderDTO) => {
    const nuevoEstatus = p.id_status === 1 ? 0 : 1
    setUpdatingId(p.id_task)
    try {
      await updatePreorderStatus(p.id_task, nuevoEstatus)
      setPreorders((prev) =>
        prev.map((item) => (item.id_task === p.id_task ? { ...item, id_status: nuevoEstatus } : item))
      )
      toast.success(nuevoEstatus === 1 ? "Marcado como surtido" : "Marcado como sin surtir")
    } catch {
      toast.error("Error al actualizar el estatus")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Mis Pedidos"
        subtitle="Pedidos que tus promotores levantaron con los encargados de tienda por faltantes de inventario"
        actions={
          <Button onClick={handleExportExcel} disabled={exporting || filteredPreorders.length === 0} variant="outline">
            {exporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
            Exportar a Excel
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-white p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Surtido</label>
            <Select value={surtidoFilter} onValueChange={(v) => setSurtidoFilter(v as typeof surtidoFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="surtido">Ya surtido</SelectItem>
                <SelectItem value="sin_surtir">Sin surtir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estadosDisponibles.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Municipio</label>
            <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {municipiosDisponibles.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : filteredPreorders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {preorders.length === 0 ? "Todavía no hay ningún prepedido levantado." : "Ningún prepedido coincide con estos filtros."}
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {filteredPreorders.map((p) => (
            <div key={p.id_preorder} className="rounded-xl border border-border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Store size={18} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{p.task.store.name}</span>
                  {(p.task.store.city || p.task.store.state) && (
                    <span className="text-xs text-muted-foreground">
                      ({[p.task.store.city, p.task.store.state].filter(Boolean).join(", ")})
                    </span>
                  )}
                  {p.task.vc_folio && (
                    <Badge variant="outline" className="text-xs">{p.task.vc_folio}</Badge>
                  )}
                  {p.id_status === 1 ? (
                    <Badge className="text-xs bg-success/10 text-success border-success/30 gap-1">
                      <PackageCheck size={12} /> Surtido
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-warning/15 text-warning-foreground dark:text-warning border-warning/30 gap-1">
                      <PackageX size={12} /> Sin surtir
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar size={14} />
                    {new Date(p.preferred_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {p.preferred_time === 'MAÑANA' ? <Sun size={14} /> : <Moon size={14} />}
                    {TIME_LABEL[p.preferred_time]}
                  </span>
                </div>
              </div>

              {p.task.promoter && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                  <User size={12} /> Levantado por {p.task.promoter.name} {p.task.promoter.lastname ?? ''}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {p.items.map((item) => (
                  <div key={item.id_item} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div>
                      <span className="font-bold text-foreground">{item.i_quantity}</span>{' '}
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

              <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
                <span>WhatsApp del encargado: {p.manager_whatsapp}</span>
                <div className="flex items-center gap-3">
                  <a
                    href={p.manager_signature}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Ver firma <ExternalLink size={12} />
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updatingId === p.id_task}
                    onClick={() => handleToggleStatus(p)}
                  >
                    {updatingId === p.id_task && <Loader2 size={12} className="mr-1.5 animate-spin" />}
                    {p.id_status === 1 ? "Marcar como sin surtir" : "Marcar como surtido"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
