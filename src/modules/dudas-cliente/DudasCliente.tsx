import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, MessageCircleQuestion, X } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

import { api, ApiResponse } from '@/lib'
import {
  Button, PageWrapper, PageHeader, DataTable, RowActions, Card, CardContent, Textarea,
  Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components'

interface Frase {
  id_faq_cliente_phrase: number
  vc_phrase: string
}

interface Pregunta {
  id_faq_cliente_question: number
  vc_answer_text: string
  phrases: Frase[]
  vc_route?: string | null
}

const PANTALLAS_CLIENTE: Array<[string, string]> = [
  ['/', 'Inicio'],
  ['/solicitudes', 'Solicitudes'],
  ['/crearSolicitud', 'Crear solicitud'],
  ['/pedidos', 'Órdenes de visita'],
  ['/crearPedido', 'Crear orden de visita'],
  ['/tareas', 'Visitas'],
  ['/logistica', 'Logística'],
  ['/mis-prepedidos', 'Mis Pedidos'],
  ['/choferes', 'Choferes'],
  ['/productos', 'Productos'],
  ['/producto', 'Nuevo producto'],
  ['/mis-establecimientos', 'Mis establecimientos'],
  ['/finanzas/gestion-pagos', 'Gestión de pagos'],
  ['/mi-negocio', 'Mi negocio'],
  ['/perfil', 'Mi perfil'],
]

const nombrePantalla = (ruta: string): string =>
  PANTALLAS_CLIENTE.find(([r]) => r === ruta)?.[1] ?? ruta

export function DudasCliente() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [saludo, setSaludo] = useState('')
  const [loadingSaludo, setLoadingSaludo] = useState(true)
  const [guardandoSaludo, setGuardandoSaludo] = useState(false)

  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [frases, setFrases] = useState<string[]>([''])
  const [ruta, setRuta] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargarPreguntas = async () => {
    try {
      const res = await api.get<ApiResponse<Pregunta[]>>('/faq-cliente/questions')
      setPreguntas(res.data)
    } catch (error) {
      console.error('Error al cargar las preguntas:', error)
      toast.error('Error al cargar las preguntas')
    }
  }

  const cargarSaludo = async () => {
    try {
      const res = await api.get<ApiResponse<{ vc_value: string }>>('/faq-cliente/greeting')
      setSaludo(res.data.vc_value)
    } catch (error) {
      console.error('Error al cargar el saludo:', error)
      toast.error('Error al cargar el saludo')
    } finally {
      setLoadingSaludo(false)
    }
  }

  useEffect(() => {
    cargarPreguntas()
    cargarSaludo()
  }, [])

  const guardarSaludo = async () => {
    try {
      setGuardandoSaludo(true)
      await api.put('/faq-cliente/greeting', { vc_value: saludo })
      toast.success('Saludo actualizado')
    } catch (error) {
      console.error('Error al guardar el saludo:', error)
      toast.error('Error al guardar el saludo')
    } finally {
      setGuardandoSaludo(false)
    }
  }

  const abrirNueva = () => {
    setEditando(null)
    setRuta('')
    setRespuesta('')
    setFrases([''])
    setAbierto(true)
  }

  const abrirEditar = (p: Pregunta) => {
    setEditando(p)
    setRuta(p.vc_route || '')
    setRespuesta(p.vc_answer_text)
    setFrases(p.phrases.length > 0 ? p.phrases.map((x) => x.vc_phrase) : [''])
    setAbierto(true)
  }

  const eliminar = async (p: Pregunta) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta pregunta?')) return
    try {
      await api.delete('/faq-cliente/questions/' + p.id_faq_cliente_question)
      toast.success('Pregunta eliminada')
      cargarPreguntas()
    } catch (error) {
      console.error('Error al eliminar la pregunta:', error)
      toast.error('Error al eliminar la pregunta')
    }
  }

  const guardar = async () => {
    const limpias = frases.map((f) => f.trim()).filter((f) => f.length > 0)
    if (limpias.length === 0) return toast.error('Agrega al menos una forma de preguntarlo')
    if (!respuesta.trim()) return toast.error('La respuesta no puede estar vacía')
    try {
      setGuardando(true)
      const payload = { vc_answer_text: respuesta.trim(), phrases: limpias, vc_route: ruta }
      if (editando) {
        await api.put('/faq-cliente/questions/' + editando.id_faq_cliente_question, payload)
        toast.success('Pregunta actualizada')
      } else {
        await api.post('/faq-cliente/questions', payload)
        toast.success('Pregunta creada')
      }
      setAbierto(false)
      cargarPreguntas()
    } catch (error) {
      console.error('Error al guardar la pregunta:', error)
      toast.error('Error al guardar la pregunta')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarFrase = (i: number, valor: string) =>
    setFrases((prev) => prev.map((f, idx) => (idx === i ? valor : f)))
  const quitarFrase = (i: number) => setFrases((prev) => prev.filter((_, idx) => idx !== i))
  const agregarFrase = () => setFrases((prev) => [...prev, ''])

  const columns: ColumnDef<Pregunta>[] = [
    {
      accessorKey: 'phrases',
      header: 'Palabras clave',
      cell: ({ row }) => {
        const lista = row.original.phrases || []
        return (
          <div className="flex flex-col gap-1 max-w-[350px]">
            {lista.slice(0, 3).map((p) => (
              <span key={p.id_faq_cliente_phrase} className="text-sm truncate">- {p.vc_phrase}</span>
            ))}
            {lista.length > 3 && (
              <span className="text-xs text-muted-foreground">+{lista.length - 3} más</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'vc_answer_text',
      header: 'Respuesta',
      cell: ({ row }) => (
        <div className="max-w-[400px]">
          <p className="text-sm truncate">{row.original.vc_answer_text}</p>
          {row.original.vc_route && (
            <p className="text-xs text-muted-foreground">Abre: {nombrePantalla(row.original.vc_route)}</p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Operaciones',
      cell: ({ row }) => (
        <RowActions
          actions={[
            { icon: Pencil, label: 'Editar', onClick: () => abrirEditar(row.original) },
            { icon: Trash2, label: 'Eliminar', onClick: () => eliminar(row.original) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <PageWrapper>
        <PageHeader
          title="Dudas del cliente"
          subtitle="Administra el saludo y las preguntas frecuentes del asistente del panel de clientes"
          icon={MessageCircleQuestion}
        />

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Saludo inicial</h3>
            <p className="text-sm text-muted-foreground">
              Es lo primero que escucha el cliente cuando activa el asistente.
            </p>
            {loadingSaludo ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Cargando...
              </div>
            ) : (
              <>
                <Textarea value={saludo} onChange={(e) => setSaludo(e.target.value)} rows={2} />
                <Button onClick={guardarSaludo} disabled={guardandoSaludo} size="sm">
                  {guardandoSaludo ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Guardar saludo
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Preguntas frecuentes</h3>
          <Button onClick={abrirNueva} className="flex items-center gap-2">
            <Plus size={18} />
            Nueva pregunta
          </Button>
        </div>
        <DataTable columns={columns} data={preguntas} pagination={{ pageSize: 100 }} />
      </PageWrapper>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Palabras clave o frases</Label>
              <p className="text-xs text-muted-foreground">Escribe palabras clave cortas, por ejemplo: subir productos. Si lo que dice el cliente las contiene, el asistente da esta respuesta. Agrega varias formas de decir lo mismo (subir, cargar, agregar productos).</p>
              {frases.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={f}
                    onChange={(e) => cambiarFrase(i, e.target.value)}
                    placeholder="Ej. subir productos"
                  />
                  {frases.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => quitarFrase(i)}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={agregarFrase}>
                <Plus size={14} className="mr-1" />
                Agregar otra forma
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Respuesta</Label>
              <Textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={5} />
              <Label className="block pt-2">Llevar a la pantalla (opcional)</Label>
              <select
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No llevar a ninguna pantalla</option>
                {PANTALLAS_CLIENTE.map(([r, nombre]) => (
                  <option key={r} value={r}>{nombre}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Después de dar la respuesta, el asistente abre esa pantalla.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="button" onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 size={16} className="mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
