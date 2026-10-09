import { toast } from "sonner"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Mail, MapPin, FileText, Users, Package, Store, Clock, TrendingUp, ChevronDown, CreditCard, Ticket, Loader2, Phone, Image, Pencil, Ban, RotateCcw, Trash2 } from "lucide-react"


import { useAuthStore } from "@/stores"
import { clientDetail } from "@/types/clients"
import { getMyClient, updateMyClient } from "@/Fetch/clientes"
import { changePassword } from "@/Fetch/perfil"
import { createClientUser, listClientUsers, updateClientUser, setClientUserStatus, deleteClientUser, ClientUserRow } from "@/Fetch/usuarios"
import { getWhatsappSoporteClientes } from "@/Fetch/appConfig"
import { api, ApiResponse } from "@/lib"
import { PageWrapper, ModalCustom, Input, Label, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components"


const tabs = [
  { id: "info", label: "Información", icon: FileText },
  { id: "users", label: "Usuarios", icon: Users },
];


const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getInitials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();


export function MiNegocio() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("info");
  const [cliente, setCliente] = useState<clientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  useEffect(() => {
    if (!user?.id_client) return;
    getMyClient()
      .then((res) => setCliente(res.data))
      .catch(() => toast.error("Error al cargar la información del negocio"))
      .finally(() => setLoading(false));
    api.get<ApiResponse<{ url: string | null }>>(`/clients/${user.id_client}/logo`)
      .then((res) => setLogoUrl(res.data?.url ?? null))
      .catch(() => {});
  }, [user?.id_client]);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id_client) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<ApiResponse<{ url: string }>>(`/clients/${user.id_client}/logo`, fd);
      setLogoUrl(res.data.url);
      toast.success("Logo actualizado exitosamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  if (loading)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</span>
        </div>
      </PageWrapper>
    );

  if (!cliente)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: "var(--text-secondary)" }}>
          No se encontró información del negocio.
        </div>
      </PageWrapper>
    );

  return (
    <div className="min-h-full" style={{ backgroundColor: "var(--bg)" }}>

      {/* Header fijo */}
      <div className="sticky top-0 z-10 border-b px-6 py-4" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Mi Negocio</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Información y gestión de tu empresa</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Tarjeta principal */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="h-32 bg-primary" />

          <div className="px-6 pb-6 pt-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16">

              {/* Avatar / Logo */}
              <label
                className="relative w-32 h-32 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                onMouseEnter={() => setLogoHover(true)}
                onMouseLeave={() => setLogoHover(false)}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center">
                    <span className="text-4xl font-semibold text-white">
                      {getInitials(cliente.name)}
                    </span>
                  </div>
                )}
                {(logoHover || uploadingLogo) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-center">
                    {uploadingLogo ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <div>
                        <Image size={22} className="mx-auto mb-1" />
                        <span className="text-xs">{logoUrl ? "Cambiar logo" : "Subir logo"}</span>
                      </div>
                    )}
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploadingLogo} />
              </label>

              {/* Nombre + estado */}
              <div className="flex-1 md:mb-2 md:pt-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-foreground">{cliente.name}</h2>
                  {cliente.i_status ? (
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
                <p className="text-muted-foreground mt-1">{cliente.rfc || "Sin RFC registrado"}</p>
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
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "info"     && <TabInfo cliente={cliente} onSaved={setCliente} />}
            {activeTab === "users"    && <TabUsers cliente={cliente} />}
          </div>
        </div>
      </div>
    </div>
  );
}


