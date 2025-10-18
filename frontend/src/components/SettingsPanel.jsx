// frontend/src/components/SettingsPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SettingsPanel({ open, onClose, speech, sounds }) {
  const panelRef = useRef(null);

  // ------- Sélection sons -------
  const DEFAULT_SELECTION = {
    start: "ufc-bell",
    ten: "ufc-10s",
    end: "ufc-end",
  };
  const FALLBACK_OPTIONS = [
    "ufc-bell",
    "ufc-10s",
    "ufc-end",
    "beep-A",
    "beep-B",
    "beep-C",
  ];

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem("soundSelection") || "null");
    } catch {
      return null;
    }
  })();

  const [selected, setSelected] = useState(
    stored || sounds?.selected || DEFAULT_SELECTION
  );

  // égalité superficielle
  const eqSel = (a, b) =>
    a && b && a.start === b.start && a.ten === b.ten && a.end === b.end;

  // si le hook met à jour depuis ailleurs → ne sync que si différent
  useEffect(() => {
    if (!sounds?.selected) return;
    if (!eqSel(sounds.selected, selected)) {
      setSelected(sounds.selected);
    }
  }, [sounds?.selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // persiste + notifie le hook
  useEffect(() => {
    localStorage.setItem("soundSelection", JSON.stringify(selected));
    sounds?.setSelected?.(selected);
  }, [selected, sounds]);

  // options sons stables
  const soundOptions = useMemo(() => {
    const opts = Array.isArray(sounds?.options)
      ? sounds.options.filter(Boolean)
      : [];
    return opts.length >= 3 ? opts : FALLBACK_OPTIONS;
  }, [sounds?.options]);

  // ------- Bloque scroll + ESC -------
  useEffect(() => {
    if (open) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  const initialFocusDone = useRef(false);
  useEffect(() => {
    if (open && !initialFocusDone.current) {
      initialFocusDone.current = true;
      setTimeout(() => panelRef.current?.focus(), 0);
    }
    if (!open) initialFocusDone.current = false;
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // évite que l’overlay capte le mousedown des <select>
  const stopMouseDown = (e) => e.stopPropagation();

  // ------- TEST SONS -------
  const playEvent = async (eventKey) => {
    try {
      sounds?.stopAll?.();
      if (typeof sounds?.play === "function")
        return await sounds.play(eventKey);
      const clipKey = selected[eventKey];
      if (typeof sounds?.playClip === "function")
        return await sounds.playClip(clipKey);
    } catch {
      /* no-op */
    }
  };

  const handleTestSounds = async () => {
    try {
      if (typeof sounds?.testAll === "function") return sounds.testAll();
      if (typeof sounds?.playSequence === "function")
        return sounds.playSequence(["start", "ten", "end"]);
      await playEvent("start");
      await new Promise((r) => setTimeout(r, 400));
      await playEvent("ten");
      await new Promise((r) => setTimeout(r, 400));
      await playEvent("end");
    } catch {
      /* no-op */
    }
  };

  // ------- VOIX -------
  const voices = speech?.voices || [];
  const enabled = !!speech?.enabled;
  const voiceURI = speech?.voiceURI || "";

  return (
    <div
      aria-hidden={!open}
      className={[
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      {/* Overlay */}
      <div
        onMouseDown={onClose}
        className={[
          "absolute inset-0 z-40 transition-opacity",
          open ? "bg-black/40 opacity-100" : "bg-black/40 opacity-0",
        ].join(" ")}
      />

      {/* Panneau latéral */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onMouseDown={stopMouseDown}
        className={[
          "absolute right-0 top-0 z-50 h-full w-full sm:w-auto",
          "sm:max-w-[min(92vw,520px)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          "bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl",
          "border-l border-white/15 shadow-2xl",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Paramètres</h2>
            <p className="text-xs opacity-70">Voix & sons du minuteur</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Fermer les paramètres"
            title="Fermer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="p-5 space-y-8 overflow-y-auto h-[calc(100%-64px)]">
          {/* Synthèse vocale */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium opacity-80">Synthèse vocale</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="accent-emerald-500 h-4 w-4"
                checked={enabled}
                onChange={(e) => speech?.setEnabled?.(e.target.checked)}
              />
              <span className="text-sm">Activer les annonces vocales</span>
            </label>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs opacity-70">Voix</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  value={voiceURI}
                  onChange={(e) => speech?.setVoiceURI?.(e.target.value)}
                  disabled={!enabled}
                  onMouseDown={stopMouseDown}
                >
                  {voices.length === 0 && (
                    <option value="">(Aucune voix détectée)</option>
                  )}
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => speech?.speak?.("Test de la voix.", () => {})}
                  className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition disabled:opacity-50"
                  title="Tester la voix"
                >
                  Tester
                </button>
              </div>
            </div>
          </section>

          {/* Sons */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium opacity-80">Sons</h3>
            <p className="text-xs opacity-70">
              Choisis les sons pour chaque évènement et teste-les (sans
              chevauchement).
            </p>

            {/* START */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs opacity-70 mb-1">
                  Départ de round
                </label>
                <select
                  className="rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  value={selected.start}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, start: e.target.value }))
                  }
                  onMouseDown={stopMouseDown}
                >
                  {soundOptions.map((opt) => (
                    <option key={`start-${opt}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => playEvent("start")}
                className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                title="Tester le son de départ"
              >
                Tester
              </button>
            </div>

            {/* TEN */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs opacity-70 mb-1">
                  Rappel -10&nbsp;secondes
                </label>
                <select
                  className="rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  value={selected.ten}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, ten: e.target.value }))
                  }
                  onMouseDown={stopMouseDown}
                >
                  {soundOptions.map((opt) => (
                    <option key={`ten-${opt}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => playEvent("ten")}
                className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                title="Tester le bip -10s"
              >
                Tester
              </button>
            </div>

            {/* END */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs opacity-70 mb-1">Fin de round</label>
                <select
                  className="rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  value={selected.end}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, end: e.target.value }))
                  }
                  onMouseDown={stopMouseDown}
                >
                  {soundOptions.map((opt) => (
                    <option key={`end-${opt}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => playEvent("end")}
                className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                title="Tester le son de fin"
              >
                Tester
              </button>
            </div>

            {/* <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestSounds}
                className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                title="Tester les sons en séquence (départ → -10s → fin)"
              >
                Tester la séquence
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("soundSelection");
                  const def = DEFAULT_SELECTION;
                  setSelected(def);
                  sounds?.setSelected?.(def);
                }}
                className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                title="Réinitialiser les sons"
              >
                Réinitialiser
              </button>

              {sounds?.stopAll && (
                <button
                  type="button"
                  onClick={() => sounds.stopAll()}
                  className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition"
                  title="Arrêter tous les sons"
                >
                  Stop sons
                </button>
              )}
            </div> */}
          </section>
        </div>
      </aside>
    </div>
  );
}
