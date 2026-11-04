// Home Screen manifest for the phone alerts page. On iPhone a Home Screen app keeps its own storage, so it has to
// open on the same private alerts link (desk + owner key) that was added, or it can't turn alerts on.
const DESK = /^[a-z0-9.-]{1,120}$/;
const KEY = /^[A-Za-z0-9_-]{8,80}$/;

export function alertsManifest(query = {}) {
  const desk = String(query.desk || "").toLowerCase();
  const key = String(query.key || "");
  const start = DESK.test(desk) && KEY.test(key) ? `/alerts?desk=${encodeURIComponent(desk)}&key=${encodeURIComponent(key)}` : "/frontdesk";
  return {
    name: "Agently Front Desk",
    short_name: "Front Desk",
    description: "Lead alerts for your front desk: new leads, photo estimates waiting for approval and bookings.",
    start_url: start,
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

export default function handler(req, res) {
  res.setHeader("content-type", "application/manifest+json");
  res.setHeader("cache-control", "no-store");
  res.status(200).send(JSON.stringify(alertsManifest(req.query || {})));
}
