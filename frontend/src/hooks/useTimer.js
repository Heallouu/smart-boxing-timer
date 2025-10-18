// frontend/src/hooks/useTimer.js
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Timer pilotant segments & steps:
 * - Multi-step dans un même segment (ex: split 90/90) : on enchaîne step->step sans finir le segment.
 * - Cloche de départ (start) : seulement au début d'un round (segment "work").
 * - Rappel -10s : basé sur le reste **du segment**, joué 1 fois si tenSecWarning=true.
 * - Cloche de fin (end) : seulement quand le segment se termine.
 * - Transition work -> rest : cloche end PUIS voix "repos", puis le timer démarre le repos.
 * - Pause/Resume ok, Skip -> segment suivant.
 */
export function useTimer({ session, speech, sounds }) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  const tickRef = useRef(null);
  const tenWarnFiredRef = useRef(false);

  // raccourcis
  const segment = useMemo(
    () => session?.segments?.[segmentIndex] ?? null,
    [session, segmentIndex]
  );
  const steps = segment?.steps ?? [];
  const step = steps[stepIndex] ?? null;

  // phase et round exposés
  const phase = segment?.phase ?? "idle";
  const round = segment?.round ?? null;

  // Somme des durées suivantes (y compris step courant)
  const segmentRemaining = useMemo(() => {
    if (!segment || steps.length === 0 || !step) return remaining || 0;
    const restNext = steps
      .slice(stepIndex + 1)
      .reduce((a, s) => a + (s.duration || 0), 0);
    return (remaining || 0) + restNext;
  }, [segment, steps, stepIndex, remaining, step]);

  // --- init quand la session change
  useEffect(() => {
    stop(); // nettoie interval/voix
    if (!session?.segments?.length) return;
    setSegmentIndex(0);
    setStepIndex(0);
    setRemaining(session.segments[0]?.steps?.[0]?.duration || 0);
    tenWarnFiredRef.current = false;
  }, [session]);

  // --- util interval
  function startTicking() {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        return next;
      });
    }, 1000);
  }
  function stopTicking() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  // --- lecture start-of-segment (voix puis cloche si work) puis départ timer
  async function announceAndStartCurrentStep() {
    if (!segment || !step) return;

    // Texte d’annonce
    const isWork = segment.phase === "work";
    const preRound =
      isWork && round ? `Round ${round}. ` : isWork ? "Round. " : "";
    const spoken =
      (step.title ? step.title + ". " : "") + (step.instruction || "");

    // Voix d'abord
    await new Promise((resolve) => speech?.speak?.(preRound + spoken, resolve));

    // Cloche de départ uniquement en début de round (stepIndex === 0) et phase=work
    if (isWork && stepIndex === 0) {
      await sounds?.play?.("start");
    }

    // Démarrer le timer si on a pas été arrêté entre temps
    setRunning(true);
    startTicking();
  }

  // --- passage au step suivant dans le même segment
  async function gotoNextStep() {
    if (!segment) return;
    const lastStep = stepIndex >= steps.length - 1;

    if (!lastStep) {
      // avancer au step suivant sans finir le segment
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      const next = steps[nextIdx];
      setRemaining(next?.duration || 0);

      // Ne jamais rejouer la cloche start au milieu d'un round,
      // mais lire la consigne du second côté.
      speech?.speak?.(
        (next?.title ? next.title + ". " : "") + (next?.instruction || ""),
        () => {}
      );
      // le timer reste en marche (on ne met pas running=false)
      return;
    }

    // sinon fin de segment
    await onSegmentEnd();
  }

  // --- fin de segment: jouer end si work, annoncer la prochaine phase et basculer
  async function onSegmentEnd() {
    if (!segment) return;

    // Stopper le ticking pendant la transition
    stopTicking();
    setRunning(false);

    // Cloche fin uniquement pour un segment de travail
    if (segment.phase === "work") {
      await sounds?.play?.("end");
    }

    // Aller au segment suivant
    const nextSegmentIdx = segmentIndex + 1;
    const nextSegment = session?.segments?.[nextSegmentIdx];

    if (!nextSegment) {
      // Fin de séance
      setRemaining(0);
      return;
    }

    tenWarnFiredRef.current = false; // reset -10s pour le nouveau segment
    setSegmentIndex(nextSegmentIdx);
    setStepIndex(0);
    setRemaining(nextSegment?.steps?.[0]?.duration || 0);

    // Annonce de la première consigne du nouveau segment
    const firstStep = nextSegment?.steps?.[0];
    if (firstStep) {
      // Si on passe en repos, la demande était : cloche (déjà jouée) puis voix "repos"
      const text =
        (firstStep.title ? firstStep.title + ". " : "") +
        (firstStep.instruction || "");
      await new Promise((resolve) => speech?.speak?.(text, resolve));
    }

    // Démarrer le nouveau segment
    setRunning(true);
    startTicking();
  }

  // --- Ten seconds warning (au niveau segment)
  useEffect(() => {
    if (!running || !segment) return;
    if (!segment.tenSecWarning) return;
    if (tenWarnFiredRef.current) return;

    // Quand il reste <= 10 s sur tout le segment : bip
    if (segmentRemaining <= 10 && segmentRemaining > 0) {
      tenWarnFiredRef.current = true;
      sounds?.play?.("ten");
    }
  }, [running, segment, segmentRemaining, sounds]);

  // --- réaction à remaining=0 : avancer step ou segment
  useEffect(() => {
    if (!running) return;
    if (remaining > 0) return;

    // Fin du step courant
    gotoNextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  // --- API controls
  async function start() {
    if (!segment || !step) return;
    if (running) return;

    // Si on est au tout début du segment/step, faire l’annonce puis départ
    await announceAndStartCurrentStep();
  }

  function pause() {
    setRunning(false);
    stopTicking();
  }

  function stop() {
    stopTicking();
    setRunning(false);
    sounds?.stopAll?.();
    speech?.cancel?.();
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
  }

  function skip() {
    sounds?.stopAll?.();
    speech?.cancel?.();
    stopTicking();
    setRunning(false);

    const nextIdx = segmentIndex + 1;
    if (!session?.segments?.[nextIdx]) {
      // déjà à la fin
      setRemaining(0);
      return;
    }
    setSegmentIndex(nextIdx);
    setStepIndex(0);
    setRemaining(session.segments[nextIdx]?.steps?.[0]?.duration || 0);
    tenWarnFiredRef.current = false;

    // Démarre directement la nouvelle phase (annonce incluse)
    announceAndStartCurrentStep();
  }

  // cleanup
  useEffect(() => () => stopTicking(), []);

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
