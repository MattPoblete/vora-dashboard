"use client";

import {
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import Stepper from "@/components/Stepper";
import { pasarAEmpaquetar } from "./actions";

const PASOS = 4;

// The Stepper has its own dark/light themes; feed it the app tokens instead so it follows the palette and the theme.
const TEMA = {
  "--stepper-tile": "var(--surface)",
  "--stepper-tile-edge": "var(--border)",
  "--stepper-tile-highlight":
    "color-mix(in srgb, var(--text) 10%, transparent)",
  "--stepper-tile-shadow": "0 4px 10px -5px rgb(0 0 0 / 0.3)",
  "--stepper-well": "var(--surface-2)",
  "--stepper-track": "var(--border)",
  "--stepper-ink": "var(--text)",
  "--stepper-muted": "var(--text-muted)",
  "--stepper-faint": "var(--border)",
  "--stepper-ring": "var(--text-muted)",
  "--stepper-solid": "var(--primary)",
  "--stepper-solid-ink": "var(--on-primary)",
  "--stepper-hover-fill": "color-mix(in srgb, var(--text) 6%, transparent)",
} as CSSProperties;

// The stepper only drives navigation. The last "Complete" button is the real "pasar a por empaquetar": the server
// action re-checks everything, and `completo` just keeps the button disabled until nothing is missing.
export function PasosCentral({
  cliente,
  inicial,
  completo,
  children,
}: {
  cliente: number;
  inicial: number;
  completo: boolean;
  children: ReactNode;
}) {
  const [paso, setPaso] = useState(inicial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <Stepper
        step={paso}
        onStepChange={(n) => {
          setPaso(n);
          setError("");
        }}
        onFinalStepCompleted={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("cliente", String(cliente));
            const r = await pasarAEmpaquetar({}, fd);
            if (r.error) setError(r.error);
          })
        }
        width="100%"
        frame={false}
        style={TEMA}
        backButtonText="Atrás"
        nextButtonText="Siguiente"
        completeButtonText="Pasar a por empaquetar"
        nextButtonProps={{ disabled: pending || (paso === PASOS && !completo) }}
      >
        {children}
      </Stepper>
      {error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}
    </>
  );
}
