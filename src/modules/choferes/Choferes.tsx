import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Truck, Plus, Phone, Mail, Trash2, Loader2, Ban, RotateCcw, DollarSign, Route as RouteIcon, MessageSquare } from "lucide-react"

import { PageWrapper, PageHeader, Button, Card, CardContent, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components"
import {
  getDrivers, createDriver, deactivateDriver, suspendDriver, reactivateDriver,
  getDriverSales, getDriverRoutesInRange, DriverDTO, DriverSalesDTO, DriverRouteHistoryDTO, notifyDriver,
} from "@/Fetch/drivers"

const money = (n: number) => `$${n.toFixed(2)}`
const todayStr = () => new Date().toISOString().slice(0, 10)
const monthAgoStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export default function Choferes() {
  const [drivers, setDrivers] = useState<DriverDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" })
  const [driverToDelete, setDriverToDelete] = useState<DriverDTO | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [salesDriver, setSalesDriver] = useState<DriverDTO | null>(null)
  const [routeDriver, setRouteDriver] = useState<DriverDTO | null>(null)
  const [msgDriver, setMsgDriver] = useState<DriverDTO | null>(null)

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const res = await getDrivers()
      setDrivers(res.data)
    } catch {
      toast.error("Error al cargar los choferes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
      toast.error("Nombre, teléfono y contraseña son requeridos")
      return
    }
    setCreating(true)
    try {
      await createDriver({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
      })
      toast.success("Chofer creado exitosamente")
      setShowCreate(false)
      setForm({ name: "", phone: "", email: "", password: "" })
      fetchDrivers()
    } catch (e: any) {
      toast.error(e?.message || "Error al crear el chofer")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!driverToDelete) return
    setDeleting(true)
    try {
      await deactivateDriver(driverToDelete.id_driver)
      toast.success("Chofer dado de baja")
      setDriverToDelete(null)
      fetchDrivers()
    } catch (e: any) {
      toast.error(e?.message || "Error al dar de baja al chofer")
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleSuspend = async (driver: DriverDTO) => {
    setTogglingId(driver.id_driver)
    try {
      if (driver.i_status === 2) {
        await reactivateDriver(driver.id_driver)
        toast.success("Chofer reactivado")
      } else {
        await suspendDriver(driver.id_driver)
        toast.success("Chofer suspendido")
      }
      fetchDrivers()
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar el chofer")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Choferes"
        subtitle="Alta, baja y seguimiento de los choferes que reparten tus pedidos"
        icon={Truck}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-2" /> Nuevo chofer
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Truck size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Todavía no has dado de alta ningún chofer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <Card key={driver.id_driver}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.vc_photo ? (
                      <img src={driver.vc_photo} alt={driver.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{driver.name}</p>
                      {driver.i_status === 2 && (
                        <Badge variant="outline" className="text-xs text-warning-foreground dark:text-warning border-warning/40">
                          Suspendido
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone size={12} /> {driver.phone}
                    </p>
                    {driver.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail size={12} /> {driver.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setRouteDriver(driver)}>
                    <RouteIcon size={14} className="mr-1.5" /> Ruta
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSalesDriver(driver)}>
                    <DollarSign size={14} className="mr-1.5" /> Ventas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglingId === driver.id_driver}
                    onClick={() => handleToggleSuspend(driver)}
                  >
                    {togglingId === driver.id_driver ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : driver.i_status === 2 ? (
                      <RotateCcw size={14} className="mr-1.5" />
                    ) : (
                      <Ban size={14} className="mr-1.5" />
                    )}
                    {driver.i_status === 2 ? "Reactivar" : "Suspender"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDriverToDelete(driver)}
                  >
                    <Trash2 size={14} className="mr-1.5" /> Eliminar
                  </Button>
                  <Button variant="outline" size="sm" className="col-span-2" onClick={() => setMsgDriver(driver)}>
                    <MessageSquare size={14} className="mr-1.5" /> Mensaje
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Crear chofer */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nuevo chofer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="10 dígitos" />
            </div>
            <div>
              <Label>Correo (opcional)</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Contraseña *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">
                El chofer va a usar su teléfono y esta contraseña para entrar a su panel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 size={14} className="mr-2 animate-spin" />}
              Crear chofer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar baja */}
      <AlertDialog open={!!driverToDelete} onOpenChange={(v) => !v && setDriverToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar a {driverToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no podrá iniciar sesión ni se le podrán asignar más rutas, y desaparece de esta lista. Esta acción no borra su historial de entregas. Si solo quieres pausarlo temporalmente, usa "Suspender" en vez de esto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={deleting}>
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {salesDriver && (
        <DriverSalesDialog driver={salesDriver} onClose={() => setSalesDriver(null)} />
      )}
      {routeDriver && (
        <DriverRouteDialog driver={routeDriver} onClose={() => setRouteDriver(null)} />
      )}
      {msgDriver && (
        <MensajeChoferDialog driver={msgDriver} onClose={() => setMsgDriver(null)} />
      )}
    </PageWrapper>
  )
}

function DriverSalesDialog({ driver, onClose }: { driver: DriverDTO; onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState(monthAgoStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [data, setData] = useState<DriverSalesDTO | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSales = () => {
    setLoading(true)
    getDriverSales(driver.id_driver, dateFrom, dateTo)
      .then((res) => setData(res.data))
      .catch(() => toast.error("Error al cargar las ventas"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ventas de {driver.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={fetchSales} disabled={loading}>Buscar</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total vendido</p>
                <p className="font-bold text-foreground">{money(data.total_charged)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Piezas totales</p>
                <p className="font-bold text-foreground">{data.total_pieces}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Visitas</p>
                <p className="font-bold text-foreground">{data.total_visits}</p>
              </div>
            </div>

            {data.visits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en este rango.</p>
            ) : (
              <ul className="space-y-2">
                {data.visits.map((v) => (
                  <li key={v.id_stop} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.store.name}</span>
                      <span className="font-semibold">{money(Number(v.f_total_charged ?? 0))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {v.dt_visited ? new Date(v.dt_visited).toLocaleDateString('es-MX') : '—'} ·{' '}
                      {v.items.map((it) => `${it.i_quantity} ${it.product.name}`).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DriverRouteDialog({ driver, onClose }: { driver: DriverDTO; onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState(monthAgoStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [routes, setRoutes] = useState<DriverRouteHistoryDTO[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRoutes = () => {
    setLoading(true)
    getDriverRoutesInRange(driver.id_driver, dateFrom, dateTo)
      .then((res) => setRoutes(res.data))
      .catch(() => toast.error("Error al cargar las rutas"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rutas de {driver.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={fetchRoutes} disabled={loading}>Buscar</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin rutas en este rango.</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {routes.map((route) => (
              <div key={route.id_route} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold mb-2">
                  {new Date(route.route_date).toLocaleDateString('es-MX')} · {route.stops.length} tienda(s)
                </p>
                <ul className="space-y-1">
                  {route.stops.map((stop) => (
                    <li key={stop.id_stop} className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{stop.store.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {stop.i_status === 1 ? "Visitada" : "Por visitar"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MensajeChoferDialog({ driver, onClose }: { driver: DriverDTO; onClose: () => void }) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!text.trim()) {
      toast.error("Escribe el mensaje")
      return
    }
    setSending(true)
    try {
      const res: any = await notifyDriver(driver.id_driver, text.trim())
      const msg: string = res?.message || ""
      if ((res?.data?.sent ?? 0) > 0 || /enviado/i.test(msg)) {
        toast.success("Mensaje enviado")
        onClose()
      } else {
        toast.error(msg || "No se pudo entregar el mensaje")
      }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el mensaje")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Mensaje para {driver.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Escribe tu mensaje</Label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            rows={4}
            placeholder="Ej: Hoy pasa primero por la tienda del centro"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Le llega como notificación a su celular. Solo lo recibe si ya activó las notificaciones. ({text.length}/300)
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={send} disabled={sending}>
            {sending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
