import { Loader2, PanelTop } from "lucide-react"
import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/stores"
import { PageWrapper, PageHeader, Card, CardContent } from "@/components"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useInicio } from "./useInicio"
import SeccionFondos from "./SeccionFondos"
import SeccionGeneral from "./SeccionGeneral"

export default function ConfigurarPortada() {
  const user = useAuthStore((s) => s.user)
  const { datos, loading, recargar } = useInicio()

  // Solo master. El backend también lo exige; esto evita ver la pantalla vacía.
  if (user && user.i_rol !== 1) return <Navigate to="/" replace />

  return (
    <PageWrapper>
      <PageHeader
        title="Configurar portada"
        subtitle="Fondos, personajes, clientes y datos de contacto de la página pública."
        icon={PanelTop}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="fondos" className="mt-6">
          <TabsList>
            <TabsTrigger value="fondos">Fondos</TabsTrigger>
            <TabsTrigger value="personajes">Personajes</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="fondos"><SeccionFondos fondos={datos.fondos} onChanged={recargar} /></TabsContent>
          <TabsContent value="personajes"><Pronto nombre="Personajes" /></TabsContent>
          <TabsContent value="clientes"><Pronto nombre="Clientes" /></TabsContent>
          <TabsContent value="general"><SeccionGeneral config={datos.config} onChanged={recargar} /></TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  )
}

function Pronto({ nombre }: { nombre: string }) {
  return (
    <Card className="mt-4"><CardContent className="py-10 text-center text-sm text-muted-foreground">
      La sección {nombre} se agrega en el siguiente paso.
    </CardContent></Card>
  )
}
