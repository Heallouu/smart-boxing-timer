import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

// Estimate utterance time to chain chunks on Android (no reliable onend)
function estimateMs(text, rate = 1.0) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const base = (words * 600) / Math.max(rate, 0.5); // ~150 wpm @ rate=1
  return Math.max(400, Math.min(10000, base));
}

// Split only on Android to improve prosody (web voices are usually fine)
function chunkText(text) {
  if (!text) return [];
  // strong breaks: . ! ? ; :
  let chunks = text.split(/(?<=[.!?;:])\s+/).filter(Boolean);
  // further split very long chunks by comma
  chunks = chunks.flatMap((c) => (c.length > 120 ? c.split(/,\s+/) : [c]));
  return chunks.map((c) => c.trim()).filter(Boolean);
}

export function useSpeech() {
  const isNative = !!Capacitor.isNativePlatform?.();

  // Web voice list (empty on native)
  const [voices, setVoices] = useState([]);
  const [enabled, setEnabled] = useState(true);

  // Web-only
  const [voiceURI, setVoiceURI] = useState(
    localStorage.getItem("voiceURI") || ""
  );

  // Native options
  const [lang, setLang] = useState(localStorage.getItem("ttsLang") || "fr-FR");
  const [rate, setRate] = useState(() => {
    const v = parseFloat(localStorage.getItem("ttsRate"));
    return Number.isFinite(v) ? v : 0.95; // slightly slower than default
  });
  const [pitch, setPitch] = useState(() => {
    const v = parseFloat(localStorage.getItem("ttsPitch"));
    return Number.isFinite(v) ? v : 1.05; // slightly brighter
  });
  const [volume, setVolume] = useState(() => {
    const v = parseFloat(localStorage.getItem("ttsVolume"));
    return Number.isFinite(v) ? v : 1.0;
  });

  const speakingRef = useRef(false);
  const seqRef = useRef(0); // invalidate older speaks

  // --- Web: load voices
  useEffect(() => {
    if (isNative) return;

    function loadVoices() {
      const list =
        window.speechSynthesis &&
        typeof window.speechSynthesis.getVoices === "function"
          ? window.speechSynthesis.getVoices()
          : [];
      setVoices(list);
      if (!voiceURI && list.length) {
        const fr = list.find((v) => v.lang && v.lang.startsWith("fr"));
        if (fr) setVoiceURI(fr.voiceURI);
      }
    }

    loadVoices();
    const synth = window.speechSynthesis;
    if (synth) {
      if (typeof synth.addEventListener === "function") {
        synth.addEventListener("voiceschanged", loadVoices);
      } else {
        synth.onvoiceschanged = loadVoices;
      }
    }
    return () => {
      if (synth) {
        if (typeof synth.removeEventListener === "function") {
          synth.removeEventListener("voiceschanged", loadVoices);
        } else {
          synth.onvoiceschanged = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  useEffect(() => {
    if (!isNative) localStorage.setItem("voiceURI", voiceURI || "");
  }, [voiceURI, isNative]);

  useEffect(() => {
    if (isNative) localStorage.setItem("ttsLang", lang);
  }, [lang, isNative]);

  useEffect(() => {
    if (!isNative) return;
    localStorage.setItem("ttsRate", String(rate));
    localStorage.setItem("ttsPitch", String(pitch));
    localStorage.setItem("ttsVolume", String(volume));
  }, [rate, pitch, volume, isNative]);

  // --- Speak
  async function speak(text, onEnd) {
    if (!enabled || !text) {
      onEnd && onEnd();
      return;
    }
    seqRef.current += 1;
    const mySeq = seqRef.current;

    // Native (Android/iOS via Capacitor)
    if (isNative) {
      speakingRef.current = true;

      const chunks = chunkText(text);
      const list = chunks.length ? chunks : [text];

      for (const part of list) {
        if (seqRef.current !== mySeq) break; // cancelled
        try {
          await TextToSpeech.speak({
            text: part,
            lang,
            rate, // 0.5..2.0 (approx)
            pitch, // 0.5..2.0
            volume, // 0..1
            category: "ambient",
          });
        } catch {
          // Try to open installer if engine/voice missing
          try {
            await TextToSpeech.openInstall?.();
          } catch {}
        }
        // wait roughly for this part to finish
        const ms = estimateMs(part, rate);
        await new Promise((r) => setTimeout(r, ms));
      }

      if (seqRef.current === mySeq) {
        speakingRef.current = false;
        onEnd && onEnd();
      }
      return;
    }

    // Web
    const synth = window.speechSynthesis;
    if (!synth) {
      onEnd && onEnd();
      return;
    }

    const u = new SpeechSynthesisUtterance(text);
    const v =
      voices.find((v) => v.voiceURI === voiceURI) ||
      voices.find((v) => v.lang && v.lang.startsWith("fr")) ||
      voices[0];
    if (v) u.voice = v;

    // mirror rate/pitch choices on web too
    u.rate = Math.max(0.5, Math.min(rate || 1.0, 2.0));
    u.pitch = Math.max(0.5, Math.min(pitch || 1.0, 2.0));

    const finish = () => {
      if (seqRef.current === mySeq) {
        speakingRef.current = false;
        onEnd && onEnd();
      }
    };
    u.onend = finish;
    u.onerror = finish;

    speakingRef.current = true;
    synth.cancel();
    synth.speak(u);
  }

  function cancel() {
    seqRef.current += 1;
    speakingRef.current = false;
    if (isNative) {
      TextToSpeech.stop?.().catch(() => {});
      return;
    }
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
  }

  return {
    // common
    enabled,
    setEnabled,
    speak,
    cancel,
    isSpeaking: () => speakingRef.current,

    // web
    voices: isNative ? [] : voices,
    voiceURI,
    setVoiceURI,

    // native extras
    isNative,
    lang,
    setLang,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
  };
}
