import { useState } from "react";
import { Download, FileImage, Loader2 } from "lucide-react";
import { gateway } from "@/gateway";
import { updateCase } from "@/lib/store";

// Renders the branded report through the gateway once, stores it on the case, and offers it as a download.
export default function ReportButton({ c, tenant, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!c?.photo || !c.assessment) return null;

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await gateway.renderReportVisual({ photoDataUrl: c.photo.dataUrl, segmentation: c.segmentation, assessment: c.assessment, quote: c.quote, tenant });
      updateCase(c.id, { report: { imageDataUrl: r.imageDataUrl, provider: r.providerLabel, at: new Date().toISOString() } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (c.report) {
    return (
      <a href={c.report.imageDataUrl} download={`${tenant.name.replace(/\s+/g, "-").toLowerCase()}-report.${(c.report.imageDataUrl.match(/^data:image\/(\w+)/) || [])[1] || "jpg"}`} className={`fd-btn-outline ${className}`}>
        <Download className="h-4 w-4" /> Download report
      </a>
    );
  }
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button type="button" onClick={make} disabled={busy} className="fd-btn-outline">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
        {busy ? "Preparing report…" : tenant.trade === "medspa" ? "Prepare consultation notes" : "Prepare damage report"}
      </button>
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </span>
  );
}