function TabInfo({ cliente, onSaved }: { cliente: clientDetail; onSaved: (c: clientDetail) => void }) {
  const [editing, setEditing] = useState(false);
  const esDueno = !!cliente.is_owner;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", rfc: "", phone: "", email: "", address: "", city: "", notes: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const abrirEdicion = () => {
    setForm({
      name: cliente.name || "",
      rfc: cliente.rfc || "",
      phone: cliente.phone || "",
      email: cliente.email || "",
      address: cliente.address || "",
      city: cliente.city || "",
      notes: cliente.addiccional_notes || "",
    });
    setEditing(true);
  };

  const guardar = async () => {
    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "");
    const email = form.email.trim();
    if (!name) { toast.error("Escribe el nombre del negocio"); return; }
    if (phone.length !== 10) { toast.error("El teléfono debe tener 10 dígitos"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("El correo no es válido"); return; }
    setSaving(true);
    try {
      const res = await updateMyClient({
        name,
        rfc: form.rfc.trim().toUpperCase(),
        phone,
        email,
        address: form.address.trim(),
        city: form.city.trim(),
        notes: form.notes.trim(),
      });
      onSaved({ ...cliente, ...res.data });
      toast.success("Información actualizada");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la información");
    } finally {
      setSaving(false);
    }
  };

  const handleContactSupport = async () => {
    try {
      const res = await getWhatsappSoporteClientes();
      const number = res.data.value;
      if (!number) {
        toast.error("Todavía no hay un número de soporte configurado");
        return;
      }
      const message = encodeURIComponent(
        `Hola, soy ${cliente.name} y necesito ayuda con mi cuenta en Promotoria.`
      );
      window.open(`https://wa.me/${number}?text=${message}`, "_blank");
    } catch {
      toast.error("Error al obtener el número de soporte");
    }
  };

  const areaClase =
    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 size={18} className="text-muted-foreground/70" />
            Información del negocio
          </h3>
          {!editing && esDueno && (
            <Button size="sm" variant="outline" onClick={abrirEdicion}>
              <Pencil className="w-3 h-3 mr-1" />Editar información
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="in-name">Nombre del negocio</Label>
                <Input id="in-name" value={form.name} onChange={set("name")} maxLength={100} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="in-rfc">RFC</Label>
                <Input id="in-rfc" value={form.rfc} onChange={set("rfc")} maxLength={15} className="uppercase" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="in-phone">Teléfono (con el que entras al panel)</Label>
                <Input id="in-phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="in-email">Correo electrónico</Label>
                <Input id="in-email" type="email" value={form.email} onChange={set("email")} maxLength={255} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="in-address">Calle y número</Label>
                <Input id="in-address" value={form.address} onChange={set("address")} maxLength={255} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="in-city">Ciudad</Label>
                <Input id="in-city" value={form.city} onChange={set("city")} maxLength={255} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="in-notes">Observaciones</Label>
                <textarea id="in-notes" className={areaClase} value={form.notes} onChange={set("notes")} maxLength={2000} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={guardar} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Guardar cambios
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Mail size={18} className="text-muted-foreground/70" />
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-foreground">{cliente.email || "—"}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{esDueno ? "Teléfono (tu usuario de acceso)" : "Teléfono"}</p>
                  <p className="font-medium text-foreground">{cliente.phone || "—"}</p>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MapPin size={18} className="text-muted-foreground/70" />
                Dirección
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Calle</p>
                  <p className="font-medium text-foreground">{cliente.address || "—"}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
                  <p className="font-medium text-foreground">{cliente.city || "—"}</p>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText size={18} className="text-muted-foreground/70" />
                Observaciones
              </h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{cliente.addiccional_notes || "—"}</p>
              </div>
            </div>
          </>
        )}
              {esDueno && !editing && <CambiarPasswordCard />}
      </div>

      {/* Columna lateral */}
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground/70" />
            Fechas
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Registrado</p>
              <p className="font-medium text-foreground">{formatDate(cliente.dt_register)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="font-medium text-foreground">{formatDate(cliente.dt_updated)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-muted-foreground/70" />
            Acciones Rápidas
          </h3>
          <div className="space-y-2">
            <button
              onClick={handleContactSupport}
              className="w-full px-4 py-2.5 text-left text-foreground bg-white border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
            >
              <Phone size={16} className="text-muted-foreground/70" />
              <span className="text-sm">Contactar Soporte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CambiarPasswordCard() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!actual) { toast.error("Escribe tu contraseña actual"); return; }
    if (nueva.length < 6) { toast.error("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (nueva !== confirma) { toast.error("Las contraseñas no coinciden"); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: actual, newPassword: nueva });
      toast.success("Contraseña actualizada");
      setActual(""); setNueva(""); setConfirma("");
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg">
      <h3 className="text-lg font-semibold text-foreground">Cambiar contraseña</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="pw-actual">Contraseña actual</Label>
          <Input id="pw-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pw-nueva">Nueva contraseña</Label>
          <Input id="pw-nueva" type="password" placeholder="Mínimo 6 caracteres" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pw-confirma">Confirma la nueva</Label>
          <Input id="pw-confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={saving || !actual || !nueva || !confirma}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Cambiar contraseña
        </Button>
      </div>
    </div>
  );
}

function TabUsers(props: { cliente: clientDetail }) {
  const esDueno = !!props.cliente.is_owner;
  const [users, setUsers] = useState<ClientUserRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  const nombreRef = useRef<HTMLInputElement>(null);
  const apellidoRef = useRef<HTMLInputElement>(null);
  const celularRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // edición
  const [editing, setEditing] = useState<ClientUserRow | null>(null);
  const [eName, setEName] = useState("");
  const [eLast, setELast] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [ePass, setEPass] = useState("");
  const [saving, setSaving] = useState(false);

  // confirmación (suspender / eliminar)
  const [confirm, setConfirm] = useState<{ user: ClientUserRow; action: "suspend" | "delete" } | null>(null);
  const [working, setWorking] = useState(false);

  const mensajeError = (err: any, fallback: string): string =>
    err?.response?.data?.message || err?.data?.message || err?.message || fallback;

  const cargar = () => {
    setLoadingList(true);
    listClientUsers()
      .then((res) => { if (res.ok) setUsers(res.data); })
      .catch(() => toast.error("Error al cargar los usuarios"))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleSaveUser = async (): Promise<boolean> => {
    const name = (nombreRef.current?.value || "").trim();
    const lastname = (apellidoRef.current?.value || "").trim();
    const phone = (celularRef.current?.value || "").replace(/\D/g, "");
    const password = passwordRef.current?.value || "";

    if (!name || !lastname) { toast.error("Escribe el nombre y el apellido"); return false; }
    if (phone.length !== 10) { toast.error("El celular debe tener 10 dígitos"); return false; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return false; }

    setIsLoadingModal(true);
    try {
      const res: any = await createClientUser({ name, lastname, phone, password });
      if (res?.ok === false || res?.error) { toast.error(res?.message || "Error al agregar el usuario"); return false; }
      toast.success("Usuario agregado exitosamente");
      cargar();
      return true;
    } catch (err) {
      toast.error(mensajeError(err, "Error al agregar el usuario"));
      return false;
    } finally {
      setIsLoadingModal(false);
    }
  };

  const abrirEditar = (u: ClientUserRow) => {
    setEditing(u);
    setEName(u.name);
    setELast(u.lastname);
    setEPhone(u.email);
    setEPass("");
  };

  const guardarEdicion = async () => {
    if (!editing) return;
    const phone = ePhone.replace(/\D/g, "");
    if (!eName.trim() || !eLast.trim()) { toast.error("Escribe el nombre y el apellido"); return; }
    if (phone.length !== 10) { toast.error("El celular debe tener 10 dígitos"); return; }
    if (ePass && ePass.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setSaving(true);
    try {
      const payload: { name: string; lastname: string; phone: string; password?: string } = {
        name: eName.trim(), lastname: eLast.trim(), phone,
      };
      if (ePass) payload.password = ePass;
      const res: any = await updateClientUser(editing.id_user, payload);
      if (res?.ok === false || res?.error) { toast.error(res?.message || "Error al guardar"); return; }
      toast.success("Usuario actualizado");
      setEditing(null);
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const reactivar = async (u: ClientUserRow) => {
    try {
      const res: any = await setClientUserStatus(u.id_user, 1);
      if (res?.ok === false || res?.error) { toast.error(res?.message || "Error al reactivar"); return; }
      toast.success("Usuario reactivado");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "Error al reactivar"));
    }
  };

  const ejecutarConfirmacion = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      const res: any = confirm.action === "suspend"
        ? await setClientUserStatus(confirm.user.id_user, 0)
        : await deleteClientUser(confirm.user.id_user);
      if (res?.ok === false || res?.error) { toast.error(res?.message || "No se pudo completar la acción"); return; }
      toast.success(confirm.action === "suspend" ? "Usuario suspendido" : "Usuario eliminado");
      setConfirm(null);
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo completar la acción"));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Usuarios del negocio</h3>
        {esDueno && (
        <ModalCustom
          buttonTitle="Agregar Usuario"
          dialogTitle="Agregar Nuevo Usuario"
          dialogDescription="Entrará al panel con su celular y la contraseña que le asignes. Se le pedirá cambiarla en su primer acceso."
          isLoading={isLoadingModal}
          onSubmit={handleSaveUser}
          body={
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mn-nombre">Nombre</Label>
                <Input ref={nombreRef} id="mn-nombre" placeholder="Nombre" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mn-apellido">Apellido</Label>
                <Input ref={apellidoRef} id="mn-apellido" placeholder="Apellido" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mn-celular">Celular</Label>
                <Input ref={celularRef} id="mn-celular" type="tel" inputMode="numeric" maxLength={10} placeholder="10 dígitos" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mn-password">Contraseña</Label>
                <Input ref={passwordRef} id="mn-password" type="password" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
          }
        />
        )}
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Celular</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingList ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground/70">
                  <Loader2 className="inline w-4 h-4 animate-spin mr-2" />Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground/70">
                  Aún no hay usuarios registrados.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id_user} className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {u.name} {u.lastname}
                    {u.is_me && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-info/15 text-info">Tú</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {u.i_status === 1 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success/15 text-success">Activo</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning-foreground dark:text-warning">Suspendido</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className={esDueno ? "flex gap-2" : "hidden"}>
                      <Button size="sm" variant="outline" onClick={() => abrirEditar(u)}>
                        <Pencil className="w-3 h-3 mr-1" />Editar
                      </Button>
                      {!u.is_me && (u.i_status === 1 ? (
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ user: u, action: "suspend" })}>
                          <Ban className="w-3 h-3 mr-1" />Suspender
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => reactivar(u)}>
                          <RotateCcw className="w-3 h-3 mr-1" />Reactivar
                        </Button>
                      ))}
                      {!u.is_me && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setConfirm({ user: u, action: "delete" })}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />Eliminar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Editar */}
      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ed-nombre">Nombre</Label>
              <Input id="ed-nombre" value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-apellido">Apellido</Label>
              <Input id="ed-apellido" value={eLast} onChange={(e) => setELast(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-celular">Celular</Label>
              <Input id="ed-celular" type="tel" inputMode="numeric" maxLength={10} value={ePhone} onChange={(e) => setEPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-pass">Nueva contraseña (opcional)</Label>
              <Input id="ed-pass" type="password" placeholder="Déjalo vacío para no cambiarla" value={ePass} onChange={(e) => setEPass(e.target.value)} />
              <p className="text-xs text-muted-foreground">Si la cambias, se le pedirá poner una nueva en su próximo acceso.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardarEdicion} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar suspender / eliminar */}
      <Dialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.action === "delete" ? "Eliminar usuario" : "Suspender usuario"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.action === "delete"
              ? `¿Eliminar a ${confirm?.user.name} ${confirm?.user.lastname}? Ya no podrá entrar al panel y desaparecerá de la lista.`
              : `¿Suspender a ${confirm?.user.name} ${confirm?.user.lastname}? No podrá entrar al panel hasta que lo reactives.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={working}>Cancelar</Button>
            <Button
              onClick={ejecutarConfirmacion}
              disabled={working}
              className={confirm?.action === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirm?.action === "delete" ? "Sí, eliminar" : "Sí, suspender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabStores() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Establecimientos</h3>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
          <Store size={28} className="text-muted-foreground/70" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Ve a la sección <span className="font-semibold text-foreground">Establecimientos</span> para gestionar tus sucursales.
        </p>
      </div>
    </div>
  );
}
