import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components"
import { FaqScreen, FaqScreenElement, addFaqScreenElement, deleteFaqScreenElement } from "@/Fetch/faq"
import { FaqScreenCanvas } from "./FaqScreenCanvas"

interface FaqScreenEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: FaqScreen | null
  onChanged: () => void
}

export function FaqScreenEditorDialog({ open, onOpenChange, screen, onChanged }: FaqScreenEditorDialogProps) {
  const [saving, setSaving] = useState(false)

  if (!screen) return null

  const handleCreateElement = async (coords: { f_x: number; f_y: number; f_rotation_deg: number }) => {
    try {
      setSaving(true)
      await addFaqScreenElement(screen.id_faq_screen, {
        f_x: coords.f_x,
        f_y: coords.f_y,
        f_width: 0,
        f_height: 0,
        f_rotation_deg: coords.f_rotation_deg,
      })
      toast.success("Boton agregado")
      onChanged()
    } catch (error: any) {
      toast.error(error?.message || "Error al agregar el boton")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteElement = async (element: FaqScreenElement) => {
    try {
      setSaving(true)
      await deleteFaqScreenElement(element.id_faq_screen_element)
      toast.success("Boton eliminado")
      onChanged()
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar el boton")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{screen.vc_title}</DialogTitle>
          <DialogDescription>
            Dale clic donde quieras marcar un boton, arrastra el circulo para rotar la manita y dale Guardar. Para borrar uno, dale clic encima.
            {saving && <Loader2 size={14} className="inline ml-2 animate-spin" />}
          </DialogDescription>
        </DialogHeader>

        <FaqScreenCanvas
          imageUrl={screen.vc_screenshot_url}
          elements={screen.elements}
          editable
          onCreateElement={handleCreateElement}
          onDeleteElement={handleDeleteElement}
        />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
