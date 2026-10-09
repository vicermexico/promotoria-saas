import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components"
import {
  createFaqQuestion,
  updateFaqQuestion,
  setFaqHighlightSteps,
  getFaqScreens,
  addFaqScreenElement,
  FaqQuestion,
  FaqScreen,
  FaqScreenElement,
} from "@/Fetch/faq"
import { FaqScreenCanvas } from "./FaqScreenCanvas"

const formSchema = z.object({
  vc_answer_text: z.string().min(1, "La respuesta es requerida"),
  phrases: z.array(z.object({ value: z.string().min(1, "No puede estar vacio") })).min(1, "Agrega al menos una forma de preguntarlo"),
})

type FormValues = z.infer<typeof formSchema>

interface CrearEditarFaqDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pregunta: FaqQuestion | null
  onSuccess: () => void
}

export function CrearEditarFaqDialog({ open, onOpenChange, pregunta, onSuccess }: CrearEditarFaqDialogProps) {
  const isEditMode = !!pregunta
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  const [screens, setScreens] = useState<FaqScreen[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null)
  const [stepElements, setStepElements] = useState<FaqScreenElement[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { vc_answer_text: "", phrases: [{ value: "" }] },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "phrases" })

  useEffect(() => {
    if (!open) return
    if (isEditMode && pregunta) {
      form.reset({
        vc_answer_text: pregunta.vc_answer_text,
        phrases: pregunta.phrases.length > 0 ? pregunta.phrases.map((p) => ({ value: p.vc_phrase })) : [{ value: "" }],
      })
      const pasosOrdenados = [...(pregunta.steps || [])].sort((a, b) => a.i_order - b.i_order)
      setStepElements(pasosOrdenados.map((s) => s.element))
    } else {
      form.reset({ vc_answer_text: "", phrases: [{ value: "" }] })
      setStepElements([])
    }
    setSelectedScreenId(null)
  }, [open, isEditMode, pregunta, form])

  useEffect(() => {
    if (!open || !isEditMode) return
    getFaqScreens()
      .then((res) => setScreens(res.data))
      .catch(() => toast.error("No se pudieron cargar las pantallas"))
  }, [open, isEditMode])

  const handleAgregarPaso = (element: FaqScreenElement) => {
    setStepElements((prev) => [...prev, element])
  }

  const handleCrearElemento = async (coords: { f_x: number; f_y: number; f_rotation_deg: number }) => {
    if (!selectedScreenId) return
    try {
      const res = await addFaqScreenElement(selectedScreenId, {
        f_x: coords.f_x,
        f_y: coords.f_y,
        f_width: 0,
        f_height: 0,
        f_rotation_deg: coords.f_rotation_deg,
      })
      const nuevoElemento = res.data
      setScreens((prev) =>
        prev.map((s) =>
          s.id_faq_screen === selectedScreenId ? { ...s, elements: [...s.elements, nuevoElemento] } : s
        )
      )
      setStepElements((prev) => [...prev, nuevoElemento])
      toast.success("Boton marcado y agregado como paso")
    } catch (error: any) {
      toast.error(error?.message || "Error al marcar el boton")
    }
  }

  const handleQuitarPaso = (index: number) => {
    setStepElements((prev) => prev.filter((_, i) => i !== index))
  }

  const pantallaSeleccionada = screens.find((s) => s.id_faq_screen === selectedScreenId) || null
  const elementosDeEstaPantalla = pantallaSeleccionada
    ? stepElements.filter((el) =>
        pantallaSeleccionada.elements.some((e) => e.id_faq_screen_element === el.id_faq_screen_element)
      )
    : []

  const onSubmit = async (values: FormValues) => {
    try {
      setLoadingSubmit(true)
      const payload = {
        vc_answer_text: values.vc_answer_text,
        phrases: values.phrases.map((p) => p.value),
      }
      let idPregunta = pregunta?.id_faq_question
      if (isEditMode && pregunta) {
        await updateFaqQuestion(pregunta.id_faq_question, payload)
      } else {
        const creada = await createFaqQuestion(payload)
        idPregunta = creada.data.id_faq_question
      }

      if (isEditMode && idPregunta) {
        await setFaqHighlightSteps(idPregunta, stepElements.map((e) => e.id_faq_screen_element))
      }

      toast.success(isEditMode ? "Pregunta actualizada" : "Pregunta creada exitosamente")
      onSuccess()
    } catch (error: any) {
      toast.error(error?.message || "Ocurrio un error")
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar pregunta" : "Nueva pregunta"}</DialogTitle>
          <DialogDescription>
            Agrega las distintas formas en que el promotor podria escribir esta pregunta, y la respuesta que debe recibir.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">Formas de preguntarlo *</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
                  <Plus size={14} className="mr-1" />
                  Agregar otra forma
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Escribe varias formas en que el promotor podria preguntar lo mismo; mientras mas agregues, mas facil sera que el sistema la reconozca.
              </p>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`phrases.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-1">
                        <FormControl>
                          <Input placeholder="Ej: donde veo mis tareas pendientes?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="vc_answer_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Respuesta *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Escribe la respuesta que debe recibir el promotor..." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditMode && (
              <div className="space-y-3 rounded-lg border p-4">
                <FormLabel className="text-base">Pasos para resaltar botones (opcional)</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Elige una pantalla, y dale clic a los botones en el orden en que quieres que se le vayan prendiendo al promotor cuando reciba esta respuesta.
                </p>

                {stepElements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {stepElements.map((el, index) => {
                      const pantallaDelPaso = screens.find((s) =>
                        s.elements.some((e) => e.id_faq_screen_element === el.id_faq_screen_element)
                      )
                      return (
                        <span
                          key={`${el.id_faq_screen_element}-${index}`}
                          className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full"
                        >
                          {index + 1}. {el.vc_label}
                          {pantallaDelPaso ? ` (pantalla: ${pantallaDelPaso.vc_title})` : ""}
                          <button type="button" onClick={() => handleQuitarPaso(index)} className="hover:text-destructive">
                            <X size={12} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedScreenId ?? ""}
                  onChange={(e) => setSelectedScreenId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Selecciona una pantalla...</option>
                  {screens.map((s) => (
                    <option key={s.id_faq_screen} value={s.id_faq_screen}>
                      {s.vc_title}{!s.vc_app_route ? " (sin ruta asignada, no se podra navegar)" : ""}
                    </option>
                  ))}
                </select>

                {pantallaSeleccionada && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Dale clic en el lugar exacto donde quieres que aparezca la manita. Luego arrastra el circulo para rotarla hacia donde debe apuntar, y dale Guardar.
                    </p>
                    <FaqScreenCanvas
                      imageUrl={pantallaSeleccionada.vc_screenshot_url}
                      elements={elementosDeEstaPantalla}
                      editable
                      onCreateElement={handleCrearElemento}
                      onElementClick={handleAgregarPaso}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loadingSubmit}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingSubmit}>
                {loadingSubmit && <Loader2 size={16} className="mr-2 animate-spin" />}
                {isEditMode ? "Guardar cambios" : "Crear pregunta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
