import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getInicioAdmin } from "@/Fetch/portada"
import { CONFIG_VACIA, DATOS_VACIOS, type DatosLanding } from "@/modules/landing/tipos"

/** Carga los datos de la portada una sola vez y los comparte entre pestañas. */
export function useInicio() {
  const [datos, setDatos] = useState<DatosLanding>(DATOS_VACIOS)
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    try {
      const res = await getInicioAdmin()
      const d = (res.data ?? {}) as Partial<DatosLanding>
      setDatos({
        fondos: d.fondos ?? [],
        personajes: d.personajes ?? [],
        clientes: d.clientes ?? [],
        config: { ...CONFIG_VACIA, ...(d.config ?? {}) },
      })
    } catch (err) {
      toast.error((err as Error)?.message || "Error al cargar la portada")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  return { datos, loading, recargar }
}
