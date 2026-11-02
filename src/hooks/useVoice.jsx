import { useCallback, useEffect, useRef, useState } from "react";
import { cleanUtterance, turnDelay } from "@/lib/endpoint";

// Browser speech recognition (input) + speech synthesis (output).
// Input: keeps listening through pauses and "ehm"s, and ends the turn only when the sentence sounds finished
// (see lib/endpoint.js). Tapping stop sends what was said straight away.
// Output: reports how far into the reply the voice has got, so the screen can show each word as it is spoken.
export default function useVoice({ onFinal }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [spoken, setSpoken] = useState({ text: "", upTo: 0 });
  const recRef = useRef(null);
  const turn = useRef({ text: "", done: false, timer: null });
  const revealRef = useRef(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!SR;

  const stopReveal = () => clearInterval(revealRef.current);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopReveal();
    setSpeaking(false);
    setSpoken((s) => ({ ...s, upTo: s.text.length }));
  }, []);

  const finish = useCallback(() => {
    const t = turn.current;
    if (t.done) return;
    t.done = true;
    clearTimeout(t.timer);
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  const start = useCallback(() => {
    if (!SR) return;
    stopSpeaking();
    clearTimeout(turn.current.timer);
    turn.current = { text: "", done: false, timer: null, base: "" };
    const listen = () => {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        const t = turn.current;
        t.text = (t.base + " " + Array.from(e.results).map((r) => r[0].transcript).join("")).trim();
        setInterim(t.text);
        // Every new word resets the silence clock; how long we wait depends on how the sentence ends.
        clearTimeout(t.timer);
        t.timer = setTimeout(finish, turnDelay(t.text));
      };
      rec.onend = () => {
        const t = turn.current;
        if (!t.done) {
          // The browser stopped on its own (a long pause or its time limit) before the sentence sounded
          // finished: keep what was said and listen again.
          t.base = t.text;
          try { listen(); return; } catch { /* fall through and send */ }
        }
        clearTimeout(t.timer);
        setListening(false);
        setInterim("");
        const said = cleanUtterance(t.text);
        if (said) finalRef.current(said);
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return; // onend decides
        turn.current.done = true;
        setListening(false);
      };
      recRef.current = rec;
      rec.start();
    };
    listen();
    setListening(true);
  }, [SR, stopSpeaking, finish]);

  const stop = useCallback(() => finish(), [finish]);

  const speak = useCallback((text, onEnd) => {
    setSpoken({ text, upTo: 0 });
    if (!window.speechSynthesis) {
      setSpoken({ text, upTo: text.length });
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    stopReveal();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    let byBoundary = false;
    // Words appear as they are spoken. Most voices report each word (onboundary); for voices that do not,
    // reveal at normal speaking pace (about 15 characters a second) from the moment speech starts.
    u.onstart = () => {
      setSpeaking(true);
      const t0 = performance.now();
      revealRef.current = setInterval(() => {
        if (byBoundary) return;
        const upTo = Math.min(text.length, Math.round(((performance.now() - t0) / 1000) * 15));
        setSpoken((s) => (s.text === text ? { text, upTo: Math.max(s.upTo, nextSpace(text, upTo)) } : s));
      }, 80);
    };
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      byBoundary = true;
      const end = nextSpace(text, e.charIndex + (e.charLength || 1));
      setSpoken((s) => (s.text === text ? { text, upTo: Math.max(s.upTo, end) } : s));
    };
    const done = () => {
      stopReveal();
      setSpeaking(false);
      setSpoken({ text, upTo: text.length });
      onEnd?.();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => () => {
    turn.current.done = true;
    clearTimeout(turn.current.timer);
    stopReveal();
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  return { supported, listening, speaking, interim, spoken, start, stop, speak, stopSpeaking };
}

const nextSpace = (text, i) => {
  if (i >= text.length) return text.length;
  const j = text.indexOf(" ", i);
  return j === -1 ? text.length : j;
};
