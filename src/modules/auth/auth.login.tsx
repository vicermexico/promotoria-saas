import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, ArrowLeft, ScanBarcode, PackageCheck, Route as RouteIcon, Truck } from "lucide-react"


import { useAccesoLogin } from "./useAccesoLogin"
import { checkAdminPhoneExists } from "@/Fetch/login"
import { checkDriverPhoneExists } from "@/Fetch/driverPanel"
import { getLoginVideo, getWhatsappSoportePromotores } from "@/Fetch/appConfig"
import { Button, Input } from "@/components"
import logoMark from "@/assets/isologo_promotoria_N.png"

const CAPABILITIES = [
  { icon: ScanBarcode, title: "Conteo en anaquel", label: "El promotor cuenta lo que hay en la tienda, en el momento." },
  { icon: PackageCheck, title: "Prepedidos y stock", label: "Levanta lo que falta y controla cuánto tienes de cada producto." },
  { icon: RouteIcon, title: "Logística y rutas", label: "Arma la ruta de entrega con datos reales, no con suposiciones." },
  { icon: Truck, title: "Choferes en campo", label: "Cada entrega, cobro y ticket, registrado desde el celular." },
];

const INFO_WHATSAPP_FALLBACK = "5218117105018";

export function Login() {
  const navigate = useNavigate();
  const { acceder, loading } = useAccesoLogin();
  const [step, setStep] = useState<"phone" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState(INFO_WHATSAPP_FALLBACK);

  useEffect(() => {
    getLoginVideo()
      .then((res) => setVideoUrl(res.data.url))
      .catch(() => setVideoUrl(null));
    getWhatsappSoportePromotores()
      .then((res) => { if (res.data.value) setSupportWhatsapp(res.data.value); })
      .catch(() => {});
  }, []);

  const handleContinue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = phone.trim();
    if (!value || checkingPhone) return;
    setCheckingPhone(true);
    try {
      // Igual que ya funciona para promotores en la app: primero se checa si
      // el celular ya esta registrado (como cliente/master o como chofer)
      // antes de pedir la contraseña.
      const [isAdmin, isDriver] = await Promise.all([
        checkAdminPhoneExists(value),
        checkDriverPhoneExists(value),
      ]);
      if (isAdmin || isDriver) {
        setStep("password");
      } else {
        const message = encodeURIComponent(
          `Hola, soy dueño de una empresa y quiero información sobre Promotoria. Mi celular es ${value}.`
        );
        window.open(`https://wa.me/${supportWhatsapp}?text=${message}`, "_blank");
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo verificar el celular, intenta de nuevo");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await acceder(phone, password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel de marca — azul marino de siempre, con video de fondo en movimiento y tarjetas flotantes por cada parte del sistema */}
      <div className="hidden lg:flex lg:w-[48%] min-h-screen relative flex-col justify-between p-12 overflow-hidden bg-sidebar">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : (
          <RouteBackdrop />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/50" aria-hidden />

        <div className="relative z-10">
          <img
            src="/promotorialogotipo_principalblanco.png"
            alt="Promotoria"
            className="h-10 object-contain"
          />
        </div>

        <div className="relative z-10 space-y-7">
          <h2 className="font-display text-4xl xl:text-[3.2rem] font-bold leading-[1.05] tracking-tight text-white max-w-md">
            ¿Eres dueño de una empresa? Entra aquí.
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {CAPABILITIES.map(({ icon: Icon, title, label }) => (
              <div
                key={title}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-brand/20 mb-3">
                  <Icon className="w-4 h-4 text-brand" strokeWidth={2.25} />
                </span>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-xs text-sidebar-foreground leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/50">
          © 2025 Promotoria — Plataforma de promotoría
        </p>
      </div>

      {/* Formulario */}
      <div className="w-full lg:w-[52%] flex items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Marca compacta (visible cuando no hay panel) */}
          <img
            src={logoMark}
            alt="Promotoria"
            className="h-12 object-contain mb-8 lg:hidden"
          />

          <div className="mb-9">
            <span className="hidden lg:block h-[3px] w-7 rounded-full bg-brand mb-4" aria-hidden />
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {step === "phone"
                ? "Empresa, promotor o chofer — entra con tu celular."
                : "Ya casi — solo falta tu contraseña."}
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Celular
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Tu número a 10 dígitos"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  autoFocus
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={checkingPhone || !phone}
              >
                {checkingPhone && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep("phone"); setPassword(""); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground -mt-2 mb-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {phone}
              </button>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !password}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/restore-pwd")}
                  className="text-foreground font-medium hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-xs text-muted-foreground mt-10">
            Al iniciar sesión, aceptas nuestros{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
              Términos de Servicio
            </a>{" "}
            y{" "}
            <a href="/aviso-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ilustracion de fondo del panel de marca: una ruta de entrega trazada entre
 * paradas, en vez del patron de puntos generico de antes. Es el mismo
 * concepto central de Logistica, no una textura decorativa cualquiera.
 */
function RouteBackdrop() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.16] pointer-events-none"
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path
        d="M -40 120 C 120 60, 180 220, 340 180 S 560 60, 640 200 C 520 340, 460 420, 300 400 S 40 520, 120 660 C 260 760, 420 700, 500 820 S 560 980, 700 940"
        fill="none"
        stroke="var(--sidebar-primary)"
        strokeWidth="2.5"
        strokeDasharray="1 14"
        strokeLinecap="round"
      />
      {[
        [-40, 120],
        [340, 180],
        [300, 400],
        [120, 660],
        [500, 820],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="var(--sidebar-primary)" />
      ))}
    </svg>
  );
}
