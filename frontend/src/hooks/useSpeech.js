import { useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [voices, setVoices] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [voiceURI, setVoiceURI] = useState(localStorage.getItem("voiceURI") || "");
  const speakingRef = useRef(false);

  // 👉 compteur pour invalider les anciens onend/onerror
  const seqRef = useRef(0);

  useEffect(() => {
    function loadVoices() {
      const list =
        (window.speechSynthesis && typeof window.speechSynthesis.getVoices === "function")
          ? window.speechSynthesis.getVoices()
          : [];
      setVoices(list);
      if (!voiceURI && list.length) {
        const fr = list.find(v => v.lang && v.lang.startsWith("fr"));
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
  }, []);

  useEffect(() => {
    localStorage.setItem("voiceURI", voiceURI || "");
  }, [voiceURI]);

  function speak(text, onEnd) {
    const synth = window.speechSynthesis;
    if (!enabled || !synth) { onEnd && onEnd(); return; }

    // 👉 invalide tout ce qui précède et crée un nouveau token
    seqRef.current += 1;
    const mySeq = seqRef.current;

    const u = new SpeechSynthesisUtterance(text);
    const v =
      voices.find(v => v.voiceURI === voiceURI) ||
      voices.find(v => v.lang && v.lang.startsWith("fr")) ||
      voices[0];
    if (v) u.voice = v;

    const finish = () => {
      // 👉 ne termine que si c’est toujours le dernier speak lancé
      if (seqRef.current === mySeq) {
        speakingRef.current = false;
        onEnd && onEnd();
      }
    };

    u.onend = finish;
    u.onerror = finish;

    speakingRef.current = true;
    // 👉 Cancel déclenchera onend de l’ancien u, mais son seq sera invalide
    synth.cancel();
    synth.speak(u);
  }

  function cancel() {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    speakingRef.current = false;
    // 👉 invalide tous les onend/onerror en cours
    seqRef.current += 1;
  }

  return {
    voices, enabled, setEnabled, voiceURI, setVoiceURI, speak, cancel,
    isSpeaking: () => speakingRef.current
  };
}
