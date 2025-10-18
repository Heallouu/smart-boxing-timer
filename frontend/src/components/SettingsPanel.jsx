import React, { useEffect, useRef, useState } from "react";

export default function SettingsPanel({ open, onClose, speech, sounds }) {
  const panelRef = useRef(null);

  // ------- SONS (inchangé) -------
  const defaultSelection = {
    start: "ufc-bell",
    ten: "ufc-10s",
    end: "ufc-bell",
  };
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem("soundSelection") || "null");
    } catch {
      return null;
    }
  })();
  const initialSelected = sounds?.selected || stored || defaultSelection;

  const fallbackOptions = [
    "ufc-bell",
    "ufc-10s",
    "ufc-end",
    "beep-A",
    "beep-B",
    "beep-C",
  ];
  const soundOptions =
    Array.isArray(sounds?.options) && sounds.options.length >= 3
      ? sounds.options
      : fallbackOptions;

  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    if (sounds?.selected) setSelected(sounds.selected);
  }, [sounds?.selected]);
  useEffect(() => {
    localStorage.setItem("soundSelection", JSON.stringify(selected));
    sounds?.setSelected?.(selected);
  }, [selected, sounds]);

  useEffect(() => {
    if (open) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      setTimeout(() => panelRef.current?.focus(), 0);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const playEvent = async (eventKey) => {
    try {
      sounds?.stopAll?.();
      if (typeof sounds?.play === "function") {
        await sounds.play(eventKey);
        return;
      }
      const clipKey = selected[eventKey];
      if (typeof sounds?.playClip === "function") {
        await sounds.playClip(clipKey);
        return;
      }
    } catch {}
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
    } catch {}
  };

  // ------- VOIX / LANG & sliders -------
  const isNative = !!speech?.isNative;
  const voices = speech?.voices || [];
  const enabled = !!speech?.enabled;
  const voiceURI = speech?.voiceURI || "";
  const lang = speech?.lang || "fr-FR";

  const rate = speech?.rate ?? 1.0;
  const pitch = speech?.pitch ?? 1.0;
  const volume = speech?.volume ?? 1.0;

  const langOptions = [
    "fr-FR",
    "fr-CA",
    "en-US",
    "en-GB",
    "es-ES",
    "de-DE",
    "it-IT",
  ];

  return (
    <div
      aria-hidden={!open}
      className={[
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 transition-opacity",
          open ? "bg-black/40 opacity-100" : "bg-black/40 opacity-0",
        ].join(" ")}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={[
          "absolute right-0 top-0 h-full w-full sm:w-auto",
          "sm:max-w-[fit-content] sm:max-w-[min(92vw,520px)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          "bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl",
          "border-l border-white/15 shadow-2xl",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Paramètres</h2>
            <p className="text-xs opacity-70">Voix & sons du minuteur</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Fermer les paramètres"
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

        <div className="p-5 space-y-8 overflow-y-auto h-[calc(100%-64px)]">
          {/* TTS */}
          <section className="space-y-4">
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

            {!isNative ? (
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs opacity-70">Voix (navigateur)</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    value={voiceURI}
                    onChange={(e) => speech?.setVoiceURI?.(e.target.value)}
                    disabled={!enabled}
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
                    onClick={() =>
                      speech?.speak?.("Test de la voix.", () => {})
                    }
                    className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition disabled:opacity-50"
                  >
                    Tester
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-xs opacity-70">
                    Langue (TTS natif)
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      value={lang}
                      onChange={(e) => speech?.setLang?.(e.target.value)}
                      disabled={!enabled}
                    >
                      {langOptions.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={() =>
                        speech?.speak?.("Test de la voix native.", () => {})
                      }
                      className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 transition disabled:opacity-50"
                    >
                      Tester
                    </button>
                  </div>
                  <p className="text-[11px] opacity-60">
                    Pour une voix plus naturelle : Paramètres Android → Langue
                    et saisie → <em>Synthèse vocale</em> → Moteur Google + voix
                    française <em>Haute qualité</em>.
                  </p>
                </div>

                {/* Sliders */}
                <div className="grid gap-3">
                  <label className="text-xs opacity-70">
                    Vitesse (0.5–2.0) :{" "}
                    <span className="opacity-100 font-medium">
                      {rate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    value={rate}
                    onChange={(e) =>
                      speech?.setRate?.(parseFloat(e.target.value))
                    }
                  />
                  <label className="text-xs opacity-70">
                    Pitch (0.5–2.0) :{" "}
                    <span className="opacity-100 font-medium">
                      {pitch.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    value={pitch}
                    onChange={(e) =>
                      speech?.setPitch?.(parseFloat(e.target.value))
                    }
                  />
                  <label className="text-xs opacity-70">
                    Volume (0–1) :{" "}
                    <span className="opacity-100 font-medium">
                      {volume.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) =>
                      speech?.setVolume?.(parseFloat(e.target.value))
                    }
                  />
                </div>
              </>
            )}
          </section>

          {/* Sounds (inchangé) */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium opacity-80">Sons</h3>
            <p className="text-xs opacity-70">
              Choisis les sons et teste-les (pas de chevauchement).
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
              >
                Tester
              </button>
            </div>

            {/* TEN */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs opacity-70 mb-1">Rappel -10 s</label>
                <select
                  className="rounded-xl px-3 py-2 bg-white/10 dark:bg-slate-800/60 border border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  value={selected.ten}
                  onChange={(e) =>
                    setSelected((s) => ({ ...s, ten: e.target.value }))
                  }
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
              >
                Tester
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
