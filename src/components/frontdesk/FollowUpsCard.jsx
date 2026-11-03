import { useState } from "react";
import { BellRing, Check, Pencil, Send } from "lucide-react";
import { setFollowUp } from "@/lib/store";
import { followUpPlan } from "@/lib/followups";
import { fmtDay } from "@/components/frontdesk/SlotPicker";

const LABEL = { draft: "Draft", approved: "Approved", sent: "Sent" };
const PILL = { draft: "fd-pill-neutral", approved: "fd-pill-strong", sent: "fd-pill-ok" };

// Day 3, 7 and 14 follow-ups after a sent quote. Drafted ahead of time, so the owner can read and approve them
// whenever suits; only an approved one can be sent. Stops when the customer books.
export default function FollowUpsCard({ c, tenant }) {
  const plan = followUpPlan(c, tenant);
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState("");
  if (!plan) return null;
  return (
    <div data-testid="followups" className="border-t border-border px-4 py-3">
      <p className="flex items-center gap-2 text-[14px] font-medium">
        <BellRing className="h-4 w-4 text-primary" strokeWidth={1.75} /> Follow-ups if they don't book
      </p>
      {plan.stopped ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{plan.stopped}</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {plan.steps.map((st) => (
            <li key={st.day} className="rounded-xl bg-secondary p-3" data-testid={`followup-${st.day}`}>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold">Day {st.day}</span>
                <span className="text-muted-foreground">{fmtDay(st.due)}{st.isDue ? " · due now" : ""}</span>
                <span className={PILL[st.status]}>{LABEL[st.status]}</span>
              </div>
              {editing === st.day ? (
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (text.trim()) setFollowUp(c.id, st.day, { text: text.trim() });
                    setEditing(null);
                  }}
                >
                  <label className="block">
                    <span className="sr-only">Follow-up message for day {st.day}</span>
                    <textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-border bg-card p-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="fd-btn-primary fd-btn-sm">Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="fd-btn-outline fd-btn-sm">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="mt-1.5 text-[14px] text-muted-foreground">{st.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={st.status !== "draft"} onClick={() => setFollowUp(c.id, st.day, { text: st.text, status: "approved" })} className="fd-btn-primary fd-btn-sm">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button type="button" disabled={st.status === "sent"} onClick={() => (setText(st.text), setEditing(st.day))} className="fd-btn-outline fd-btn-sm">
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button type="button" disabled={st.status !== "approved"} onClick={() => setFollowUp(c.id, st.day, { status: "sent" })} className="fd-btn-ink fd-btn-sm">
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
