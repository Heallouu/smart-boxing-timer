// frontend/src/hooks/useAudioQueue.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook Audio:
 * - Joue des sons UFC depuis /public/sounds (start, 10s, end) + beeps fallback
 * - Pas de chevauchement (stopAll avant lecture)
 * - Persistance du choix (localStorage: soundSelection)
 * - Garde d’égalité pour éviter les re-renders en boucle
 */

export function useAudioQueue() {
  // --------- AudioContext ----------
  const ctxRef = useRef(null);
  function ensureCtx() {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  }

  // --------- Buffers / players ----------
  const buffersRef = useRef({}); // { clipKey: AudioBuffer }
  const playingRef = useRef([]); // Array<{ source, gain }>
  const loadingRef = useRef({}); // { clipKey: Promise }

  // --------- Catalogue de sons ----------
  const CLIPS = {
    "ufc-bell": "/sounds/ufc_start.mp3",
    "ufc-10s": "/sounds/ufc_10s.mp3",
    "ufc-end": "/sounds/ufc_end.mp3",
  };
  const BEEPS = ["beep-A", "beep-B", "beep-C"];
  const options = [...Object.keys(CLIPS), ...BEEPS];

  // --------- Sélection par évènement ----------
  const defaultSelection = {
    start: "ufc-bell",
    ten: "ufc-10s",
    end: "ufc-end",
  };
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem("soundSelection") || "null");
    } catch {
      return null;
    }
  })();

  const [selected, setSelectedState] = useState(stored || defaultSelection);

  // petite util d’égalité superficielle
  const eqSel = (a, b) =>
    a && b && a.start === b.start && a.ten === b.ten && a.end === b.end;

  // setter pratique (accepte partiel) + garde d’égalité
  function setSelected(upd) {
    setSelectedState((prev) => {
      const next = typeof upd === "function" ? upd(prev) : { ...prev, ...upd };
      if (eqSel(prev, next)) return prev; // ✅ pas de nouvel objet si inchangé
      try {
        localStorage.setItem("soundSelection", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // --------- Utils lecture / stop ----------
  function stopAll() {
    playingRef.current.forEach(({ source }) => {
      try {
        source.stop(0);
      } catch {}
    });
    playingRef.current = [];
  }

  function trackPlaying(source, gain) {
    const entry = { source, gain };
    playingRef.current.push(entry);
    const cleanup = () => {
      playingRef.current = playingRef.current.filter((x) => x !== entry);
      try {
        source.disconnect();
      } catch {}
      try {
        gain.disconnect();
      } catch {}
    };
    source.onended = cleanup;
  }

  // --------- Charge un AudioBuffer ----------
  async function loadBuffer(clipKey) {
    if (!CLIPS[clipKey]) return null;
    if (buffersRef.current[clipKey]) return buffersRef.current[clipKey];
    if (loadingRef.current[clipKey]) return loadingRef.current[clipKey];

    const ctx = ensureCtx();
    const p = (async () => {
      const res = await fetch(CLIPS[clipKey]);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${CLIPS[clipKey]}`);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    })();

    loadingRef.current[clipKey] = p;
    try {
      const buffer = await p;
      buffersRef.current[clipKey] = buffer;
      return buffer;
    } finally {
      delete loadingRef.current[clipKey];
    }
  }

  // --------- Lecture d’un buffer ----------
  function playBuffer(buffer) {
    const ctx = ensureCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    trackPlaying(source, gain);
    return new Promise((resolve) => {
      source.onended = () => {
        try {
          source.disconnect();
        } catch {}
        try {
          gain.disconnect();
        } catch {}
        playingRef.current = playingRef.current.filter(
          (x) => x.source !== source
        );
        resolve();
      };
    });
  }

  // --------- Fallback beeps ----------
  function beepPattern(name) {
    switch (name) {
      case "beep-A":
        return [[440, 200]];
      case "beep-B":
        return [
          [660, 200],
          [520, 160],
        ];
      case "beep-C":
        return [
          [880, 120],
          [0, 80],
          [880, 120],
        ];
      default:
        return [[440, 200]];
    }
  }

  function playBeep(name) {
    const ctx = ensureCtx();
    const pattern = beepPattern(name);
    let t = ctx.currentTime;
    const gains = [];
    const nodes = [];

    for (const [freq, ms] of pattern) {
      if (freq === 0) {
        t += ms / 1000;
        continue;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const start = t;
      const end = t + ms / 1000;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.start(start);
      osc.stop(end);

      nodes.push(osc);
      gains.push(gain);
      t = end + 0.02;
    }

    nodes.forEach((osc, i) => trackPlaying(osc, gains[i]));
    const totalMs =
      pattern.reduce((a, [, ms]) => a + ms, 0) + 20 * pattern.length;
    return new Promise((res) => setTimeout(res, totalMs));
  }

  // --------- API ----------
  async function playClip(clipKey) {
    stopAll();
    try {
      if (BEEPS.includes(clipKey)) return await playBeep(clipKey);
      const buffer = await loadBuffer(clipKey);
      if (buffer) return await playBuffer(buffer);
      return await playBeep("beep-A");
    } catch {
      return await playBeep("beep-A");
    }
  }

  async function play(eventKey) {
    const clipKey = selected?.[eventKey] || defaultSelection[eventKey];
    return await playClip(clipKey);
  }

  async function playSequence(events) {
    for (const e of events) await play(e);
  }

  async function testAll() {
    await playSequence(["start", "ten", "end"]);
  }

  // Legacy
  function playStart(done) {
    play("start").then(() => done && done());
  }
  function playWarn(done) {
    play("ten").then(() => done && done());
  }
  function playEnd(done) {
    play("end").then(() => done && done());
  }

  useEffect(() => stopAll, []);

  return {
    options,
    selected,
    setSelected,
    play,
    playClip,
    playSequence,
    testAll,
    stopAll,
    // legacy
    playStart,
    playWarn,
    playEnd,
  };
}
