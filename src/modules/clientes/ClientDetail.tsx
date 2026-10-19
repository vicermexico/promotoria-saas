import { toast } from "sonner"
import { Link, useParams } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Mail, MapPin, Package, Camera, Clock, AlertCircle, Loader2, Truck, Phone } from "lucide-react"


import { useAuthStore } from "@/stores"
import { tabs, ROL_LABELS } from "./utils.clients"
import { ApiResponse, api, formatDate} from "@/lib"
import { Alert, AlertDescription, Input, Label, ModalCustom } from "@/components"
import { ClientDTO, CreateUserInCLientDetailDTO, UsuarioDTO, ProductDTO } from '@/dtos'
import { getDriversByClient, DriverDTO } from '@/Fetch/drivers'
import { CuentaPagoCliente } from './CuentaPagoCliente'


export default function ClienteDetalle() {
    const { id } = useParams();
    
    const [activeTab, setActiveTab] = useState("info");
    const [imageHover, setImageHover] = useState(false);
    const [cliente, setCliente] = useState<ClientDTO | null>(null);
    const [initials, setInitials] = useState("");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        const fetchingData = async() => {
            try{
                const data = await api.get<ApiResponse<ClientDTO>>(`/clients/${id}`);
                const nameInitials = data.data.name.split(" ").map((word: string) => word[0]).slice(0, 2).join("").toUpperCase();
                setInitials(nameInitials);
                setCliente(data.data);
            } catch (error) {
                console.error("Error fetching client data:", error);
            }
        };
        fetchingData();
        api.get<ApiResponse<{ url: string | null }>>(`/clients/${id}/logo`)
            .then((res) => setLogoUrl(res.data?.url ?? null))
            .catch(() => {});
    }, []);

    const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setUploadingLogo(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await api.upload<ApiResponse<{ url: string }>>(`/clients/${id}/logo`, fd);
            setLogoUrl(res.data.url);
            toast.success("Logo actualizado exitosamente");
        } catch (err: any) {
            toast.error(err?.message || "Error al subir el logo");
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-muted/50">
        <div className="sticky top-0 z-10 bg-white border-b border-border shadow-sm">
            <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                    <Link to="/clientes">
                        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-muted-foreground" />
                        </button>
                    </Link>
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                    Detalle del Cliente
                    </h1>
                    <p className="text-sm text-muted-foreground">
                    Información completa y gestión
                    </p>
                </div>
                </div>

                <div className="flex items-center gap-2">
                </div>
            </div>
            </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="h-32 bg-primary" />

                <div className="px-6 pb-6 pt-6">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16">
                        <label
                            className="relative cursor-pointer"
                            onMouseEnter={() => setImageHover(true)}
                            onMouseLeave={() => setImageHover(false)}
                        >
                            <div className="w-32 h-32 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary flex items-center justify-center">
                                        <span className="text-4xl font-semibold text-white">
                                            {initials}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {(imageHover || uploadingLogo) && (
                                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center cursor-pointer transition-opacity">
                                    <div className="text-center text-white">
                                        {uploadingLogo ? (
                                            <Loader2 size={24} className="mx-auto animate-spin" />
                                        ) : (
                                            <>
                                                <Camera size={24} className="mx-auto mb-1" />
                                                <span className="text-xs">{logoUrl ? "Cambiar logo" : "Subir logo"}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploadingLogo} />
                        </label>
                        {/* Name and Status */}
                        <div className="flex-1 md:mb-2 md:pt-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-bold text-foreground">
                                    {cliente?.name}
                                </h2>
                                {cliente?.i_status ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full">
                                        <div className="w-2 h-2 bg-success rounded-full" />
                                        Activo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-full">
                                        <div className="w-2 h-2 bg-destructive rounded-full" />
                                        Inactivo
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1">{cliente?.rfc}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Tabs */}
            <div className="bg-white rounded-xl border border-border">
                <div className="border-b border-border">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    isActive
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
                                    }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === "info" && <TabInfo cliente={cliente} />}
                    {activeTab === "users" && <TabUsers cliente={cliente} />}
                    {activeTab === "products" && <TabProducts cliente={cliente} />}
                    {activeTab === "drivers" && <TabDrivers cliente={cliente} />}
                </div>
            </div>
        </div>
        </div>
    );
}


function TabInfo({ cliente }: { cliente: ClientDTO | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna Principal */}
      <div className="lg:col-span-2 space-y-6">
        {/* Información de Contacto */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail size={20} className="text-muted-foreground/70" />
            Información de Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium text-foreground">{cliente?.email}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
              <p className="font-medium text-foreground">{cliente?.phone}</p>
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin size={20} className="text-muted-foreground/70" />
            Dirección
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* País y Estado en una fila */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">País</p>
              <p className="font-medium text-foreground">{cliente?.address?.country?.name || "No registrado"}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Estado</p>
              <p className="font-medium text-foreground">{cliente?.address?.state?.name || "No registrado"}</p>
            </div>

            {/* Ciudad y Colonia */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
              <p className="font-medium text-foreground">{cliente?.address?.city?.name || "No registrado"}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Colonia</p>
              <p className="font-medium text-foreground">{cliente?.address?.neighborhood || "No registrado"}</p>
            </div>

            {/* Calle ocupa toda la fila */}
            <div className="p-4 bg-muted/50 rounded-lg md:col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Calle</p>
              <p className="font-medium text-foreground">{cliente?.address?.street || "No registrado"}</p>
            </div>

            {/* Números y CP en una fila de 3 */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Núm. Exterior</p>
              <p className="font-medium text-foreground">{cliente?.address?.ext_number || "—"}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Núm. Interior</p>
              <p className="font-medium text-foreground">{cliente?.address?.int_number || "—"}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg md:col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Código Postal</p>
              <p className="font-medium text-foreground">{cliente?.address?.postal_code || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Columna Lateral */}
      <div className="space-y-6">
        <CuentaPagoCliente id_client={cliente?.id_client} />

        {/* Fechas */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-muted-foreground/70" />
            Fechas
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de registro</p>
              <p className="font-medium text-foreground">
                {formatDate(cliente?.dt_register)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="font-medium text-foreground">
                {formatDate(cliente?.dt_updated)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function TabUsers({ cliente }: { cliente: ClientDTO | null }) {
  const { user } = useAuthStore();
  const isMaster = user?.i_rol === 1;
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [users, setUsers] = useState<UsuarioDTO[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const nombreRef = useRef<HTMLInputElement>(null);
  const apellidosRef = useRef<HTMLInputElement>(null);
  const celularRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    if (!cliente?.id_client) return;
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const response = await api.get<ApiResponse<UsuarioDTO[]>>(`/users/${cliente?.id_client}`);
      setUsers(response.data ?? []);
    } catch (err: any) {
      setErrorUsers(err?.message || "Error al cargar los usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [cliente?.id_client]);

  const handleResetPassword = async (id_user: number) => {
    setResettingId(id_user);
    try {
      await api.patch<ApiResponse<null>>(`/admin/users/${id_user}/reset-password`, {});
      toast.success("Contraseña restablecida a 1234");
    } catch (err: any) {
      toast.error(err?.message || "Error al restablecer la contraseña");
    } finally {
      setResettingId(null);
    }
  };

  const handleSaveUser = async (): Promise<boolean> => {
    setIsLoadingModal(true);
    try {

      const name = (nombreRef.current?.value || "").trim();
      const lastname = (apellidosRef.current?.value || "").trim();
      const phone = (celularRef.current?.value || "").replace(/\D/g, "");
      const password = passwordRef.current?.value || "";
      if (!name || !lastname) { toast.error("Escribe el nombre y los apellidos"); return false; }
      if (phone.length !== 10) { toast.error("El celular debe tener 10 dígitos"); return false; }
      if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return false; }

      const response = await api.post<ApiResponse<CreateUserInCLientDetailDTO>>("/users/super/client-user", {
        name,
        lastname,
        phone,
        password,
        id_client: cliente?.id_client || 0,
      });

      if (!response.ok) {
        toast.error(response.message || "Error al agregar el usuario");
        return false;
      }

      toast.success("Usuario agregado exitosamente");
      fetchUsers();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Error al agregar el usuario");
      return false;
    } finally {
      setIsLoadingModal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Usuarios del Cliente
          {users.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full font-normal">
              {users.length}
            </span>
          )}
        </h3>

        <ModalCustom
          buttonTitle="Agregar Usuario"
          dialogTitle="Agregar Nuevo Usuario"
          dialogDescription="Entrará con su celular y esta contraseña temporal. Se le pedirá cambiarla en su primer acceso."
          isLoading={isLoadingModal}
          onSubmit={handleSaveUser}
          body={
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="nombre">Nombre</Label>
                <Input ref={nombreRef} id="nombre" name="nombre" defaultValue="" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input ref={apellidosRef} id="apellidos" name="apellidos" defaultValue="" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="celular">Celular (su usuario de acceso)</Label>
                <Input ref={celularRef} type="tel" inputMode="numeric" maxLength={10} id="celular" name="celular" defaultValue="" placeholder="10 dígitos" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Contraseña temporal</Label>
                <Input ref={passwordRef} type="text" id="password" name="password" defaultValue="" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
          }
        />
      </div>

      {errorUsers && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorUsers}</AlertDescription>
        </Alert>
      )}

      {loadingUsers ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Registro</th>
                {isMaster && <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Operaciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No hay usuarios registrados para este cliente
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id_user} className="hover:bg-accent">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-medium text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.name} {u.lastname}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-muted text-foreground text-sm rounded-md">
                        {(u as any).id_user_creator && users.some((x) => x.id_user === (u as any).id_user_creator) ? "Empleado" : "Dueño"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.i_status === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-success">
                          <div className="w-2 h-2 bg-success rounded-full" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                          <div className="w-2 h-2 bg-destructive rounded-full" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(u.dt_register).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    {isMaster && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleResetPassword(u.id_user)}
                          disabled={resettingId === u.id_user}
                          className="text-sm text-primary hover:underline disabled:opacity-50"
                        >
                          {resettingId === u.id_user ? "Restableciendo..." : "Restablecer contraseña"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function TabProducts({ cliente }: { cliente: any | null }) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cliente?.id_client) return;
    setLoading(true);
    setError(null);
    api.get<ApiResponse<ProductDTO[]>>(`/products/${cliente.id_client}`)
      .then((res) => setProducts(res.data ?? []))
      .catch((err: any) => setError(err?.message || "Error al cargar los productos"))
      .finally(() => setLoading(false));
  }, [cliente?.id_client]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Productos Asignados
          {products.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full font-normal">
              {products.length}
            </span>
          )}
        </h3>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Producto</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Descripción</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No hay productos asignados a este cliente
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id_product} className="hover:bg-accent">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <Package size={16} className="text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.description ?? <span className="italic text-muted-foreground/70">Sin descripción</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.i_status === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-success">
                          <div className="w-2 h-2 bg-success rounded-full" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                          <div className="w-2 h-2 bg-destructive rounded-full" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(p.dt_created).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function TabDrivers({ cliente }: { cliente: any | null }) {
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);

  useEffect(() => {
    if (!cliente?.id_client) return;
    setLoading(true);
    setError(null);
    getDriversByClient(cliente.id_client)
      .then((res) => setDrivers(res.data ?? []))
      .catch((err: any) => setError(err?.message || "Error al cargar los choferes"))
      .finally(() => setLoading(false));
  }, [cliente?.id_client]);

  const handleResetPassword = async (id_driver: number) => {
    setResettingId(id_driver);
    try {
      await api.patch<ApiResponse<null>>(`/drivers/${id_driver}/reset-password`, {});
      toast.success("Contraseña restablecida a 1234");
    } catch (err: any) {
      toast.error(err?.message || "Error al restablecer la contraseña");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Choferes
          {drivers.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full font-normal">
              {drivers.length}
            </span>
          )}
        </h3>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Chofer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Correo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Alta</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Este cliente todavía no tiene choferes registrados
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id_driver} className="hover:bg-accent">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {d.vc_photo ? (
                            <img src={d.vc_photo} alt={d.name} className="w-full h-full object-cover" />
                          ) : (
                            <Truck size={16} className="text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-foreground">{d.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} /> {d.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {d.email ?? <span className="italic text-muted-foreground/70">Sin correo</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.i_status === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-success">
                          <div className="w-2 h-2 bg-success rounded-full" />
                          Activo
                        </span>
                      ) : d.i_status === 2 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-warning-foreground dark:text-warning">
                          <div className="w-2 h-2 bg-warning rounded-full" />
                          Suspendido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                          <div className="w-2 h-2 bg-destructive rounded-full" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(d.dt_register).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleResetPassword(d.id_driver)}
                        disabled={resettingId === d.id_driver}
                        className="text-sm text-primary hover:underline disabled:opacity-50"
                      >
                        {resettingId === d.id_driver ? "Restableciendo..." : "Restablecer contraseña"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
