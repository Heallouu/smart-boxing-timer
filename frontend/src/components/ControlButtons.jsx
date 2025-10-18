// frontend/src/components/ControlButtons.jsx
import React from "react";

function IconPlay(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <path d="M8 5l12 7-12 7V5z" />
    </svg>
  );
}
function IconPause(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <path d="M10 5h-2v14h2V5zm8 0h-2v14h2V5z" />
    </svg>
  );
}
function IconStop(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
function IconRefresh(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <path
        d="M20 11a8 8 0 10-1.78 5.03M20 11V6m0 5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSkip(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <path
        d="M5 5v14M7 7l7 5-7 5V7m9 0l7 5-7 5V7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ControlButtons({
  onStart,
  onPause,
  onStop,
  onRegenerate,
  onSkip,
  running,
  canSkip = true,
}) {
  const toggle = () => (running ? onPause?.() : onStart?.());

  const base =
    "inline-flex items-center justify-center rounded-2xl aspect-square w-full " + // carrés et prennent la largeur de la colonne
    "bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/15 " +
    "transition hover:-translate-y-0.5 active:translate-y-0 " +
    "text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

  const accentRun =
    "ring-1 ring-emerald-300/30 hover:ring-emerald-300/50 shadow-[0_6px_14px_rgba(16,185,129,0.18)]";
  const accentPause =
    "ring-1 ring-amber-300/30  hover:ring-amber-300/50  shadow-[0_6px_14px_rgba(251,191,36,0.18)]";
  const accentStop =
    "ring-1 ring-rose-300/30    hover:ring-rose-300/50    shadow-[0_6px_14px_rgba(244,63,94,0.18)]";
  const accentSkip =
    "ring-1 ring-violet-300/30  hover:ring-violet-300/50  shadow-[0_6px_14px_rgba(167,139,250,0.18)]";
  const accentRegen =
    "ring-1 ring-sky-300/30     hover:ring-sky-300/50     shadow-[0_6px_14px_rgba(56,189,248,0.18)]";

  return (
    // Grille 4 colonnes -> toujours sur une ligne (mobile inclus)
    <div className="grid grid-cols-4 gap-2">
      {/* Toggle Play/Pause */}
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? "Pause" : "Démarrer"}
        className={`${base} ${running ? accentPause : accentRun}`}
        title={running ? "Mettre en pause" : "Démarrer"}
      >
        {running ? <IconPause /> : <IconPlay />}
      </button>

      {/* Stop */}
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop"
        className={`${base} ${accentStop}`}
        title="Arrêter et remettre à zéro"
      >
        <IconStop />
      </button>

      {/* Skip */}
      <button
        type="button"
        onClick={canSkip ? onSkip : undefined}
        aria-label="Passer au segment suivant"
        disabled={!canSkip}
        aria-disabled={!canSkip}
        className={[
          base,
          accentSkip,
          !canSkip
            ? "opacity-50 cursor-not-allowed hover:translate-y-0 ring-0 shadow-none"
            : "",
        ].join(" ")}
        title={
          canSkip ? "Passer à la phase suivante" : "Dernière phase atteinte"
        }
      >
        <IconSkip />
      </button>

      {/* Régénérer */}
      <button
        type="button"
        onClick={!running ? onRegenerate : undefined}
        aria-label="Régénérer la séance"
        disabled={running}
        aria-disabled={running}
        title={
          running
            ? "Désactivé pendant la lecture"
            : "Générer une nouvelle séance aléatoire"
        }
        className={[
          base,
          accentRegen,
          running
            ? "opacity-50 cursor-not-allowed hover:translate-y-0 ring-0 shadow-none"
            : "",
        ].join(" ")}
      >
        <IconRefresh />
      </button>
    </div>
  );
}
