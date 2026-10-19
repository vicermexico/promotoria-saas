import { Loader2, Search, ImageOff, PackageOpen, ImagePlus, X, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores'
import { api, ApiResponse } from '@/lib'
import { ClientListDTO, ProductDTO, QuestionDTO } from '@/dtos'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Input, Checkbox } from '@/components'
import { ProductoPickerModal } from './components/ProductoPickerModal'
import { getTaskSettings } from '@/Fetch/taskSettings'
import { getRequestPricingSettings } from '@/Fetch/appConfig'

interface ProductoSeleccionado extends ProductDTO {
  preguntas: {
    id_pregunta: number;
    vc_pregunta: string;
    dc_precio: number;
  }[];
}

export const CrearSolicitud = () => {
  const { user } = useAuthStore();
  
  // Validamos si es super admin
  const isSuperAdmin = user?.id_client === 0 || user?.i_rol === 1;

  const [nombre, setNombre] = useState('');
  
  // States para Clientes (Solo Super Admin)
  const [clientes, setClientes] = useState<ClientListDTO[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // Listas de la base de datos
  const [listaPreguntas, setListaPreguntas] = useState<QuestionDTO[]>([]); // Cambiado a any[] o a tu interface Question
  
  const [cargando, setCargando] = useState(false);
  const [errorTexto, setErrorTexto] = useState<string | null>(null);

  // Estado principal de la solicitud
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);

  // Modal selector de productos
  const [modalOpen, setModalOpen] = useState(false);

  // Búsqueda de preguntas por producto
  const [busquedaPreguntas, setBusquedaPreguntas] = useState<Record<number, string>>({});

  // Imagen de anaquel
  const [imagenAnaquel, setImagenAnaquel] = useState<File | null>(null);
  const [previewAnaquel, setPreviewAnaquel] = useState<string | null>(null);
  const [prepedido, setPrepedido] = useState(false);
  const [preorderDateMode, setPreorderDateMode] = useState<'ABIERTA' | 'CERRADA'>('ABIERTA');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuracion de precios por producto (editable por el master en
  // Configurar App). Se usan estos valores por defecto mientras carga.
  const [pricing, setPricing] = useState({ price_per_product: 15, min_products: 3, max_products: 6 });

  useEffect(() => {
    getRequestPricingSettings().then((res) => {
      if (res.ok) setPricing(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchClients = async () => {
        setCargandoClientes(true);
        try {
          const response = await api.get<ApiResponse<ClientListDTO[]>>('/clients/');
          setClientes(response.data);
          
          if (response.data.length > 0) {
            setSelectedClientId(response.data[0].id_client);
          }

        } catch (error) {
          console.error("Error al cargar clientes:", error);
          setErrorTexto("Error al cargar la lista de clientes.");
        } finally {
          setCargandoClientes(false);
        }
      };
      fetchClients();
    } else {
      setSelectedClientId(user?.id_client || null);
    }
  }, [isSuperAdmin, user]);

  // --- EFECTO 2: Cargar Productos y Preguntas (LÓGICA CORREGIDA) ---
  useEffect(() => {
    if (!selectedClientId) return;

    const cargarDatos = async () => {
      setCargando(true);
      setErrorTexto(null);
      setProductosSeleccionados([]);
      setImagenAnaquel(null);
      setPreviewAnaquel(null);

      try {
        // Los productos se cargan paginados desde el modal (ProductoPickerModal).
        // Aquí solo necesitamos las preguntas para configurarlas por producto.
        const respPreguntas = await api.get<ApiResponse<QuestionDTO[]>>(`/questions/list/${selectedClientId}`);
        setListaPreguntas(respPreguntas.data);
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
        setErrorTexto(error instanceof Error ? error.message : "Error al comunicarse con el servidor");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [selectedClientId]);

  // --- MANEJADORES DE EVENTOS ---
  const handleClientChange = (value: string) => {
    setSelectedClientId(Number(value));
  };

  const toggleProducto = (productoDB: ProductDTO) => {
    setProductosSeleccionados(prev => {
      const idProducto = productoDB.id_product; 
      const existe = prev.find(p => p.id_product === idProducto);
      
      if (existe) {
        return prev.filter(p => p.id_product !== idProducto);
      } else {
        return [...prev, { 
          ...productoDB,
          preguntas: [] 
        }];
      }
    });
  };

  // ATENCIÓN: Adaptado a los nombres de la base de datos de "Question"
  const togglePregunta = (id_product: number, preguntaDB: any) => {
    setProductosSeleccionados(prev =>
      prev.map(prod => {
        if (prod.id_product === id_product) {
          const preguntaExiste = prod.preguntas.find(q => q.id_pregunta === preguntaDB.id_question);

          let nuevasPreguntas;
          if (preguntaExiste) {
            nuevasPreguntas = prod.preguntas.filter(q => q.id_pregunta !== preguntaDB.id_question);
          } else {
            nuevasPreguntas = [...prod.preguntas, {
              id_pregunta: preguntaDB.id_question,
              vc_pregunta: preguntaDB.question,
              dc_precio: Number(preguntaDB.f_cost ?? 0)
            }];
          }
          return { ...prod, preguntas: nuevasPreguntas };
        }
        return prod;
      })
    );
  };

  // --- MANEJADORES DE IMAGEN ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    setImagenAnaquel(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAnaquel(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagenAnaquel(null);
    setPreviewAnaquel(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- CÁLCULOS DINÁMICOS (LÓGICA DE PRECIOS REAL) ---
  // Costo base según cantidad de PRODUCTOS: el costo por producto, el
  // mínimo y el máximo son configurables por el master en Configurar App.
  // Cada pregunta seleccionada suma su propio costo (lo pone el Master, puede ser $0 = gratis).
  const totalPreguntas = productosSeleccionados.reduce((sum, prod) => sum + prod.preguntas.length, 0);

  const numProductos = productosSeleccionados.length;
  const productosFacturables = Math.min(Math.max(numProductos, pricing.min_products), pricing.max_products);
  const costoBase = productosFacturables * pricing.price_per_product;

  const costoPreguntas = productosSeleccionados.reduce(
    (sum, prod) => sum + prod.preguntas.reduce((s, q) => s + (q.dc_precio || 0), 0),
    0
  );

  const subtotalSinPrepedido = costoBase + costoPreguntas;

  const [prepedidoConfig, setPrepedidoConfig] = useState<{ tipo: 'FIXED' | 'PERCENTAGE'; valor: number } | null>(null);
  useEffect(() => {
    getTaskSettings()
      .then((res) => {
        if (res.ok) {
          setPrepedidoConfig({
            tipo: res.data.preorder_pricing_type ?? 'FIXED',
            valor: Number(res.data.preorder_pricing_value ?? 0),
          });
        }
      })
      .catch(() => {});
  }, []);

  const cargoPrepedido = !prepedido || !prepedidoConfig
    ? 0
    : prepedidoConfig.tipo === 'PERCENTAGE'
      ? Math.round(subtotalSinPrepedido * (prepedidoConfig.valor / 100) * 100) / 100
      : prepedidoConfig.valor;

  const granTotal = subtotalSinPrepedido + cargoPrepedido;

  // --- GUARDAR ---
  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast.error("Por favor ingresa un nombre para la solicitud.");
      return;
    }
    if (productosSeleccionados.length === 0) {
      toast.error("Selecciona al menos un producto.");
      return;
    }
    if (!selectedClientId) {
      toast.error("No hay un cliente seleccionado.");
      return;
    }

    if (!user || !user.id_user) {
      toast.error("Error de sesión: No se encontró el ID de usuario.");
      return;
    }

    setCargando(true);

    try {
      const formData = new FormData();
      formData.append("id_user", user.id_user.toString());
      formData.append("id_client", selectedClientId.toString());
      formData.append("vc_name", nombre.trim());
      formData.append("f_value", granTotal.toString());
      formData.append("b_preorder", prepedido.toString());
      if (prepedido) {
        formData.append("preorder_date_mode", preorderDateMode);
      }

      if (imagenAnaquel) {
        formData.append("rackImage", imagenAnaquel);
      }

      formData.append("products", JSON.stringify(productosSeleccionados.map(prod => ({
        id_product: prod.id_product,
        questions: prod.preguntas.map(q => ({
          id_question: q.id_pregunta,
        }))
      }))));

      await api.upload<ApiResponse>('/requests/', formData);

      toast.success("¡Solicitud guardada con éxito!");
      setNombre('');
      setProductosSeleccionados([]);
      setImagenAnaquel(null);
      setPreviewAnaquel(null);
      setBusquedaPreguntas({});
      setPrepedido(false);
    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast.error(error.message || "Ocurrió un error al guardar la solicitud.");
    } finally {
      setCargando(false);
    }
  };

  // --- RENDERIZADO ---
  if (isSuperAdmin && cargandoClientes) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-info mb-2" />
        <p className="text-muted-foreground font-medium">Cargando lista de clientes...</p>
      </div>
    );
  }

  const puedeGuardar = !!selectedClientId && !!nombre.trim() && productosSeleccionados.length > 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Crear Nueva Solicitud</h2>
      </div>

      {errorTexto && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/30">
          {errorTexto}
        </div>
      )}

      {/* SELECTOR DE CLIENTE */}
      {isSuperAdmin && clientes.length > 0 && (
        <div className="bg-muted/50 p-4 rounded-xl border border-border">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Selecciona el Cliente:
          </label>
          <Select
            value={selectedClientId?.toString() || ""}
            onValueChange={handleClientChange}
          >
            <SelectTrigger className="w-full md:w-1/2 bg-card">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((client) => (
                <SelectItem
                  key={client.id_client}
                  value={client.id_client.toString()}
                >
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!selectedClientId ? (
        isSuperAdmin && (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            Selecciona un cliente para comenzar a crear la solicitud.
          </div>
        )
      ) : (
        // ===== LAYOUT EN 2 COLUMNAS: resumen de costo (izquierda) + formulario (derecha) =====
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ----- COLUMNA 1: RESUMEN DE COSTO (sticky) ----- */}
          <aside className="lg:col-span-1 lg:sticky lg:top-6 order-first">
            <div className="bg-primary text-primary-foreground p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="font-bold text-lg">Resumen del costo</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-primary-foreground/70">{pricing.max_products <= pricing.min_products ? "Costo de la solicitud (productos ilimitados)" : `Costo base (hasta ${pricing.min_products} producto${pricing.min_products !== 1 ? "s" : ""})`}:</span>
                  <span className="font-medium tabular-nums">${(pricing.max_products <= pricing.min_products ? costoBase : Math.min(productosFacturables, pricing.min_products) * pricing.price_per_product).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-primary-foreground/20 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">Adicionales extras</p>
                  {pricing.max_products > pricing.min_products && (
                    <div className="flex justify-between gap-4 text-primary-foreground/90">
                      <span>Productos extra ({Math.max(productosFacturables - pricing.min_products, 0)}):</span>
                      <span className="tabular-nums">+ ${(Math.max(productosFacturables - pricing.min_products, 0) * pricing.price_per_product).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 text-primary-foreground/90">
                    <span>Preguntas extra ({totalPreguntas}):</span>
                    <span className="tabular-nums">+ ${costoPreguntas.toFixed(2)}</span>
                  </div>
                  {prepedido && (
                    <div className="flex justify-between gap-4 text-primary-foreground/90">
                      <span>Cargo por Prepedido:</span>
                      <span className="tabular-nums">+ ${cargoPrepedido.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-4 text-lg pt-3 border-t border-primary-foreground/20">
                  <span className="font-bold">Costo Total:</span>
                  <span className="font-bold tabular-nums">${granTotal.toFixed(2)} <span className="text-xs font-semibold">+ IVA</span></span>
                </div>
                <p className="text-xs text-primary-foreground/70">Los costos son más IVA (16%). El IVA se suma al crear el pedido o al facturar.</p>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-primary-foreground/70 pt-1">
                <span>{productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? 's' : ''}</span>
                <span>{totalPreguntas} pregunta{totalPreguntas !== 1 ? 's' : ''}</span>
              </div>

              <Button
                onClick={handleGuardar}
                disabled={cargando || !puedeGuardar}
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 disabled:opacity-60 font-semibold py-3 h-auto text-base"
              >
                {cargando ? 'Guardando...' : 'Crear Solicitud'}
              </Button>
              {!puedeGuardar && (
                <p className="text-xs text-primary-foreground/60 text-center">
                  Ingresa un nombre y añade al menos un producto.
                </p>
              )}
            </div>
          </aside>

          {/* ----- COLUMNA 2: FORMULARIO ----- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos generales */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
              {/* Nombre de la solicitud */}
              <div>
                <label className="block text-foreground font-semibold mb-2">Nombre de la Solicitud</label>
                <Input
                  type="text"
                  placeholder="Ej. Auditoría de Verano"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              {/* Imagen de anaquel (ancho completo) */}
              <div>
                <label className="block text-foreground font-semibold mb-2">Imagen del Anaquel</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                {!previewAnaquel ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-input rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-ring hover:text-foreground transition-colors"
                  >
                    <ImagePlus size={32} />
                    <span className="text-sm font-medium">Haz clic para subir una foto del anaquel</span>
                    <span className="text-xs text-muted-foreground/70">PNG, JPG o WEBP hasta 5MB</span>
                  </button>
                ) : (
                  <div className="relative w-full">
                    <div className="aspect-video bg-muted rounded-xl overflow-hidden border border-border">
                      <img
                        src={previewAnaquel}
                        alt="Vista previa del anaquel"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow hover:bg-destructive/90 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Extra: Prepedido */}
              <div className="rounded-xl border border-border overflow-hidden">
                <label className="flex items-start gap-3 p-4 cursor-pointer hover:border-ring transition-colors">
                  <input
                    type="checkbox"
                    checked={prepedido}
                    onChange={(e) => setPrepedido(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="font-semibold text-foreground">Solicitar que el promotor levante pedido</p>
                    <p className="text-sm text-muted-foreground">
                      Si el promotor detecta que a la tienda le faltan piezas contra el mínimo
                      configurado, podrá levantar un pedido con el encargado y mandárselo por
                      WhatsApp directamente desde la app.
                    </p>
                  </div>
                </label>
                {prepedido && (
                  <div className="px-4 pb-4 space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-ring transition-colors">
                      <input
                        type="radio"
                        name="preorderDateMode"
                        checked={preorderDateMode === 'ABIERTA'}
                        onChange={() => setPreorderDateMode('ABIERTA')}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <p className="font-semibold text-foreground text-sm">Fecha abierta</p>
                        <p className="text-xs text-muted-foreground">
                          El encargado o dueño podrá elegir la fecha en la cual quiera que se le
                          entregue su pedido, y si lo requiere por la mañana o por la tarde dicha
                          entrega.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-ring transition-colors">
                      <input
                        type="radio"
                        name="preorderDateMode"
                        checked={preorderDateMode === 'CERRADA'}
                        onChange={() => setPreorderDateMode('CERRADA')}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <p className="font-semibold text-foreground text-sm">Fecha cerrada</p>
                        <p className="text-xs text-muted-foreground">
                          El encargado o dueño se tendrá que recibir el pedido en el día y turno
                          (mañana o tarde) que el Cliente asigne; dicha fecha y turno se
                          asignarán conforme a las rutas establecidas por el cliente. En caso de
                          que esa tienda no cuente con una ruta asignada, se le establecerá
                          fecha abierta a ese cliente.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Productos a auditar */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <label className="block text-foreground font-semibold">Productos a auditar</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {productosSeleccionados.length} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''} · {totalPreguntas} pregunta{totalPreguntas !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2 shrink-0">
                  <Plus size={16} /> Añadir productos
                </Button>
              </div>

              {cargando ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-info mr-2" />
                  <span className="text-muted-foreground">Cargando catálogos del cliente...</span>
                </div>
              ) : productosSeleccionados.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <PackageOpen size={32} className="mb-2 opacity-60" />
                  <p className="text-sm">Aún no has añadido productos.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Usa el botón "Añadir productos" para seleccionarlos del catálogo.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {productosSeleccionados.map(producto => {
                    const busqueda = busquedaPreguntas[producto.id_product] || '';
                    const preguntasFiltradas = listaPreguntas.filter(p =>
                      p.question?.toLowerCase().includes(busqueda.toLowerCase())
                    );
                    const cantidadSel = producto.preguntas.length;

                    return (
                      <div key={producto.id_product} className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                        <div className="bg-muted/50 p-4 flex justify-between items-center gap-3 border-b border-border">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                              {producto.vc_image ? (
                                <img
                                  src={producto.vc_image}
                                  alt={producto.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <ImageOff size={18} className="text-muted-foreground/70" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground truncate" title={producto.name}>{producto.name}</h3>
                              <p className="text-xs text-muted-foreground">{cantidadSel} pregunta{cantidadSel !== 1 ? 's' : ''} seleccionada{cantidadSel !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                            aria-label={`Quitar ${producto.name}`}
                            onClick={() => toggleProducto(producto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="p-4">
                          {/* Buscador de preguntas */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={16} />
                            <input
                              type="text"
                              placeholder="Buscar preguntas..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                              value={busqueda}
                              onChange={(e) => setBusquedaPreguntas(prev => ({ ...prev, [producto.id_product]: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                            {listaPreguntas.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">No hay preguntas disponibles para este cliente.</p>
                            ) : preguntasFiltradas.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">No se encontraron preguntas con "{busqueda}"</p>
                            ) : (
                              preguntasFiltradas.map(pregunta => {
                                const seleccionada = producto.preguntas.some(q => q.id_pregunta === pregunta.id_question);
                                return (
                                  <div
                                    key={pregunta.id_question}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors border ${
                                      seleccionada
                                        ? 'bg-success/10 border-success/30'
                                        : 'hover:bg-accent border-transparent hover:border-border'
                                    }`}
                                  >
                                    <div className="shrink-0">
                                      <Checkbox
                                        checked={seleccionada}
                                        onCheckedChange={() => togglePregunta(producto.id_product, pregunta)}
                                        className="border-input data-[state=checked]:bg-success data-[state=checked]:border-success"
                                      />
                                    </div>
                                    <span className={`text-sm font-medium flex-1 select-none ${seleccionada ? 'text-success' : 'text-foreground'}`}>
                                      {pregunta.question}
                                    </span>
                                    {Number(pregunta.f_cost ?? 0) === 0 ? (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 text-success shrink-0">Gratis</span>
                                    ) : (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 tabular-nums">
                                        +${Number(pregunta.f_cost).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de productos (paginado + búsqueda) */}
      {selectedClientId && (
        <ProductoPickerModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          clientId={selectedClientId}
          selectedIds={productosSeleccionados.map(p => p.id_product)}
          onToggle={toggleProducto}
        />
      )}
    </div>
  );
};
