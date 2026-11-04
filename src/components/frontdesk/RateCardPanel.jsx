import { useEffect, useState } from "react";
import { Check, Plus, Receipt, RotateCcw, Trash2 } from "lucide-react";
import Panel from "@/components/frontdesk/Panel";
import { updateTenant } from "@/lib/store";
import { publishDesk } from "@/lib/cloud";
import { perSqFt } from "@/lib/rateCard";
import { isMenu } from "@/config/trades";

const num = (v) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const field = "h-9 w-[84px] rounded-lg border border-border bg-secondary px-2 text-right text-[14px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ios-blue)/0.45)]";
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

// The owner's rate card: what Aura quotes from. Roofing: material per m² (shown per sq ft too), labour per
// hour, minimum hours and prices by job. Menu trades: the published service menu. Changes apply to new quotes.
export default function RateCardPanel({ tenant, className = "", delay = 0 }) {
  const menu = isMenu(tenant.trade);
  const fresh = () => ({ rateCard: tenant.rateCard ? structuredClone(tenant.rateCard) : null, services: structuredClone(tenant.services || []) });
  const [draft, setDraft] = useState(fresh);
  const [saved, setSaved] = useState(null);
  // A different business picked in the header, or a change from another tab: start from what is stored.
  useEffect(() => setDraft(fresh()), [tenant.id, tenant.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(draft) !== JSON.stringify(fresh());
  const rc = draft.rateCard;
  const source = tenant.rateCard?.source === "owner" ? `Edited by you ${when(tenant.rateCard.editedAt)}` : tenant.rateCard?.source === "website" || (menu && tenant.setup) ? "Read from your website" : tenant.rateCard?.fromTemplate ? "Demo rates: set your own" : "Your published rates";

  const setRc = (fn) => setDraft((d) => ({ ...d, rateCard: fn(structuredClone(d.rateCard)) }));
  const setSvc = (i, k, v) => setDraft((d) => ({ ...d, services: d.services.map((s, j) => (j === i ? { ...s, [k]: k === "name" ? v : num(v) } : s)) }));

  const save = async () => {
    const services = draft.services.filter((s) => s.name?.trim()).map((s) => ({ ...s, name: s.name.trim(), priceHigh: Math.max(s.priceHigh ?? 0, s.priceLow ?? 0) }));
    const patch = { services };
    if (draft.rateCard) patch.rateCard = { ...draft.rateCard, source: "owner", fromTemplate: false, placeholder: false, editedAt: new Date().toISOString() };
    if (draft.rateCard) patch.setup = tenant.setup ? { ...tenant.setup, needs: (tenant.setup.needs || []).filter((n) => !/rate card|labour rate/.test(n)) } : tenant.setup;
    updateTenant(tenant.id, patch);
    setSaved("Saved. New quotes use these rates.");
    if (tenant.cloud) {
      const res = await publishDesk({ ...tenant, ...patch });
      setSaved(res?.ok ? "Saved and published. New quotes use these rates on every device." : "Saved here. Publishing failed, so other devices still see the old rates.");
    }
    setTimeout(() => setSaved(null), 4000);
  };

  return (
    <Panel
      title="Rate card"
      icon={Receipt}
      tint="var(--ios-green)"
      delay={delay}
      meta={`${source} · Aura quotes from these`}
      className={className}
      label="Rate card"
      action={
        <>
          {dirty && (
            <button type="button" onClick={() => setDraft(fresh())} className="fd-btn-sm inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" aria-label="Undo changes">
              <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Undo</span>
            </button>
          )}
          <button type="button" onClick={save} disabled={!dirty} className="fd-btn-primary fd-btn-sm" data-testid="rates-save">
            <Check className="h-4 w-4" /> Save
          </button>
        </>
      }
    >
      <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-border">
        {rc && (
          <div className="px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Materials, supplied and fitted</p>
            <ul className="mt-1 divide-y divide-border">
              {Object.entries(rc.materials || {}).map(([m, v]) => (
                <li key={m} className="flex items-center gap-2 py-2 text-[15px]">
                  <span className="min-w-0 flex-1 truncate capitalize">{m}</span>
                  <span className="text-muted-foreground">$</span>
                  <input aria-label={`${m}, dollars per square metre`} inputMode="decimal" value={v} onChange={(e) => setRc((r) => ((r.materials[m] = num(e.target.value)), r))} className={field} />
                  <span className="w-9 text-[13px] text-muted-foreground">/m²</span>
                  <span className="hidden w-[92px] text-right text-[13px] tabular-nums text-muted-foreground sm:inline">${perSqFt(v).toFixed(2)}/sq ft</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-3 gap-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
              <label className="grid gap-1">Labour $/hour<input aria-label="Labour, dollars per hour" inputMode="decimal" value={rc.labourPerHour} onChange={(e) => setRc((r) => ((r.labourPerHour = num(e.target.value)), r))} className={`${field} w-full`} /></label>
              <label className="grid gap-1">Hours per m²<input aria-label="Labour hours per square metre" inputMode="decimal" value={rc.hoursPerM2} onChange={(e) => setRc((r) => ((r.hoursPerM2 = num(e.target.value)), r))} className={`${field} w-full`} /></label>
              <label className="grid gap-1">Minimum hours<input aria-label="Minimum labour hours" inputMode="decimal" value={rc.minimumHours} onChange={(e) => setRc((r) => ((r.minimumHours = num(e.target.value)), r))} className={`${field} w-full`} /></label>
            </div>
          </div>
        )}
        <div className={`px-4 py-3 ${rc ? "" : "md:col-span-2"}`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{menu ? "Published menu" : "Prices by job"}</p>
          <ul className="mt-1 divide-y divide-border">
            {draft.services.map((s, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-[15px]">
                <input aria-label={`Service ${i + 1} name`} value={s.name} onChange={(e) => setSvc(i, "name", e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-[15px] outline-none hover:border-border focus:border-border" />
                <span className="text-muted-foreground">$</span>
                <input aria-label={`${s.name || "Service"} low price`} inputMode="decimal" value={s.priceLow ?? ""} onChange={(e) => setSvc(i, "priceLow", e.target.value)} className={field} />
                <span className="text-muted-foreground">–</span>
                <input aria-label={`${s.name || "Service"} high price`} inputMode="decimal" value={s.priceHigh ?? ""} onChange={(e) => setSvc(i, "priceHigh", e.target.value)} className={field} />
                <button type="button" onClick={() => setDraft((d) => ({ ...d, services: d.services.filter((_, j) => j !== i) }))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Remove ${s.name || "service"}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setDraft((d) => ({ ...d, services: [...d.services, { id: `svc-${Date.now().toString(36)}`, name: "", priceLow: 0, priceHigh: 0, concerns: [] }] }))} className="fd-btn-sm mt-2 inline-flex items-center gap-1.5 text-[hsl(var(--ios-blue))]">
            <Plus className="h-4 w-4" /> Add a {menu ? "service" : "job price"}
          </button>
        </div>
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[13px] text-muted-foreground" aria-live="polite">
        {saved || (rc ? "Draft quote = area × material rate + labour hours × labour rate, shown as a ±20% range. Saved changes apply to new quotes." : "The desk only quotes prices on this menu. Saved changes apply to new quotes.")}
      </p>
    </Panel>
  );
}
