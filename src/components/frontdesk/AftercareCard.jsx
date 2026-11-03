import { useState } from "react";
import { Check, HeartPulse, Pencil, Send } from "lucide-react";
import { setAftercare } from "@/lib/store";
import { aftercareDraft, hasAftercare } from "@/lib/aftercare";

const LABEL = { draft: "Draft", approved: "Approved", sent: "Sent" };

// Med spa only, once a consultation is booked: the clinic's aftercare note for that service, drafted for the
// client. The clinician edits and approves it; Send stays locked until then. Nothing goes out on its own.
export default function AftercareCard({ c, tenant, booked }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  if (!hasAftercare(tenant) || !booked) return null;
  const a = c.aftercare || { text: aftercareDraft(c, tenant), status: "draft" };
  const status = a.status;
  const pill = status === "sent" ? "fd-pill-ok" : status === "approved" ? "fd-pill-strong" : "fd-pill-neutral";
  return (
    <div data-testid="aftercare" className="border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <HeartPulse className="h-4 w-4 text-primary" strokeWidth={1.75} />
        <p className="text-[14px] font-medium">Aftercare reminder, for after the visit</p>
        <span className={pill}>{LABEL[status]}</span>
      </div>
      {editing ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAftercare(c.id, { text: text.trim() });
            setEditing(false);
          }}
        >
          <label className="block">
            <span className="sr-only">Aftercare note</span>
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-xl border border-border bg-secondary p-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={!text.trim()} className="fd-btn-primary fd-btn-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="fd-btn-outline fd-btn-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-muted-foreground">{a.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={status !== "draft"} onClick={() => setAftercare(c.id, { text: a.text, status: "approved" })} className="fd-btn-primary fd-btn-sm">
              <Check className="h-4 w-4" /> Approve
            </button>
            <button type="button" disabled={status === "sent"} onClick={() => (setText(a.text), setEditing(true))} className="fd-btn-outline fd-btn-sm">
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button type="button" disabled={status !== "approved"} onClick={() => setAftercare(c.id, { status: "sent" })} className="fd-btn-ink fd-btn-sm">
              <Send className="h-4 w-4" /> Send
            </button>
            <span className="text-[12px] text-muted-foreground">The clinic's own aftercare sheet. A clinician approves it before it goes out.</span>
          </div>
        </>
      )}
    </div>
  );
}
