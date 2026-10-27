
import { useRef } from "react";
import { ArrowUp, Camera, Mic, Square, X } from "lucide-react";

export default function Composer({ value, onChange, onSend, onPhoto, photoName, onClearPhoto, voice, busy }) {
  const fileRef = useRef(null);
  return (
    <div className="border-t border-border bg-background/90 px-4 py-4 backdrop-blur-xl md:px-8">
      {photoName && (
        <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 font-spec text-[11px] uppercase text-primary">
          <Camera className="h-3.5 w-3.5" /> {photoName}
          <button onClick={onClearPhoto} aria-label="Remove photo"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
        className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-secondary/60 p-1.5 pl-2 transition-all duration-500 ease-viscous focus-within:border-foreground focus-within:bg-background"
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => e.target.files[0] && onPhoto(e.target.files[0])} />
        <button type="button" onClick={() => fileRef.current.click()} aria-label="Attach photo" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:bg-background hover:text-primary active:scale-90">
          <Camera className="h-5 w-5" />
        </button>
        <input
          value={voice.listening ? voice.interim : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={voice.listening ? "Listening…" : "Describe the problem…"}
          className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground"
        />
        {voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-label={voice.listening ? "Stop listening" : "Speak"}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-500 ease-viscous active:scale-90 ${voice.listening ? "bg-primary text-primary-foreground" : "hover:bg-background hover:text-primary"}`}
          >
            {voice.listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        <button type="submit" disabled={busy || (!value.trim() && !photoName)} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-all duration-500 ease-viscous hover:bg-primary active:scale-90 disabled:opacity-30">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}