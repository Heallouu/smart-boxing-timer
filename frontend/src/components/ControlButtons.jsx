// frontend/src/components/ControlButtons.jsx
import React from "react";

function IconPlay(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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
      width="20"
      height="20"
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
      width="20"
      height="20"
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
      width="20"
      height="20"
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
      width="20"
      height="20"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      {...props}
    >
      <path
        d="M5 5v14M7 7l7 5-7 5V7m9-0l7 5-7 5V7"
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
    "inline-flex items-center gap-2 px-5 py-3 rounded-2xl " +
    "bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/15 " +
    "transition will-change-transform hover:-translate-y-0.5 active:translate-y-0 " +
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
    <div className="grid gap-3">
      {/* Rangée 1 : Toggle + Stop + Skip */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? "Pause" : "Démarrer"}
          className={`${base} ${running ? accentPause : accentRun}`}
          title={running ? "Mettre en pause" : "Démarrer"}
        >
          {running ? <IconPause /> : <IconPlay />}
          <span className="font-medium">{running ? "Pause" : "Démarrer"}</span>
        </button>

        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className={`${base} ${accentStop}`}
          title="Arrêter et remettre à zéro"
        >
          <IconStop />
          <span className="font-medium">Stop</span>
        </button>

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
              ? "opacity-50 cursor-not-allowed ring-0 shadow-none hover:translate-y-0"
              : "",
          ].join(" ")}
          title={
            canSkip ? "Passer à la phase suivante" : "Dernière phase atteinte"
          }
        >
          <IconSkip />
          <span className="font-medium">Skip</span>
        </button>
      </div>

      {/* Rangée 2 : Régénérer (toujours en dessous) */}
      <div className="flex justify-center">
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
              ? "opacity-50 cursor-not-allowed ring-0 shadow-none hover:translate-y-0"
              : "",
          ].join(" ")}
        >
          <IconRefresh />
          <span className="font-medium">
            {running ? "Régénérer" : "Régénérer"}
          </span>
        </button>
      </div>
    </div>
  );
}
