import { useCallback, useEffect, useRef, useState } from "react";

// Browser speech recognition (input) + speech synthesis (output).
export default function useVoice({ onFinal }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!SR;

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const start = useCallback(() => {
    if (!SR) return;
    stopSpeaking();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    let text = "";
    rec.onresult = (e) => {
      text = Array.from(e.results).map((r) => r[0].transcript).join("");
      setInterim(text);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (text.trim()) finalRef.current(text.trim());
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [SR, stopSpeaking]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => () => { recRef.current?.abort(); window.speechSynthesis?.cancel(); }, []);

  return { supported, listening, speaking, interim, start, stop, speak, stopSpeaking };
}