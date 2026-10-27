import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { fmtDay, fmtTime } from "@/components/frontdesk/SlotPicker";

// Plain numbers from the case record, written as the sentence the owner reads between jobs. No AI, no invention.
export function summarise({ tenant, cases, slots, leads }) {
  const spa = tenant.trade === "medspa";
  const answered = cases.filter((c) => c.messages.some((m) => m.role === "assistant")).length;
  const booked = cases.filter((c) => c.bookingSlotId).length;
  const awaiting = cases.filter((c) => c.quote?.status === "awaiting_approval").length;
  const approved = cases.filter((c) => c.quote?.status === "approved").length;
  const recovered = leads.filter((l) => l.recovered).length;
  const drafted = leads.filter((l) => l.message?.status === "draft").length;
  const calls = cases.filter((c) => c.source === "call").length;
  const next = slots
    .filter((s) => s.caseId && new Date(s.start).getTime() > Date.now())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const parts = [
    `${answered} enquir${answered === 1 ? "y" : "ies"} answered${calls ? ` (${calls} by phone)` : ""}`,
    `${booked} ${spa ? "consultation" : "inspection"}${booked === 1 ? "" : "s"} booked`,
    `${recovered} ${spa ? "client" : "job"}${recovered === 1 ? "" : "s"} reactivated`,
  ];
  const todo = [];
  if (awaiting) todo.push(`${awaiting} ${spa ? "plan" : "quote"}${awaiting === 1 ? "" : "s"} waiting for your approval`);
  if (approved) todo.push(`${approved} approved but not sent`);
  if (drafted) todo.push(`${drafted} re-opener${drafted === 1 ? "" : "s"} drafted, not reviewed`);
  const nextLine = next ? `Next ${spa ? "consultation" : "inspection"}: ${fmtDay(next.start)} at ${fmtTime(next.start)}.` : `Nothing ${spa ? "booked" : "scheduled"} yet.`;
  return `${tenant.name}, today: ${parts.join(", ")}. ${todo.length ? `To do: ${todo.join("; ")}.` : "Nothing waiting on you."} ${nextLine}`;
}

export default function DailySummary(props) {
  const [copied, setCopied] = useState(false);
  const text = summarise(props);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the text is still on screen */
    }
  };
  return (
    <section className="rounded-lg bg-secondary p-5" aria-label="Daily summary">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[16px] leading-relaxed">{text}</p>
        <button type="button" onClick={copy} className="fd-btn-outline h-9 shrink-0 px-3 text-[13px]" aria-label="Copy summary">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
