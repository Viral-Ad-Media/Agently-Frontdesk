import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { setInsurance } from "@/lib/store";
import { stormForCase } from "@/lib/storm";

const STORM_WORDS = /\b(storm|hail|wind|gust|hurricane|tornado|tree (?:fell|came down)|blew|blown)\b/i;

// Roofing, after the assessment, when the damage looks storm-related: offer to add the insurance details to
// the claim pack. Optional, and the desk never says whether a claim will be paid.
export function wantsInsurance(c, tenant, stormRuns = []) {
  if (tenant?.trade !== "roofing" || !c?.assessment) return false;
  return !!c.insurance || !!stormForCase(c, stormRuns) || STORM_WORDS.test(`${c.description || ""} ${c.assessment?.failedPart || ""}`);
}

export default function InsuranceCard({ c }) {
  const [carrier, setCarrier] = useState("");
  const [claim, setClaim] = useState("");
  const [date, setDate] = useState("");
  const ins = c.insurance;

  if (ins) {
    return (
      <div className="fd-card flex items-start gap-3 p-4 text-[14px]" data-testid="insurance-summary">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <p>
          {ins.claiming
            ? `Added to your claim pack: ${ins.carrier}${ins.claimNumber ? `, claim ${ins.claimNumber}` : ""}${ins.stormDate ? `, storm on ${ins.stormDate}` : ""}. The roofer brings it to the inspection.`
            : "No insurance claim noted. You can still ask the roofer about one at the inspection."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="fd-card space-y-3 p-4"
      data-testid="insurance-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!carrier.trim()) return;
        setInsurance(c.id, { claiming: true, carrier: carrier.trim(), claimNumber: claim.trim() || null, stormDate: date || null });
      }}
    >
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <FileText className="h-4 w-4 text-primary" strokeWidth={1.75} /> Is this storm damage you'll claim on insurance?
      </p>
      <p className="text-[13px] text-muted-foreground">Optional. We add these to your claim pack so the roofer has them before the inspection. We can't say what your insurer will decide.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-[13px]">
          <span className="text-muted-foreground">Insurance company</span>
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-secondary px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
        </label>
        <label className="block text-[13px]">
          <span className="text-muted-foreground">Claim number (if you have one)</span>
          <input value={claim} onChange={(e) => setClaim(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-secondary px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
        </label>
        <label className="block text-[13px]">
          <span className="text-muted-foreground">Date of the storm</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-secondary px-3 text-[14px] outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!carrier.trim()} className="fd-btn-primary fd-btn-sm">Add to my claim pack</button>
        <button type="button" onClick={() => setInsurance(c.id, { claiming: false })} className="fd-btn-outline fd-btn-sm">Not claiming</button>
      </div>
    </form>
  );
}
