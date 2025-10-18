// frontend/src/hooks/useTimer.js
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Timer pilotant segments & steps (version stable, setInterval):
 * - Voix d'abord. À la fin de la voix:
 *    • si phase=work & stepIndex=0 → cloche "start" (non bloquante) + démarrage du timer en même temps
 *    • sinon → juste démarrage du timer
 * - Split 90/90: à la moitié → pas de cloche, pas de pause; on dit "Change de côté." et on continue le chrono.
 * - -10s: seulement si phase=work ET dernier step du round.
 * - Fin de round (work): cloche "end", puis annonce du repos, puis repos démarre.
 * - Warmup/stretch: step→step normal (1:00/0:30...), aucune avalanche.
 */

export function useTimer({ session, speech, sounds }) {
  // Index & état
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  // Exposé
  const segment = useMemo(
    () => session?.segments?.[segmentIndex] ?? null,
    [session, segmentIndex]
  );
  const steps = segment?.steps ?? [];
  const step = steps[stepIndex] ?? null;

  const phase = segment?.phase ?? "idle";
  const round = segment?.round ?? null;

  // Refs runtime
  const tickRef = useRef(null);
  const tenWarnFiredRef = useRef(false);
  const announcingRef = useRef(false); // 🔒 empêche toute progression auto pendant TTS

  // Reste du segment (step courant + suivants)
  const segmentRemaining = useMemo(() => {
    if (!segment || !step) return remaining || 0;
    const after = steps
      .slice(stepIndex + 1)
      .reduce((a, s) => a + (s.duration || 0), 0);
    return (remaining || 0) + after;
  }, [segment, steps, stepIndex, remaining, step]);

  // --- Init quand la session change
  useEffect(() => {
    stopInternal();
    if (!session?.segments?.length) return;
    setSegmentIndex(0);
    setStepIndex(0);
    setRemaining(session.segments[0]?.steps?.[0]?.duration || 0);
    tenWarnFiredRef.current = false;
    announcingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // --- Ticking
  function startTicking() {
    if (tickRef.current) return;
    setRunning(true);
    tickRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
  }

  function stopTicking() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRunning(false);
  }

  function stopInternal() {
    stopTicking();
    sounds?.stopAll?.();
    speech?.cancel?.();
  }

  // --- Annonce + départ
  async function announceAndStartCurrentStep() {
    if (!segment || !step) return;

    announcingRef.current = true;

    // Texte (sans titre, seulement la consigne)
    let text;
    if (phase === "work") {
      const totalRounds = session?.rounds || 8;
      const r = round ?? 0;
      text = `Round ${r} sur ${totalRounds}. ${step.instruction}`;
    } else {
      const label = segment?.label ? `${segment.label}. ` : "";
      text = `${label}${step.instruction}`;
    }

    // 1) Voix
    await new Promise((resolve) => speech?.speak?.(text, resolve));

    // 2) Cloche start seulement si début de round (work & 1er step) — en parallèle du timer
    if (phase === "work" && stepIndex === 0) {
      try {
        sounds?.play?.("start"); // non bloquant
      } catch {}
    }

    // 3) Démarrage chrono
    announcingRef.current = false;
    startTicking();
  }

  // --- Aller au step suivant (même segment) ou finir le segment
  async function gotoNextStep() {
    if (!segment) return;

    const lastStep = stepIndex >= steps.length - 1;

    if (!lastStep) {
      // On enchaîne le step suivant SANS arrêter le chrono
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      const next = steps[nextIdx];
      setRemaining(next?.duration || 0);

      // Si c'est un split work (90/90 typique) → dire "Change de côté."
      const isSplitWithin =
        phase === "work" &&
        steps.length === 2 &&
        (steps[0]?.duration === 90 || steps[1]?.duration === 90) &&
        (segment?.total === 180 ||
          (steps[0]?.duration || 0) + (steps[1]?.duration || 0) === 180);

      if (isSplitWithin) {
        speech?.speak?.("Change de côté.", () => {});
      } else {
        // Sinon juste la consigne suivante (sans titre)
        speech?.speak?.(next?.instruction || "", () => {});
      }
      // Le timer RESTE en marche
      return;
    }

    // Fin de segment
    await onSegmentEnd();
  }

  // --- Fin de segment
  async function onSegmentEnd() {
    if (!segment) return;

    // On stoppe pendant la transition
    stopTicking();

    // Si fin de round de travail → cloche "end"
    if (phase === "work") {
      try {
        await sounds?.play?.("end");
      } catch {}
    }

    // Segment suivant
    const nextSegmentIdx = segmentIndex + 1;
    const nextSegment = session?.segments?.[nextSegmentIdx];

    if (!nextSegment) {
      // Fin de séance
      setRemaining(0);
      return;
    }

    tenWarnFiredRef.current = false;
    setSegmentIndex(nextSegmentIdx);
    setStepIndex(0);
    setRemaining(nextSegment?.steps?.[0]?.duration || 0);

    // Annonce de la prochaine phase (repos, warmup, etc.)
    const firstStep = nextSegment?.steps?.[0];
    const nextText =
      (nextSegment.phase === "work"
        ? `Round ${nextSegment.round} sur ${session?.rounds || 8}. `
        : nextSegment.label
        ? `${nextSegment.label}. `
        : "") + (firstStep?.instruction || "");

    await new Promise((resolve) => speech?.speak?.(nextText, resolve));

    // Démarrage du nouveau segment
    startTicking();
    // ⬇️ Si c'est un nouveau round, rejouer la cloche "start"
    if (nextSegment.phase === "work") {
      try {
        sounds?.play?.("start");
      } catch {}
    }
  }

  // --- -10 secondes (au niveau segment, uniquement dernier step d'un round de travail)
  useEffect(() => {
    if (!running || !segment) return;
    if (!segment.tenSecWarning) return;
    if (tenWarnFiredRef.current) return;
    if (phase !== "work") return;

    // On ne bippe que sur le DERNIER step du round
    const isLast = stepIndex >= steps.length - 1;
    if (!isLast) return;

    if (segmentRemaining === 10) {
      tenWarnFiredRef.current = true;
      try {
        sounds?.play?.("ten");
      } catch {}
    }
  }, [running, segment, segmentRemaining, phase, stepIndex, steps, sounds]);

  // --- Avance auto à la fin d’un step (quand le timer tourne)
  useEffect(() => {
    if (!running) return;
    if (announcingRef.current) return; // 🔒 ne pas avancer pendant une annonce
    if (remaining > 0) return;

    // Step terminé → avancer
    gotoNextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  // --- API contrôles
  async function start() {
    if (!segment || !step) return;
    if (running || announcingRef.current) return;

    // Annonce puis départ (avec cloche start si work & 1er step)
    await announceAndStartCurrentStep();
  }

  function pause() {
    stopTicking();
  }

  function stop() {
    stopInternal();
    if (!session?.segments?.length) {
      setSegmentIndex(0);
      setStepIndex(0);
      setRemaining(0);
      return;
    }
    setSegmentIndex(0);
    setStepIndex(0);
    setRemaining(session.segments[0]?.steps?.[0]?.duration || 0);
    tenWarnFiredRef.current = false;
    announcingRef.current = false;
  }

  function skip() {
    // Couper ce qui joue
    try {
      sounds?.stopAll?.();
    } catch {}
    try {
      speech?.cancel?.();
    } catch {}
    stopTicking();
    setRunning(false);

    const seg = session?.segments?.[segmentIndex];
    if (!seg) return;

    const steps = seg.steps ?? [];
    const hasNextStep = stepIndex + 1 < steps.length;

    if (hasNextStep) {
      // ➜ Step suivant DANS le même segment (ex: 2ᵉ moitié d’un split)
      const nextIdx = stepIndex + 1;
      const next = steps[nextIdx];

      setStepIndex(nextIdx);
      setRemaining(next?.duration || 0);

      // Lire UNIQUEMENT la consigne, puis redémarrer le timer (pas de cloche)
      speech?.speak?.(next?.instruction || "", () => {
        setRunning(true);
        startTicking();
      });
    } else {
      // ➜ Dernier step du segment : passer au segment suivant (s’il existe)
      const nextSegIdx = segmentIndex + 1;
      const nextSeg = session?.segments?.[nextSegIdx];
      if (!nextSeg) {
        setRemaining(0);
        return;
      }

      tenWarnFiredRef.current = false;
      setSegmentIndex(nextSegIdx);
      setStepIndex(0);
      const first = nextSeg?.steps?.[0];
      setRemaining(first?.duration || 0);

      // Annoncer la 1ʳᵉ consigne du prochain segment, puis timer
      const announce =
        (nextSeg.phase === "work"
          ? `Round ${nextSeg.round} sur ${session?.rounds || 8}. `
          : nextSeg.label
          ? `${nextSeg.label}. `
          : "") + (first?.instruction || "");

      speech?.speak?.(announce, () => {
        setRunning(true);
        startTicking();
        if (nextSeg.phase === "work") {
          try {
            sounds?.play?.("start");
          } catch {}
        }
      });
    }
  }

  return {
    // état exposé
    running,
    phase,
    round,
    segmentIndex,
    stepIndex,
    remaining,

    // contrôles
    start,
    pause,
    stop,
    skip,
  };
}
