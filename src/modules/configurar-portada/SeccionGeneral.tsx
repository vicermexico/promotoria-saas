import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

import { updateConfigPortada } from "@/Fetch/portada"
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components"
import { CONFIG_VACIA, type ConfigLanding } from "@/modules/landing/tipos"

type Campo = { key: keyof ConfigLanding; label: string; max: number; placeholder?: string }

// Límites iguales a las columnas de landing_config (ver inicio.dto.ts del backend).
const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: "Portada", campos: [{ key: "titulo", label: "Título del héroe", max: 200 }] },
  {
    titulo: "Contacto",
    campos: [
      { key: "telefono", label: "Teléfono", max: 30 },
      { key: "whatsapp", label: "WhatsApp", max: 30 },
      { key: "correo", label: "Correo", max: 150 },
      { key: "direccion", label: "Dirección", max: 300 },
      { key: "horario", label: "Horario", max: 200 },
      { key: "sitio_web", label: "Sitio web", max: 300, placeholder: "https://" },
    ],
  },
  {
    titulo: "Redes sociales",
    campos: [
      { key: "instagram_url", label: "Instagram", max: 300, placeholder: "https://" },
      { key: "facebook_url", label: "Facebook", max: 300, placeholder: "https://" },
      { key: "tiktok_url", label: "TikTok", max: 300, placeholder: "https://" },
      { key: "youtube_url", label: "YouTube", max: 300, placeholder: "https://" },
      { key: "x_url", label: "X (Twitter)", max: 300, placeholder: "https://" },
      { key: "linkedin_url", label: "LinkedIn", max: 300, placeholder: "https://" },
    ],
  },
  {
    titulo: "Crédito del desarrollador",
    campos: [
      { key: "dev_nombre", label: "Nombre", max: 100 },
      { key: "dev_whatsapp", label: "WhatsApp", max: 30 },
    ],
  },
]

const URLS: Campo[] = GRUPOS.flatMap((g) => g.campos).filter((c) => c.placeholder === "https://")

export default function SeccionGeneral({ config, onChanged }: { config: ConfigLanding; onChanged: () => void }) {
  const [form, setForm] = useState<ConfigLanding>({ ...CONFIG_VACIA, ...config })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { setForm({ ...CONFIG_VACIA, ...config }) }, [config])

  const guardar = async () => {
    for (const c of URLS) {
      const v = (form[c.key] ?? "").trim()
      if (v && !/^https?:\/\//i.test(v)) return toast.error(`El enlace de ${c.label} debe empezar con http:// o https://`)
    }
    // Vacío = null (la portada oculta ese dato).
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, (v ?? "").trim() === "" ? null : (v as string).trim()])
    ) as Partial<ConfigLanding>
    setGuardando(true)
    try {
      await updateConfigPortada(payload)
      toast.success("Configuración actualizada exitosamente")
      onChanged()
    } catch (err) {
      toast.error((err as Error)?.message || "Error al guardar la configuración")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {GRUPOS.map((g) => (
        <Card key={g.titulo}>
          <CardHeader>
            <CardTitle>{g.titulo}</CardTitle>
            {g.titulo === "Portada" && <CardDescription>Los campos vacíos no se muestran en la portada.</CardDescription>}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {g.campos.map((c) => {
              const valor = form[c.key] ?? ""
              return (
                <div key={c.key} className="space-y-1.5">
                  <Label htmlFor={c.key}>{c.label}</Label>
                  <Input
                    id={c.key}
                    value={valor}
                    maxLength={c.max}
                    placeholder={c.placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{valor.length}/{c.max}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
      <Button onClick={guardar} disabled={guardando}>
        {guardando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar
      </Button>
    </div>
  )
}
