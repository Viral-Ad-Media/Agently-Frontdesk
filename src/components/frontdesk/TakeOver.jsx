import { useState } from "react";
import { MessageSquareReply, Undo2 } from "lucide-react";
import { ownerReply, handBack } from "@/lib/store";

// The owner steps into the customer's chat as a person. The AI pauses on this conversation until the owner
// hands it back. The customer sees the reply marked as coming from a person at the business.
export default function TakeOver({ c, tenant }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const agent = tenant.words?.agentName || "Aura";
  const active = c.takenOver || open;
  return (
    <div data-testid="takeover" className="border-t border-border px-4 py-3">
      {!active ? (
        <button type="button" onClick={() => setOpen(true)} className="fd-btn-outline fd-btn-sm">
          <MessageSquareReply className="h-4 w-4" /> Take over the chat
        </button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            ownerReply(c.id, text, tenant.name);
            setText("");
          }}
        >
          <label className="min-w-0 flex-1 basis-[240px]">
            <span className="sr-only">Your reply to the customer</span>
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply as ${tenant.name}`} className="h-10 w-full rounded-full border border-border bg-secondary px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
          </label>
          <button type="submit" disabled={!text.trim()} className="fd-btn-primary fd-btn-sm">Send reply</button>
          <button type="button" onClick={() => (handBack(c.id), setOpen(false))} className="fd-btn-outline fd-btn-sm">
            <Undo2 className="h-4 w-4" /> Hand back to {agent}
          </button>
          <span className="basis-full text-[12px] text-muted-foreground">{c.takenOver ? `${agent} is paused on this chat. The customer sees your replies as coming from a person.` : `Your first reply pauses ${agent} on this chat.`}</span>
        </form>
      )}
    </div>
  );
}
