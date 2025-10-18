// frontend/src/hooks/useTimer.js
import { useEffect, useRef, useState } from "react";

/**
 * useTimer({ session, speech, sounds })
 * - session.segments: [{ phase:'warmup'|'work'|'rest'|'stretch', label, round?, total, steps:[{instruction, duration}], tenSecWarning? }, ...]
 * - speech: { enabled, speak(text, onEnd), cancel() }
 * - sounds: { play(eventKey: 'start'|'ten'|'end'), stopAll() }
 *
 * Contrat audio:
 *  1) À chaque (nouveau) step:
 *     - si ce step n'a pas encore été annoncé => TTS: "Round X / label. Consigne"
 *     - au onEnd TTS => (si phase 'work' ET stepIndex === 0) jouer 'start' ET démarrer le timer exactement en même temps
 *  2) -10s => biper seulement si phase 'work' ET dernier step du round
 *  3) Fin du round 'work' => jouer 'end'
 */

export function useTimer({ session, speech, sounds }) {
  // Indexes + état
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  // Infos d’affichage
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(null);

  // Réfs pour éviter stale closures dans setInterval
  const segRef = useRef(0);
  const stepRef = useRef(0);
  const runningRef = useRef(false);
  const remainingRef = useRef(0);

  // Annonce déjà faite pour le step courant ?
  const announcedRef = useRef(false);
  // -10s bip déjà fait pour ce step ?
  const warnedTenRef = useRef(false);

  // Interval tick
  const tickRef = useRef(null);

  // Utilitaires --------------------------------------------------------------

  function clearTick() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    runningRef.current = false;
    setRunning(false);
  }

  function currentSeg() {
    return session?.segments?.[segRef.current] || null;
  }

  function currentStep() {
    const seg = currentSeg();
    if (!seg) return null;
    return seg.steps?.[stepRef.current] || null;
  }

  function isLastStepInSegment() {
    const seg = currentSeg();
    if (!seg) return true;
    return stepRef.current >= (seg.steps?.length || 1) - 1;
  }

  function goto(segIdx, stpIdx, { autoAnnounce = true } = {}) {
    clearTick();
    segRef.current = segIdx;
    stepRef.current = stpIdx;
    setSegmentIndex(segIdx);
    setStepIndex(stpIdx);

    const seg = session?.segments?.[segIdx];
    if (!seg) {
      // fin de séance
      setPhase("idle");
      setRound(null);
      setRemaining(0);
      remainingRef.current = 0;
      announcedRef.current = false;
      warnedTenRef.current = false;
      return;
    }

    setPhase(seg.phase);
    setRound(seg.round || null);

    const stp = seg.steps?.[stpIdx];
    const dur = stp?.duration || 0;
    setRemaining(dur);
    remainingRef.current = dur;

    announcedRef.current = false;
    warnedTenRef.current = false;

    if (autoAnnounce) {
      // on ne démarre pas tout de suite — on annonce d'abord
      announceThenMaybeStart();
    }
  }

  function nextStepOrSegment({
    autoAnnounce = true,
    waitEndSound = true,
  } = {}) {
    const seg = currentSeg();
    if (!seg) return;

    if (!isLastStepInSegment()) {
      // Step suivant dans le même segment
      goto(segRef.current, stepRef.current + 1, { autoAnnounce });
      return;
    }

    // Fin de segment
    const nextSegIdx = segRef.current + 1;

    // 👉 Si c’était un round de travail, on joue d’abord le son de fin
    if (seg.phase === "work" && waitEndSound) {
      (async () => {
        try {
          await sounds?.play?.("end");
        } catch {}
        // Ensuite seulement on annonce la phase suivante (repos, etc.)
        goto(nextSegIdx, 0, { autoAnnounce });
      })();
    } else {
      // Pas un round de travail → on enchaîne directement
      goto(nextSegIdx, 0, { autoAnnounce });
    }
  }

  function startTick() {
    if (tickRef.current) return; // déjà en cours
    setRunning(true);
    runningRef.current = true;

    tickRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        remainingRef.current = next;

        const seg = currentSeg();
        // -10s : uniquement si 'work' ET dernier step du round
        if (
          seg?.phase === "work" &&
          seg?.tenSecWarning &&
          isLastStepInSegment() &&
          next === 10 &&
          !warnedTenRef.current
        ) {
          warnedTenRef.current = true;
          try {
            sounds?.play?.("ten");
          } catch {}
        }

        if (next <= 0) {
          // Step terminé
          clearTick();
          nextStepOrSegment({ autoAnnounce: true });
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function announceTextFor(seg, stp) {
    const totalRounds = session?.rounds || 8;
    if (seg.phase === "work") {
      const r = seg.round || 0;
      return `Round ${r} sur ${totalRounds}. ${stp.instruction}`;
    }
    // warmup / rest / stretch
    const label = seg.label ? `${seg.label}. ` : "";
    return `${label}${stp.instruction}`;
  }

  function announceThenMaybeStart() {
    const seg = currentSeg();
    const stp = currentStep();
    if (!seg || !stp) return;

    if (announcedRef.current) {
      // déjà annoncé → simple reprise
      startTick();
      return;
    }

    const text = announceTextFor(seg, stp);

    // Annule toute TTS en cours puis annonce
    try {
      speech?.cancel?.();
    } catch {}
    if (!speech?.speak || speech?.enabled === false) {
      // pas de voix → on démarre directement (mais son de début si work + 1er step)
      if (seg.phase === "work" && stepRef.current === 0) {
        try {
          sounds?.play?.("start");
        } catch {}
      }
      startTick();
      announcedRef.current = true;
      return;
    }

    announcedRef.current = true; // verrou anti double-start
    speech.speak(text, () => {
      // 👉 la voix vient de finir : on lance son de début (si work & 1er step) ET timer en même temps
      if (seg.phase === "work" && stepRef.current === 0) {
        try {
          sounds?.play?.("start");
        } catch {}
      }
      startTick();
    });
  }

  // API publique -------------------------------------------------------------

  function start() {
    // Start (= annonce si pas encore annoncée, sinon reprise)
    if (!session || !session.segments?.length) return;
    if (runningRef.current) return;

    // Si on n’a encore rien chargé (première fois), positionner au tout début
    if (!currentSeg()) {
      goto(0, 0, { autoAnnounce: true });
      return;
    }
    announceThenMaybeStart();
  }

  function pause() {
    clearTick();
  }

  function stop() {
    clearTick();
    try {
      speech?.cancel?.();
    } catch {}
    try {
      sounds?.stopAll?.();
    } catch {}

    if (session?.segments?.length) {
      // reset au tout début sans auto annonce
      goto(0, 0, { autoAnnounce: false });
      setPhase(session.segments[0].phase || "idle");
      setRound(session.segments[0].round || null);
    } else {
      setPhase("idle");
      setRound(null);
      setRemaining(0);
      remainingRef.current = 0;
      announcedRef.current = false;
      warnedTenRef.current = false;
      segRef.current = 0;
      stepRef.current = 0;
      setSegmentIndex(0);
      setStepIndex(0);
    }
  }

  // Skip -> passe à la phase/segment suivant (bypass l’échauffement, etc.)
  function skip() {
    clearTick();
    try {
      speech?.cancel?.();
    } catch {}
    try {
      sounds?.stopAll?.();
    } catch {}
    nextStepOrSegment({ autoAnnounce: true });
  }

  // Effets -------------------------------------------------------------------

  // Re-init quand la session change
  useEffect(() => {
    clearTick();
    segRef.current = 0;
    stepRef.current = 0;
    announcedRef.current = false;
    warnedTenRef.current = false;

    if (session?.segments?.length) {
      const seg = session.segments[0];
      const stp = seg.steps?.[0];
      setSegmentIndex(0);
      setStepIndex(0);
      setPhase(seg.phase || "idle");
      setRound(seg.round || null);
      const dur = stp?.duration || 0;
      setRemaining(dur);
      remainingRef.current = dur;
    } else {
      setPhase("idle");
      setRound(null);
      setRemaining(0);
      remainingRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return {
    // état courant
    running,
    phase,
    round,
    segmentIndex,
    stepIndex,
    remaining,

    // actions
    start,
    pause,
    stop,
    skip,
  };
}
