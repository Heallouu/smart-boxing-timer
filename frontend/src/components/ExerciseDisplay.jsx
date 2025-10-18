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

  // Libellé affiché (ex: "Échauffement", "Round 1", "Repos", "Étirements")
  const label = segment?.label ?? "—";

  // Nom “phase” à afficher à droite (coloré)
  const phaseName =
    phase === "warmup"
      ? "Échauffement"
      : phase === "work"
      ? "Travail"
      : phase === "rest"
      ? "Repos"
      : phase === "stretch"
      ? "Étirements"
      : "";

  // Évite la redondance : si label == phaseName, on n'affiche pas la seconde partie.
  const showPhaseName = phaseName && phaseName !== label;

  return (
    <div className="space-y-3">
      {/* En-tête sur une ligne : libellé + phase colorée */}
      <div className="flex items-baseline justify-center gap-2 text-xs uppercase tracking-wider opacity-70">
        <span className="text-center">{label}</span>
        {showPhaseName && (
          <span className={`text-center ${phaseClass}`}>· {phaseName}</span>
        )}
      </div>

      {/* Consigne actuelle */}
      <div className="text-2xl md:text-3xl font-semibold text-center">
        {step?.instruction ?? "—"}
      </div>
    </div>
  );
}
