// frontend/src/hooks/useTimer.js
import { useEffect, useRef, useState } from "react";

/**
 * useTimer({ session, speech, sounds })
 *
 * Audio & enchaînement :
 *  - Début de round (work + 1er step) : VOIX (round + consigne) → cloche "start" → départ timer.
 *  - Échauffement & Repos             : VOIX → départ timer (pas de cloche).
 *  - Split (work en 2 steps 90/90)    : au milieu → PAS de cloche, PAS de pause ; juste "Change de côté"
 *                                        et le timer continue sur la 2e moitié.
 *  - -10s                             : une fois, seulement sur le DERNIER step du round de travail.
 *  - Fin de round                     : cloche "end", puis annonce du repos, puis timer du repos.
 */

export function useTimer({ session, speech, sounds }) {
  // Index + état
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  // Infos d’affichage
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(null);

  // Réfs (anti stale-closures)
  const segRef = useRef(0);
  const stepRef = useRef(0);
  const runningRef = useRef(false);
  const remainingRef = useRef(0);

  const announcedRef = useRef(false); // annonce déjà faite pour le step courant ?
  const warnedTenRef = useRef(false); // -10s déjà joué pour CE round ?

  const tickRef = useRef(null);

  // ---------- Helpers ----------

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

  // Durée robuste (gère les splits 90/90 même si les durées sont manquantes)
  function safeStepDuration(seg, stpIdx) {
    const steps = seg?.steps || [];
    const raw = steps[stpIdx]?.duration;

    if (Number.isFinite(raw) && raw > 0) return raw;

    const total = seg?.total || 0;

    // Split 2-steps → moitié / moitié (ou 90/90 fallback)
    if (seg?.phase === "work" && steps.length === 2) {
      if (stpIdx === 0) {
        return total > 0 ? Math.floor(total / 2) : 90;
      } else {
        const first =
          Number.isFinite(steps[0]?.duration) && steps[0].duration > 0
            ? steps[0].duration
            : total > 0
            ? Math.floor(total / 2)
            : 90;
        const rest = (total || 180) - first;
        return rest > 0 ? rest : 90;
      }
    }

    // Sinon, reconstitue depuis total si possible
    if (total > 0) {
      const used = steps
        .slice(0, stpIdx)
        .reduce(
          (a, s) => a + (Number.isFinite(s?.duration) ? s.duration : 0),
          0
        );
      const remain = Math.max(0, total - used);
      if (remain > 0) return remain;
    }

    // Fallback par phase
    if (seg?.phase === "rest") return 60;
    if (seg?.phase === "warmup") return 60;
    if (seg?.phase === "stretch") return 30;
    if (seg?.phase === "work") return 180;
    return 30;
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

    const dur = safeStepDuration(seg, stpIdx);
    setRemaining(dur);
    remainingRef.current = dur;

    announcedRef.current = false;
    warnedTenRef.current = false;

    if (autoAnnounce) {
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

    // Round de travail → cloche de fin avant d'enchaîner
    if (seg.phase === "work" && waitEndSound) {
      (async () => {
        try {
          await sounds?.play?.("end");
        } catch {}
        goto(nextSegIdx, 0, { autoAnnounce });
      })();
    } else {
      goto(nextSegIdx, 0, { autoAnnounce });
    }
  }

  function startTick() {
    if (tickRef.current) return;
    setRunning(true);
    runningRef.current = true;

    tickRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        remainingRef.current = next;

        const seg = currentSeg();
        const stepsLen = seg?.steps?.length || 0;

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

        // Fin de step
        if (next <= 0) {
          // 🔥 Cas spécial : SPLIT 90/90 (work avec 2 steps), passage 1ère→2ème moitié
          if (
            seg?.phase === "work" &&
            stepsLen === 2 &&
            stepRef.current === 0
          ) {
            // 👉 Pas de clearTick, on GARDE le timer en marche
            const dur2 = safeStepDuration(seg, 1);

            // Indices → 2e moitié
            stepRef.current = 1;
            setStepIndex(1);

            // Reset -10s pour la seconde moitié
            warnedTenRef.current = false;

            // On ne ré-annonce pas la consigne complète : juste "Change de côté"
            try {
              speech?.cancel?.();
            } catch {}
            speech?.speak?.("Change de côté", () => {});

            // Nouveau remaining (2e moitié)
            remainingRef.current = dur2;
            return dur2; // on continue le timer SANS cloche, SANS pause
          }

          // Fin de segment (ou fin de step normal)
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
    const label = seg.label ? `${seg.label}. ` : "";
    return `${label}${stp.instruction}`;
  }

  function announceThenMaybeStart() {
    const seg = currentSeg();
    const stp = currentStep();
    if (!seg || !stp) return;

    if (announcedRef.current) {
      startTick();
      return;
    }

    const text = announceTextFor(seg, stp);
    announcedRef.current = true;

    try {
      speech?.cancel?.();
    } catch {}

    // VOIX AVANT TIMER pour: début de round (work+step0), warmup, rest
    const voiceFirst =
      (seg.phase === "work" && stepRef.current === 0) ||
      seg.phase === "warmup" ||
      seg.phase === "rest";

    if (voiceFirst) {
      speech?.speak?.(text, () => {
        if (seg.phase === "work" && stepRef.current === 0) {
          try {
            sounds?.play?.("start");
          } catch {}
        }
        startTick();
      });
      return;
    }

    // Autres cas (2e moitié de split, stretch…) : timer direct, voix en parallèle
    startTick();
    if (text) speech?.speak?.(text, () => {});
  }

  // ---------- API ----------

  function start() {
    if (!session || !session.segments?.length) return;
    if (runningRef.current) return;

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

  // Skip → phase suivante, sans cloche de fin
  function skip() {
    clearTick();
    try {
      speech?.cancel?.();
    } catch {}
    try {
      sounds?.stopAll?.();
    } catch {}
    nextStepOrSegment({ autoAnnounce: true, waitEndSound: false });
  }

  // ---------- Effects ----------

  // Reset quand la session change
  useEffect(() => {
    clearTick();
    segRef.current = 0;
    stepRef.current = 0;
    announcedRef.current = false;
    warnedTenRef.current = false;

    if (session?.segments?.length) {
      const seg = session.segments[0];
      setSegmentIndex(0);
      setStepIndex(0);
      setPhase(seg.phase || "idle");
      setRound(seg.round || null);

      const dur = safeStepDuration(seg, 0);
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
    running,
    phase,
    round,
    segmentIndex,
    stepIndex,
    remaining,
    start,
    pause,
    stop,
    skip,
  };
}
