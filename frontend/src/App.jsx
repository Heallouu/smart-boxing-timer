// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import ProgramSelector from "./components/ProgramSelector.jsx";
import TimerCircle from "./components/TimerCircle.jsx";
import ControlButtons from "./components/ControlButtons.jsx";
import ExerciseDisplay from "./components/ExerciseDisplay.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import { fetchSession } from "./utils/api.js";
import { useSpeech } from "./hooks/useSpeech.js";
import { useAudioQueue } from "./hooks/useAudioQueue.js";
import { useTimer } from "./hooks/useTimer.js";

export default function App() {
  // --- State racine
  const [level, setLevel] = useState(null);
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [openSettings, setOpenSettings] = useState(false);

  // Thème
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Hooks audio/voix/timer
  const speech = useSpeech();
  const sounds = useAudioQueue();
  const timer = useTimer({ session, speech, sounds });

  // Chargement de session selon le niveau
  async function loadSession(lvl) {
    const data = await fetchSession(lvl);
    setSession(data);
  }
  function handleSelect(lvl) {
    setLevel(lvl);
    loadSession(lvl);
  }
  function regenerate() {
    if (level) loadSession(level);
  }

  // --- Données dérivées
  const seg = useMemo(
    () => session?.segments?.[timer.segmentIndex] ?? null,
    [session, timer.segmentIndex]
  );
  const step = useMemo(
    () => seg?.steps?.[timer.stepIndex] ?? null,
    [seg, timer.stepIndex]
  );

  // Timings protégés
  const stepTotal = step?.duration || 30;
  const stepRemaining = timer.remaining || stepTotal;

  const segTotal = seg?.total || stepTotal;
  const elapsedStep = stepTotal - stepRemaining;
  const elapsedBefore =
    seg?.steps?.slice(0, timer.stepIndex).reduce((a, s) => a + s.duration, 0) ||
    0;
  const segElapsed = Math.max(
    0,
    Math.min(segTotal, elapsedBefore + elapsedStep)
  );
  const segRemaining = Math.max(0, segTotal - segElapsed);

  // Anneau intérieur : toujours la durée du step courant
  const innerTotal = stepTotal;
  const innerRemaining = stepRemaining;

  // “À suivre”
  const nextInfo = useMemo(() => {
    if (!session) return null;
    const segments = session.segments || [];
    const i = timer.segmentIndex ?? 0;
    const j = timer.stepIndex ?? 0;

    // Step suivant dans le segment courant
    if (segments[i]?.steps && j + 1 < segments[i].steps.length) {
      return {
        text: segments[i].steps[j + 1].instruction,
        phase: segments[i].phase,
        label: segments[i].label,
      };
    }
    // Premier step d’un segment suivant
    for (let k = i + 1; k < segments.length; k++) {
      const nseg = segments[k];
      if (nseg?.steps?.length) {
        return {
          text: nseg.steps[0].instruction,
          phase: nseg.phase,
          label: nseg.label,
        };
      }
    }
    return { text: "Fin de séance", phase: "idle", label: "Terminé" };
  }, [session, timer.segmentIndex, timer.stepIndex]);

  const nextColorClass =
    nextInfo?.phase === "warmup"
      ? "text-warmup"
      : nextInfo?.phase === "work"
      ? "text-work"
      : nextInfo?.phase === "rest" || nextInfo?.phase === "stretch"
      ? "text-rest"
      : "text-idle";

  // --- Rendu
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition">
      {!level ? (
        // Sélecteur plein écran parfaitement centré
        <div
          className="fixed inset-0 grid place-items-center overflow-hidden
                     
                     dark:from-slate-900 dark:to-slate-800"
        >
          <ProgramSelector onSelect={handleSelect} />
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Smart Boxing Timer</span>
              <span className="opacity-70 text-sm">({level})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn glass"
                onClick={() => setOpenSettings(true)}
                aria-label="Ouvrir les paramètres"
                title="Paramètres"
              >
                ⚙️
              </button>
            </div>
          </header>

          <main className="px-4 pb-10">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              {/* Colonne gauche : Timer + contrôles */}
              <div className="glass p-6 rounded-3xl">
                <TimerCircle
                  total={innerTotal}
                  remaining={innerRemaining}
                  phase={timer.phase}
                  outerTotal={segTotal}
                  outerRemaining={segRemaining}
                />

                <div className="mt-4 text-center text-sm opacity-80">
                  {timer.phase === "work"
                    ? `Round ${timer.round} / ${session?.rounds}`
                    : seg?.label || "—"}
                </div>

                <div className="mt-4">
                  <ControlButtons
                    onStart={timer.start}
                    onPause={timer.pause}
                    onStop={timer.stop}
                    onRegenerate={regenerate}
                    onSkip={timer.skip}
                    running={timer.running}
                    canSkip={
                      !!session &&
                      timer.segmentIndex < (session.segments?.length ?? 0) - 1
                    }
                  />
                </div>
              </div>

              {/* Colonne droite : Consignes */}
              <div className="glass p-6 rounded-3xl glass-center">
                <ExerciseDisplay segment={seg} stepIndex={timer.stepIndex} />
                <div className="mt-3 text-center text-sm opacity-80">
                  À suivre :{" "}
                  <span className={`${nextColorClass} font-medium`}>
                    {nextInfo?.text ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      <SettingsPanel
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        speech={speech}
        sounds={sounds}
      />
    </div>
  );
}
