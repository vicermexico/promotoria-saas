import { Revelar } from "./Revelar";

// Título de sección con el filete de marca debajo; entra con Revelar.
export function Titulo({ children, oscuro = false }: { children: string; oscuro?: boolean }) {
  return (
    <div className="mb-10 text-center">
      <Revelar>
        <h2
          className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${
            oscuro ? "text-white" : "text-foreground"
          }`}
        >
          {children}
        </h2>
      </Revelar>
      <Revelar retraso={150}>
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-brand" />
      </Revelar>
    </div>
  );
}
