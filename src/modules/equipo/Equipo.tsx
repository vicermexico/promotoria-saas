import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Ban, RotateCcw } from "lucide-react"

import { api, ApiResponse } from "@/lib"
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components"
import { CATALOGO_MENU } from "@/lib/permisos"

interface Miembro {
  id_user: number
  email: string
  name: string
  lastname: string
  i_status: number
  permisos: string[] | null
}

const SECCIONES = Array.from(new Set(CATALOGO_MENU.map((i) => i.seccion)))

const mensajeError = (err: any, fallback: string): string =>
  err?.response?.data?.message || err?.data?.message || err?.message || fallback

export default function Equipo() {
  const [lista, setLista] = useState<Miembro[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Miembro | null>(null)
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [marcados, setMarcados] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    setCargando(true)
    api.get<ApiResponse<Miembro[]>>("/superadmin/staff")
      .then((r) => { if (r.ok) setLista(r.data ?? []) })
      .catch((e) => toast.error(mensajeError(e, "Error al cargar el equipo")))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null); setNombre(""); setApellido(""); setUsuario(""); setPassword(""); setMarcados([]); setAbierto(true)
  }

  const abrirEditar = (m: Miembro) => {
    setEditando(m); setNombre(m.name); setApellido(m.lastname); setUsuario(m.email); setPassword(""); setMarcados(m.permisos ?? []); setAbierto(true)
  }

  const alternar = (ruta: string) =>
    setMarcados((p) => (p.includes(ruta) ? p.filter((r) => r !== ruta) : [...p, ruta]))

  const alternarGrupo = (rutas: string[]) => {
    const todas = rutas.every((r) => marcados.includes(r))
    setMarcados((p) => (todas ? p.filter((r) => !rutas.includes(r)) : Array.from(new Set([...p, ...rutas]))))
  }

  const guardar = async () => {
    if (!nombre.trim() || !apellido.trim()) { toast.error("Escribe el nombre y el apellido"); return }
    if (!editando) {
      if (usuario.trim().length < 3) { toast.error("Escribe el usuario (correo o celular)"); return }
      if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return }
    }
    setGuardando(true)
    try {
      const res: any = editando
        ? await api.put(`/superadmin/staff/${editando.id_user}`, { name: nombre.trim(), lastname: apellido.trim(), permisos: marcados })
        : await api.post("/superadmin/staff", { name: nombre.trim(), lastname: apellido.trim(), email: usuario.trim(), password, permisos: marcados })
      if (res?.ok === false || res?.error) { toast.error(res?.message || "No se pudo guardar"); return }
      toast.success(editando ? "Usuario actualizado" : "Usuario creado")
      setAbierto(false)
      cargar()
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo guardar"))
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (m: Miembro, estado: 0 | 1) => {
    try {
      const res: any = await api.put(`/superadmin/staff/${m.id_user}`, { i_status: estado })
      if (res?.ok === false || res?.error) { toast.error(res?.message || "No se pudo cambiar"); return }
      toast.success(estado === 1 ? "Usuario reactivado" : "Usuario suspendido")
      cargar()
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo cambiar"))
    }
  }

  const todasLasRutas = CATALOGO_MENU.map((i) => i.route)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Equipo</h2>
          <p className="text-sm text-muted-foreground">Usuarios de tu equipo y los botones del menú que puede usar cada uno.</p>
        </div>
        <Button onClick={abrirNuevo}>Agregar usuario</Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Botones</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Cargando...</td></tr>
            )}
            {!cargando && lista.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin usuarios</td></tr>
            )}
            {lista.map((m) => (
              <tr key={m.id_user} className="border-t border-border">
                <td className="px-4 py-2">{m.name} {m.lastname}</td>
                <td className="px-4 py-2">{m.email}</td>
                <td className="px-4 py-2">{m.permisos === null ? "Master: ve todo" : `${m.permisos.length} de ${todasLasRutas.length}`}</td>
                <td className="px-4 py-2">{m.i_status === 1 ? "Activo" : "Suspendido"}</td>
                <td className="px-4 py-2 text-right">
                  {m.permisos !== null && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => abrirEditar(m)}><Pencil className="w-4 h-4 mr-1" />Editar</Button>
                      {m.i_status === 1
                        ? <Button variant="outline" size="sm" onClick={() => cambiarEstado(m, 0)}><Ban className="w-4 h-4 mr-1" />Suspender</Button>
                        : <Button variant="outline" size="sm" onClick={() => cambiarEstado(m, 1)}><RotateCcw className="w-4 h-4 mr-1" />Reactivar</Button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar usuario" : "Agregar usuario"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eq-nombre">Nombre</Label>
                <Input id="eq-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq-apellido">Apellido</Label>
                <Input id="eq-apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq-usuario">Usuario (correo o celular)</Label>
                <Input id="eq-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} disabled={!!editando} placeholder="Con lo que entrará al panel" />
              </div>
              {!editando && (
                <div className="grid gap-2">
                  <Label htmlFor="eq-pass">Contraseña temporal</Label>
                  <Input id="eq-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Botones del menú que puede usar</p>
              <Button variant="outline" size="sm" onClick={() => alternarGrupo(todasLasRutas)}>Marcar / quitar todo</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECCIONES.map((sec) => {
                const items = CATALOGO_MENU.filter((i) => i.seccion === sec)
                return (
                  <div key={sec} className="rounded-lg border border-border p-3">
                    <button type="button" className="text-sm font-semibold text-foreground mb-2 hover:underline" onClick={() => alternarGrupo(items.map((i) => i.route))}>
                      {sec}
                    </button>
                    <div className="grid gap-1.5">
                      {items.map((i) => (
                        <label key={i.route} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={marcados.includes(i.route)} onChange={() => alternar(i.route)} />
                          {i.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">Inicio y Mi perfil siempre están disponibles. Al entrar por primera vez se le pedirá cambiar su contraseña.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
