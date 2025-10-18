// frontend/src/components/ExerciseDisplay.jsx
import React, { useMemo } from "react";

export default function ExerciseDisplay({ segment, stepIndex = 0 }) {
  const step = useMemo(
    () => segment?.steps?.[stepIndex] ?? null,
    [segment, stepIndex]
  );

  const phase = segment?.phase ?? "idle";
  const phaseClass =
    phase === "warmup"
      ? "text-warmup"
      : phase === "work"
      ? "text-work"
      : phase === "rest" || phase === "stretch"
      ? "text-rest"
      : "text-idle";

  return (
    <div className="space-y-3">
      {/* Libellé de la phase */}
      <div className="text-2xl text-center text-xs uppercase tracking-wider opacity-70">
        {segment?.label ?? "—"}
      </div>
      {/* Phase actuelle en couleur (optionnel) */}
      <div className={`text-center text-sm opacity-80 ${phaseClass}`}>
        {phase === "warmup"
          ? ""
          : phase === "work"
          ? "Travail"
          : phase === "rest"
          ? ""
          : phase === "stretch"
          ? "Étirements"
          : "Idle"}
      </div>

      {/* Consigne actuelle */}
      <div className="text-2xl md:text-3xl font-semibold text-center">
        {step?.instruction ?? "—"}
      </div>
    </div>
  );
}
